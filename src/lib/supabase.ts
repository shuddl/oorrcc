// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Database } from '../types/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retry';

interface StorageProvider {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface ConnectionState {
  status: 'connected' | 'disconnected' | 'connecting';
  lastConnected: Date | null;
  retryCount: number;
  error: Error | null;
}

interface OfflineOperation {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  error?: Error;
}

interface SupabaseConfig {
  maxRetryAttempts?: number;
  retryDelay?: number;
  maxBatchSize?: number;
  syncInterval?: number;
  storageKey?: string;
  realtime?: {
    eventsPerSecond?: number;
    maxSubscriptions?: number;
  };
}

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<Database>;
  private connectionState: ConnectionState = {
    status: 'disconnected',
    lastConnected: null,
    retryCount: 0,
    error: null
  };
  private readonly config: Required<SupabaseConfig>;
  private activeSubscriptions = new Map<string, () => void>();
  private offlineQueue: OfflineOperation[] = [];
  private syncInterval: NodeJS.Timer | null = null;
  private healthCheckInterval: NodeJS.Timer | null = null;
  private readonly storage: StorageProvider;

  private constructor(config: SupabaseConfig = {}) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.config = {
      maxRetryAttempts: config.maxRetryAttempts || 5,
      retryDelay: config.retryDelay || 1000,
      maxBatchSize: config.maxBatchSize || 100,
      syncInterval: config.syncInterval || 5000,
      storageKey: config.storageKey || 'supabase.auth.token',
      realtime: {
        eventsPerSecond: config.realtime?.eventsPerSecond || 10,
        maxSubscriptions: config.realtime?.maxSubscriptions || 50
      }
    };

    this.storage = this.initializeStorage();
    this.client = this.initializeClient(supabaseUrl, supabaseAnonKey);

    this.setupAuthListeners();
    this.setupConnectionManagement();
    this.startSyncInterval();
    this.startHealthCheck();
    this.loadOfflineQueue();
  }

  static getInstance(config?: SupabaseConfig): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService(config);
    }
    return SupabaseService.instance;
  }

  private initializeStorage(): StorageProvider {
    if (typeof window === 'undefined') {
      // SSR or Node environment fallback
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      };
    }

    return {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          logger.error('Storage access error', { error });
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          logger.error('Storage write error', { error });
          this.handleStorageError(error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          logger.error('Storage remove error', { error });
        }
      }
    };
  }

  private initializeClient(url: string, key: string): SupabaseClient<Database> {
    return createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: this.storage,
        storageKey: this.config.storageKey,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: this.config.realtime.eventsPerSecond
        }
      }
    });
  }

  private setupAuthListeners() {
    this.client.auth.onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event });

      switch (event) {
        case 'SIGNED_IN':
          await this.handleSignIn(session);
          break;
        case 'SIGNED_OUT':
          await this.handleSignOut();
          break;
        case 'TOKEN_REFRESHED':
          await this.handleTokenRefresh(session);
          break;
        case 'USER_UPDATED':
          // handle user updates if needed
          break;
        case 'USER_DELETED':
          // handle user deletion if needed
          break;
        default:
          // log or handle other events
          break;
      }
    });
  }

  private setupConnectionManagement() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private startSyncInterval() {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(async () => {
      if (this.connectionState.status === 'connected' && this.offlineQueue.length > 0) {
        await this.syncOfflineQueue();
      }
    }, this.config.syncInterval);
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(async () => {
      if (this.connectionState.status === 'connected') {
        try {
          const healthy = await this.healthCheck();
          if (!healthy) {
            await this.handleNetworkError();
          }
        } catch (error) {
          logger.error('Health check error', { error });
        }
      }
    }, 30000); // every 30s
  }

  private async handleSignIn(session: any) {
    if (session?.access_token && session.user) {
      useAuth.getState().setAuth(session.user, session.access_token);
      api.defaults.headers.Authorization = `Bearer ${session.access_token}`;
    }
    this.connectionState.status = 'connected';
    this.connectionState.lastConnected = new Date();
    try {
      // Additional user data init if needed
      await this.syncOfflineQueue();
      toast.success('Signed in successfully!');
    } catch (error) {
      logger.error('Sign-in initialization failed', { error });
    }
  }

  private async handleSignOut() {
    useAuth.getState().clearAuth();
    delete api.defaults.headers.Authorization;
    try {
      this.clearLocalData();
      this.unsubscribeAll();
      toast.success('Signed out successfully!');
    } catch (error) {
      logger.error('Sign out handler failed', { error });
    }
  }

  private async handleTokenRefresh(session: any) {
    if (session?.access_token) {
      useAuth.getState().setAuth(session.user, session.access_token);
      api.defaults.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  private handleOnline() {
    this.connectionState.status = 'connecting';
    void this.attemptReconnection();
  }

  private handleOffline() {
    this.connectionState.status = 'disconnected';
    toast.warning('You are offline; changes will sync on reconnection.');
  }

  private async attemptReconnection() {
    if (this.connectionState.status === 'connected' || this.connectionState.retryCount >= this.config.maxRetryAttempts) {
      return;
    }

    try {
      this.connectionState.retryCount++;
      const healthy = await this.healthCheck();
      if (!healthy) throw new Error('Health check failed');

      this.connectionState.status = 'connected';
      this.connectionState.lastConnected = new Date();
      this.connectionState.retryCount = 0;
      toast.success('Connection restored');
      await this.syncOfflineQueue();
    } catch (error) {
      this.connectionState.error = error as Error;
      if (this.connectionState.retryCount < this.config.maxRetryAttempts) {
        setTimeout(() => this.attemptReconnection(), this.config.retryDelay * Math.pow(2, this.connectionState.retryCount));
      } else {
        toast.error('Reconnection failed after maximum attempts');
      }
    }
  }

  private async syncOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    const batches = this.batchOfflineQueue();
    for (const batch of batches) {
      try {
        await this.processBatch(batch);
        this.offlineQueue = this.offlineQueue.filter(op => !batch.includes(op));
        this.saveOfflineQueue();
      } catch (error) {
        logger.error('Failed to process offline batch', { error, batch });
        // Possibly keep them in queue for next attempt
      }
    }
  }

  private batchOfflineQueue(): OfflineOperation[][] {
    const result: OfflineOperation[][] = [];
    for (const op of this.offlineQueue) {
      const lastBatch = result[result.length - 1];
      if (!lastBatch || lastBatch.length >= this.config.maxBatchSize) {
        result.push([op]);
      } else {
        lastBatch.push(op);
      }
    }
    return result;
  }

  private async processBatch(batch: OfflineOperation[]) {
    const tasks = batch.map(op => {
      switch (op.operation) {
        case 'insert':
          return this.client.from(op.table).insert(op.data);
        case 'update':
          return this.client.from(op.table).update(op.data);
        case 'delete':
          return this.client.from(op.table).delete().match(op.data);
        default:
          return null;
      }
    }).filter(Boolean);

    await Promise.all(tasks);
  }

  private loadOfflineQueue() {
    const saved = this.storage.getItem('offlineQueue');
    if (saved) {
      try {
        this.offlineQueue = JSON.parse(saved);
      } catch (error) {
        logger.error('Offline queue parse error', { error });
      }
    }
  }

  private saveOfflineQueue() {
    try {
      this.storage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      logger.error('Saving offline queue error', { error });
    }
  }

  private async handleNetworkError() {
    this.connectionState.status = 'disconnected';
    toast.error('Network error. Check your connection.');
    await this.attemptReconnection();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // If you prefer checking 'health_check' table:
      const { data, error } = await this.client
        .from('health_check')
        .select('*')
        .limit(1);
      return !error;
    } catch (error) {
      logger.error('Health check error', { error });
      return false;
    }
  }

  public subscribe<T = any>(
    channel: string,
    event: string,
    callback: (payload: T) => void
  ): () => void {
    if (this.activeSubscriptions.size >= this.config.realtime.maxSubscriptions) {
      throw new Error('Max subscription limit reached');
    }

    const subscription = this.client.channel(channel)
      .on('broadcast', { event }, callback)
      .subscribe();

    const unsubscribe = () => {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(channel);
    };

    this.activeSubscriptions.set(channel, unsubscribe);
    return unsubscribe;
  }

  public unsubscribeAll() {
    this.activeSubscriptions.forEach(unsub => unsub());
    this.activeSubscriptions.clear();
  }

  public executeWithRetry<T>(
    operation: () => Promise<T>,
    options: { maxAttempts?: number; initialDelay?: number } = {}
  ): Promise<T> {
    return retryOperation(operation, {
      maxAttempts: options.maxAttempts || this.config.maxRetryAttempts,
      initialDelay: options.initialDelay || this.config.retryDelay,
      shouldRetry: (error) => {
        const msg = (error?.message || '').toLowerCase();
        return msg.includes('network') || msg.includes('timeout') || msg.includes('rate limit');
      }
    });
  }

  public queueOfflineOperation(table: string, operation: 'insert' | 'update' | 'delete', data: any) {
    const offlineOp: OfflineOperation = {
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };
    this.offlineQueue.push(offlineOp);
    this.saveOfflineQueue();
    logger.debug('Operation queued offline', { operation, table });
  }

  private handleStorageError(error: any) {
    if (error.name === 'QuotaExceededError') {
      toast.error('Local storage full, clearing data');
      this.clearLocalData();
    }
  }

  private clearLocalData() {
    this.storage.removeItem(this.config.storageKey);
    this.storage.removeItem('offlineQueue');
  }

  public destroy() {
    this.unsubscribeAll();
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
  }

  // Diagnostics
  public get supabase() {
    return this.client;
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public getMetrics() {
    return {
      connectionState: this.connectionState,
      offlineQueueSize: this.offlineQueue.length,
      activeSubscriptions: this.activeSubscriptions.size,
      lastSync: this.connectionState.lastConnected
    };
  }
}
  maxBatchSize: 100,

export const supabaseService = SupabaseService.getInstance({
  maxRetryAttempts: 5,
  retryDelay: 1000,
  maxBatchSize: 100,
  syncInterval: 5000,
  realtime: {
    eventsPerSecond: 10,
    maxSubscriptions: 50
  }
});

export const supabase = supabaseService.supabase;
  syncInterval: 5000,
  realtime: {
    eventsPerSecond: 10,
    maxSubscriptions: 50
  }
});

export const supabase = supabaseService.supabase;