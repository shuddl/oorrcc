import { EventEmitter } from '../lib/events';
import { AIOrchestrator } from './AIOrchestrator';
import { RequirementsOrchestrator } from './RequirementsOrchestrator';
import { PerformanceMonitor } from './PerformanceMonitor';
import { SecurityScanner } from './SecurityScanner';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface ServiceConfig {
  enableRealtime?: boolean;
  enableOfflineSupport?: boolean;
  enableAnalytics?: boolean;
}

export class ServiceRegistry extends EventEmitter {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();
  private subscriptions: Map<string, () => void> = new Map();
  private offlineQueue: Array<{
    service: string;
    method: string;
    args: any[];
  }> = [];

  private constructor(private config: ServiceConfig = {}) {
    super();
    this.initializeServices();
    this.setupEventHandlers();
  }

  static getInstance(config?: ServiceConfig): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(config);
    }
    return ServiceRegistry.instance;
  }

  private initializeServices() {
    // Initialize service bus and integrator
    const serviceBus = ServiceBus.getInstance();
    const serviceIntegrator = new ServiceIntegrator();

    // Register core services
    this.registerService('serviceBus', serviceBus);
    this.registerService('integrator', serviceIntegrator);
    
    // Core services
    this.registerService('ai', new AIOrchestrator());
    this.registerService('requirements', new RequirementsOrchestrator());
    this.registerService('security', new SecurityScanner());
    this.registerService('pipeline', new PipelineOrchestrator());
    
    // Analysis services
    this.registerService('analysis', {
      dependency: new DependencyAnalyzer(),
      complexity: new ComplexityAnalyzer(),
      security: new SecurityAnalyzer(),
      pattern: new PatternDetector()
    });

    // Performance monitoring
    this.registerService('performance', new PerformanceMonitor());

    // Cache management
    this.registerService('cache', new CacheManager());

    // Setup real-time sync if enabled
    if (this.config.enableRealtime) {
      this.setupRealtimeSync();
    }

    // Setup offline support if enabled
    if (this.config.enableOfflineSupport) {
      this.setupOfflineSupport();
    }

    // Setup analytics if enabled
    if (this.config.enableAnalytics) {
      this.setupAnalytics();
    }

    // Setup integrations
    this.setupServiceIntegrations();
  }

  private setupEventHandlers() {
    // Handle service events
    this.on('serviceError', this.handleServiceError.bind(this));
    this.on('stateChange', this.handleStateChange.bind(this));
    
    // Handle connection changes
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private setupRealtimeSync() {
    const channel = supabase.channel('service_sync');
    
    channel
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        this.handleRemoteStateChange(payload);
      })
      .subscribe();

    this.subscriptions.set('realtime', () => channel.unsubscribe());
  }

  private setupOfflineSupport() {
    // Check if we're in WebContainer
    if (typeof window !== 'undefined' && !window.location.hostname.includes('stackblitz')) {
      // Only try to register service worker outside WebContainer
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then(registration => {
            logger.info('Service Worker registered', { scope: registration.scope });
          })
          .catch(error => {
            logger.warn('Service Worker registration skipped', { 
              reason: 'WebContainer environment detected'
            });
          });
      }
    }
  }

  private setupAnalytics() {
    // Track performance metrics
    const performanceMonitor = this.getService<PerformanceMonitor>('performance');
    performanceMonitor.startTracking();

    // Track service usage
    this.on('serviceCall', ({ service, method, duration }) => {
      this.recordMetric('serviceUsage', {
        service,
        method,
        duration
      });
    });
  }

  private async handleRemoteStateChange(payload: any) {
    try {
      const { service, state } = payload;
      const serviceInstance = this.getService(service);
      
      if (serviceInstance && serviceInstance.syncState) {
        await serviceInstance.syncState(state);
        this.emit('stateSynced', { service, state });
      }
    } catch (error) {
      logger.error('Failed to handle remote state change', { error });
      this.emit('syncError', error);
    }
  }

  private async handleServiceError(error: Error) {
    logger.error('Service error occurred', { error });
    
    // Attempt recovery
    try {
      await this.recoverFromError(error);
    } catch (recoveryError) {
      logger.error('Error recovery failed', { error: recoveryError });
      this.emit('recoveryFailed', { originalError: error, recoveryError });
    }
  }

  private async handleStateChange({ service, state }: any) {
    if (this.config.enableRealtime) {
      try {
        await supabase.channel('service_sync').send({
          type: 'broadcast',
          event: 'state_change',
          payload: { service, state }
        });
      } catch (error) {
        logger.error('Failed to broadcast state change', { error });
      }
    }
  }

  private async handleOnline() {
    logger.info('Connection restored');
    
    // Process offline queue
    while (this.offlineQueue.length > 0) {
      const request = this.offlineQueue.shift();
      if (request) {
        try {
          const service = this.getService(request.service);
          await service[request.method](...request.args);
        } catch (error) {
          logger.error('Failed to process offline request', { error });
        }
      }
    }
  }

  private handleOffline() {
    logger.warn('Connection lost - entering offline mode');
  }

  private async recoverFromError(error: Error): Promise<void> {
    // Implement recovery strategies based on error type
    if (error instanceof Error) {
      switch (error.name) {
        case 'AuthError':
          await this.recoverAuth();
          break;
        case 'SyncError':
          await this.recoverSync();
          break;
        case 'ServiceError':
          await this.recoverService();
          break;
        default:
          throw new Error('Unrecoverable error');
      }
    }
  }

  private async recoverAuth() {
    // Implement auth recovery
  }

  private async recoverSync() {
    // Implement sync recovery
  }

  private async recoverService() {
    // Implement service recovery
  }

  registerService(name: string, service: any) {
    this.services.set(name, service);
    
    // Setup error handling for service
    if (service instanceof EventEmitter) {
      service.on('error', (error: Error) => {
        this.emit('serviceError', { service: name, error });
      });
    }
  }

  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }

  async callService<T>(
    service: string,
    method: string,
    ...args: any[]
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const serviceInstance = this.getService(service);
      if (!serviceInstance[method]) {
        throw new Error(`Method ${method} not found on service ${service}`);
      }

      // Handle offline case
      if (!navigator.onLine && this.config.enableOfflineSupport) {
        this.offlineQueue.push({ service, method, args });
        throw new Error('Operation queued for offline processing');
      }

      const result = await serviceInstance[method](...args);
      
      // Record metrics
      const duration = performance.now() - startTime;
      this.emit('serviceCall', { service, method, duration });
      
      return result;
    } catch (error) {
      this.emit('serviceError', { service, method, error });
      throw error;
    }
  }

  private recordMetric(name: string, data: any) {
    // Implement metric recording
  }

  async cleanup(): Promise<void> {
    // Cleanup services
    for (const [name, service] of this.services.entries()) {
      if (service.cleanup) {
        await service.cleanup();
      }
    }

    // Clear subscriptions
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }

    // Clear event listeners
    this.removeAllListeners();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private setupServiceIntegrations() {
    const serviceBus = this.getService<ServiceBus>('serviceBus');
    
    // Listen for global events
    serviceBus.subscribe('*', '*', (message) => {
      this.emit('serviceEvent', message);
    });

    // Handle service errors
    serviceBus.subscribe('*', 'ERROR', (message) => {
      this.handleServiceError(new Error(message.payload.error));
    });
  }
}