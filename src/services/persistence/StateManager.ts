import { logger } from '../../utils/logger';
import { supabase } from '../../lib/supabase';
import type { 
  RequirementCategory,
  RequirementResponse,
  RequirementSummary 
} from '../../types/requirements.types';

interface SessionState {
  id: string;
  description: string;
  categories: RequirementCategory[];
  responses: RequirementResponse[];
  currentQuestion: string | null;
  summary?: RequirementSummary[];
  lastUpdated: number;
}

export class StateManager {
  private localState: Map<string, SessionState> = new Map();
  private syncInProgress = false;
  private syncQueue: Array<{ state: SessionState; retries: number }> = [];
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  async saveState(state: SessionState): Promise<void> {
    try {
      if (!this.validateState(state)) {
        throw new Error('Invalid state structure');
      }

      this.localState.set(state.id, {
        ...state,
        lastUpdated: Date.now()
      });

      await this.saveToIndexedDB(state);
      this.queueSync(state);

      logger.info('State saved successfully', { sessionId: state.id });
    } catch (error) {
      logger.error('Failed to save state', { error, state });
      throw new Error('Failed to save state: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private queueSync(state: SessionState) {
    this.syncQueue.push({ state, retries: 0 });
    if (!this.syncInProgress) {
      void this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (this.syncInProgress || this.syncQueue.length === 0) return;

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue[0];
        
        try {
          const { data: existing, error } = await supabase
            .from('requirement_sessions')
            .select('updated_at, state')
            .eq('id', item.state.id)
            .single();

          if (error) throw error;

          if (existing) {
            const existingTimestamp = new Date(existing.updated_at).getTime();
            const itemTimestamp = item.state.lastUpdated;

            if (existingTimestamp > itemTimestamp) {
              const mergedState = this.mergeStates(existing.state, item.state);
              item.state = mergedState;
            }
          }

          const formattedState = {
            categories: item.state.categories || [],
            responses: item.state.responses || [],
            currentQuestion: item.state.currentQuestion || null,
            summary: item.state.summary || null
          };

          const { error: updateError } = await supabase
            .from('requirement_sessions')
            .upsert({
              id: item.state.id,
              description: item.state.description || '',
              state: formattedState,
              last_synced: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (updateError) throw updateError;

          this.syncQueue.shift();
          logger.info('State synced with Supabase', { sessionId: item.state.id });
        } catch (error) {
          logger.error('Sync failed', { error, retries: item.retries });
          
          if (item.retries < this.MAX_RETRIES) {
            this.syncQueue.shift();
            this.syncQueue.push({
              state: item.state,
              retries: item.retries + 1
            });
            
            await new Promise(resolve => 
              setTimeout(resolve, this.RETRY_DELAY * (item.retries + 1))
            );
          } else {
            this.syncQueue.shift();
            logger.error('Max retries reached for sync', {
              sessionId: item.state.id
            });
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async saveToIndexedDB(state: SessionState): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('requirements-db', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');

        const saveRequest = store.put({
          id: state.id,
          state: this.serializeState(state),
          lastUpdated: Date.now()
        });

        saveRequest.onsuccess = () => resolve();
        saveRequest.onerror = () => reject(new Error('Failed to save to IndexedDB'));

        tx.oncomplete = () => db.close();
      };
    });
  }

  private validateState(state: SessionState): boolean {
    if (!state || typeof state !== 'object') {
      logger.error('Invalid state object');
      return false;
    }

    if (!state.id || typeof state.id !== 'string') {
      logger.error('Invalid or missing state ID');
      return false;
    }

    if (!Array.isArray(state.categories)) {
      state.categories = [];
    }

    if (!Array.isArray(state.responses)) {
      state.responses = [];
    }

    for (const category of state.categories) {
      if (!category.id || !category.name || !Array.isArray(category.questions)) {
        logger.error('Invalid category structure', { category });
        return false;
      }

      for (const question of category.questions) {
        if (!question.id || !question.question || !question.type) {
          logger.error('Invalid question structure', { question });
          return false;
        }
      }
    }

    for (const response of state.responses) {
      if (!response.id || !response.questionId || response.answer === undefined) {
        logger.error('Invalid response structure', { response });
        return false;
      }
    }

    return true;
  }

  private serializeState(state: SessionState): string {
    return JSON.stringify(state, (key, value) => {
      if (value instanceof Map) {
        return {
          dataType: 'Map',
          value: Array.from(value.entries())
        };
      }
      if (value instanceof Set) {
        return {
          dataType: 'Set',
          value: Array.from(value)
        };
      }
      return value;
    });
  }

  private deserializeState(serialized: string): SessionState {
    return JSON.parse(serialized, (key, value) => {
      if (value?.dataType === 'Map') {
        return new Map(value.value);
      }
      if (value?.dataType === 'Set') {
        return new Set(value.value);
      }
      return value;
    });
  }

  private mergeStates(serverState: any, localState: any): any {
    const mergedState = {
      ...serverState,
      responses: [...serverState.responses]
    };

    localState.responses.forEach((localResponse: any) => {
      const existingIndex = mergedState.responses.findIndex(
        (r: any) => r.id === localResponse.id
      );

      if (existingIndex === -1) {
        mergedState.responses.push(localResponse);
      } else {
        const existingResponse = mergedState.responses[existingIndex];
        if (localResponse.timestamp > existingResponse.timestamp) {
          mergedState.responses[existingIndex] = localResponse;
        }
      }
    });

    mergedState.responses.sort((a: any, b: any) => a.timestamp - b.timestamp);

    return mergedState;
  }

  async deleteState(sessionId: string): Promise<void> {
    try {
      this.localState.delete(sessionId);
      
      // Delete from IndexedDB
      const db = await this.openIndexedDB();
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      store.delete(sessionId);
      await tx.complete;
      db.close();

      // Delete from Supabase
      const { error } = await supabase
        .from('requirement_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;

      logger.info('State deleted successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to delete state', { error, sessionId });
      throw new Error('Failed to delete state: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('requirements-db', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }
}