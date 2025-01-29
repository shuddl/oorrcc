import { logger } from '../../utils/logger';
import { CachedAnalysis, AnalysisResult, AnalysisContext } from '../../types/analysis';

export class CacheManager {
  private cache: Map<string, CachedAnalysis>;
  private readonly DEFAULT_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  constructor(cacheDuration?: number) {
    this.cache = new Map();
    this.DEFAULT_CACHE_DURATION = cacheDuration || this.DEFAULT_CACHE_DURATION;
  }

  public get(key: string): AnalysisResult | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (this.isExpired(cached)) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  public set(
    key: string, 
    result: AnalysisResult, 
    duration?: number
  ): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + (duration || this.DEFAULT_CACHE_DURATION);

    this.cache.set(key, {
      result,
      timestamp,
      expiresAt
    });

    // Log cache update
    logger.debug('Cache updated', { 
      key, 
      timestamp, 
      expiresAt 
    });
  }

  public generateKey(code: string, context: AnalysisContext): string {
    // Create a unique key based on code and context
    const contextHash = this.hashObject(context);
    const codeHash = this.hashString(code.slice(0, 100)); // First 100 chars for performance
    return `${codeHash}_${contextHash}`;
  }

  public clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  public cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (this.isExpired(value)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', { cleanedCount });
    }
  }

  private isExpired(cached: CachedAnalysis): boolean {
    return Date.now() > cached.expiresAt;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    return this.hashString(str);
  }

  public getCacheStats(): {
    size: number;
    averageAge: number;
    hitRate: number;
  } {
    const now = Date.now();
    let totalAge = 0;
    let validEntries = 0;

    this.cache.forEach(entry => {
      if (!this.isExpired(entry)) {
        totalAge += now - entry.timestamp;
        validEntries++;
      }
    });

    return {
      size: this.cache.size,
      averageAge: validEntries ? totalAge / validEntries : 0,
      hitRate: this.hitRate
    };
  }

  private hitRate = 0;
  private totalRequests = 0;
  private hits = 0;

  public updateHitRate(isHit: boolean): void {
    this.totalRequests++;
    if (isHit) this.hits++;
    this.hitRate = this.hits / this.totalRequests;
  }
}
