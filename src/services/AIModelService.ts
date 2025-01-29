import { logger } from '../utils/logger';
import { OpenAIService } from './OpenAIService';
import { EventEmitter } from '../lib/events';
import { AIError, AIRequestConfig } from '../types/ai.types';
import { SecurityScanner } from './SecurityScanner';
import { RateLimiter } from '../middleware/RateLimiter';

export class AIModelService extends EventEmitter {
  private openai: OpenAIService;
  private securityScanner: SecurityScanner;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  private rateLimiter = new RateLimiter({
    windowMs: 60000,
    max: 50,
    handler: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
  });

  private cache = new Map<string, {
    result: string;
    timestamp: number;
    expiresAt: number;
  }>();

  constructor() {
    super();
    this.openai = new OpenAIService();
    this.securityScanner = new SecurityScanner();

    // Setup periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.CACHE_TTL);
  }

  async generateCompletion(
    prompt: string,
    config: AIRequestConfig = {}
  ): Promise<string> {
    try {
      // Check rate limit
      await this.checkRateLimit();

      // Check cache if not streaming
      if (!config.stream) {
        const cached = this.getCachedResult(prompt);
        if (cached) {
          this.emit('cacheHit', { prompt });
          return cached;
        }
      }

      // Validate and sanitize prompt
      const sanitizedPrompt = await this.validateAndSanitizePrompt(prompt);

      // Generate completion with retry logic
      const response = await this.executeWithRetry(async () => {
        return this.openai.generateCompletion(sanitizedPrompt, {
          ...config,
          maxRetries: this.MAX_RETRIES
        });
      });

      // Cache result if not streaming
      if (!config.stream) {
        this.cacheResult(prompt, response);
      }

      this.emit('completionGenerated', { prompt, response });
      return response;
    } catch (error) {
      this.handleError(error, prompt);
      throw error;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, attempt + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    // Retry on rate limits or network errors
    return (
      attempt < this.MAX_RETRIES &&
      (error.status === 429 || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')
    );
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 200; // Add up to 200ms of random jitter
    return Math.min(baseDelay + jitter, 10000); // Cap at 10 seconds
  }

  private async validateAndSanitizePrompt(prompt: string): Promise<string> {
    if (!prompt?.trim()) {
      throw new AIError('Empty prompt provided');
    }

    // Scan for security issues
    const securityResult = await this.securityScanner.scanCode(prompt);
    if (!securityResult.passed) {
      throw new AIError(
        'Security check failed',
        'SECURITY_VIOLATION',
        { issues: securityResult.issues }
      );
    }

    // Remove sensitive patterns
    return prompt
      .replace(/\b(?:password|secret|token|api[_-]?key)\b/gi, '[REDACTED]')
      .trim();
  }

  private async checkRateLimit(): Promise<void> {
    const mockReq = { ip: '127.0.0.1' } as any;
    const mockRes = { status: () => ({ json: () => {} }) } as any;

    return new Promise((resolve, reject) => {
      this.rateLimiter.middleware(mockReq, mockRes, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private getCachedResult(prompt: string): string | null {
    const cached = this.cache.get(this.generateCacheKey(prompt));
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(this.generateCacheKey(prompt));
      return null;
    }

    return cached.result;
  }

  private cacheResult(prompt: string, result: string): void {
    const key = this.generateCacheKey(prompt);
    
    // Implement LRU-like cache eviction
    if (this.cache.size >= 1000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });
  }

  private generateCacheKey(prompt: string): string {
    return `ai_${prompt.slice(0, 100)}`;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private handleError(error: any, prompt: string): void {
    const aiError = new AIError(
      'AI service error',
      error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      { prompt }
    );

    logger.error('AI service error', {
      error: aiError,
      prompt,
      retryCount: this.retryCount
    });

    this.emit('error', aiError);
  }

  terminate(): void {
    this.cache.clear();
    this.removeAllListeners();
    logger.info('AI model service terminated');
  }
}