// MLModelService.ts
import { logger } from '../utils/logger';
import { EventEmitter } from '../lib/events';
import { AIError, AIRequestConfig } from '../types/ai.types';
import { RateLimiter } from '../middleware/RateLimiter';

/**
 * This class uses a Web Worker for complex ML tasks.
 * We'll do a simple "healthCheck" approach that calls the worker with a 'healthCheck' message.
 */
export class MLModelService extends EventEmitter {
  private worker: Worker;
  private requests = new Map<string, {
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }>();
  private requestCounter = 0;
  private readonly REQUEST_TIMEOUT = 20000; // 20s

  private rateLimiter = new RateLimiter({
    windowMs: 60000,
    max: 50
  });

  constructor() {
    super();
    // Worker script must exist; ensure correct relative path:
    this.worker = new Worker(new URL('../workers/ml.worker.ts', import.meta.url), { type: 'module' });

    this.worker.onmessage = (e: MessageEvent) => {
      const { requestId, result, error } = e.data;
      const pending = this.requests.get(requestId);
      if (!pending) return;

      this.requests.delete(requestId);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    };

    this.worker.onerror = (err) => {
      logger.error('Worker error', { err });
      this.emit('error', new AIError('ML worker error', err.message));
    };

    // Periodically check worker health
    setInterval(() => {
      void this.checkWorkerHealth();
    }, 60000);
  }

  async generateLayoutSuggestions(description: string): Promise<any> {
    // Rate limiting
    await this.checkRateLimit();
    return this.sendWorkerMessage('generateLayout', { description });
  }

  async analyzeAccessibility(code: string): Promise<any> {
    // Rate limiting
    await this.checkRateLimit();
    return this.sendWorkerMessage('analyzeAccessibility', { code });
  }

  private async checkWorkerHealth(): Promise<void> {
    try {
      await this.sendWorkerMessage('healthCheck', {});
      logger.info('Worker health check success');
    } catch (error) {
      logger.error('Worker health check failed', { error });
      // Attempt a worker restart or other fallback if needed
      // ...
    }
  }

  private async checkRateLimit(): Promise<void> {
    const mockReq = { ip: '127.0.0.1' } as any;
    const mockRes = { status: () => ({ json: () => {} }) } as any;
    return new Promise<void>((resolve, reject) => {
      this.rateLimiter.middleware(mockReq, mockRes, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private sendWorkerMessage(type: string, data: any): Promise<any> {
    const requestId = `req_${++this.requestCounter}`;
    this.worker.postMessage({ type, requestId, data });

    return new Promise((resolve, reject) => {
      this.requests.set(requestId, { resolve, reject });

      setTimeout(() => {
        if (this.requests.has(requestId)) {
          this.requests.delete(requestId);
          reject(new Error('Request timeout: no response from ML worker'));
        }
      }, this.REQUEST_TIMEOUT);
    });
  }

  terminate(): void {
    this.worker.terminate();
    for (const [requestId, pending] of this.requests.entries()) {
      pending.reject(new Error('Worker terminated'));
    }
    this.requests.clear();
    this.removeAllListeners();
  }
}