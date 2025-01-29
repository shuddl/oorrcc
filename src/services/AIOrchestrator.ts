import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { OpenAIService } from './OpenAIService';
import { CodeAnalyzer } from './CodeAnalyzer';
import { SecurityScanner } from './SecurityScanner';
import { PerformanceMonitor } from './PerformanceMonitor';
import { AIComponentGenerator } from './AIComponentGenerator';
import { ParallelProcessor } from './ParallelProcessor';
import { supabase } from '../lib/supabase';
import { retryOperation } from '../utils/retry';
import { AIError, ProcessingResult } from '../types/ai.types';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { MemoryManager } from './memory/MemoryManager';
import { ContextManager } from './memory/ContextManager';

interface AIServiceConfig {
  maxConcurrentRequests?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

function getPerf(): Performance {
  if (typeof performance !== 'undefined') {
    return performance;
  }
  const { performance: nodePerf } = require('perf_hooks');
  return nodePerf;
}

export class AIOrchestrator extends EventEmitter {
  private openai: OpenAIService;
  private codeAnalyzer: CodeAnalyzer;
  private securityScanner: SecurityScanner;
  private performanceMonitor: PerformanceMonitor;
  private componentGenerator: AIComponentGenerator;
  private parallelProcessor: ParallelProcessor;
  private metricsCollector: MetricsCollector;
  private memoryManager: MemoryManager;
  private contextManager: ContextManager;

  private requestQueue: Array<{
    id: string;
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeRequests = 0;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private queueInterval: NodeJS.Timer | null = null;
  private metricsInterval: NodeJS.Timer | null = null;
  private isProcessingQueue = false;

  constructor(private config: AIServiceConfig = {}) {
    super();
    this.openai = new OpenAIService();
    this.codeAnalyzer = new CodeAnalyzer();
    this.securityScanner = new SecurityScanner();
    this.performanceMonitor = new PerformanceMonitor();
    this.componentGenerator = new AIComponentGenerator();
    this.parallelProcessor = new ParallelProcessor();
    this.metricsCollector = new MetricsCollector({
      enabled: true,
      metricsInterval: 60000,
      errorThreshold: 0.1
    });
    this.memoryManager = new MemoryManager({
      maxContextSize: 128000,
      chunkSize: 4096,
      overlapSize: 200,
      maxConcurrentChunks: 3
    });
    this.contextManager = new ContextManager();

    // Start queue processing
    this.queueInterval = setInterval(() => this.processQueue(), 100);

    // Start performance monitoring
    this.performanceMonitor.startTracking();

    // Setup error handling
    this.setupErrorHandling();

    // Optionally log metrics every 60s
    this.metricsInterval = setInterval(() => this.logMetrics(), 60000);
  }

  async analyzeAndOptimizeCode(
    code: string,
    options: { useCache?: boolean; timeout?: number } = {}
  ): Promise<ProcessingResult> {
    const cacheKey = this.generateCacheKey('analyze', code);

    if (options.useCache && this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metricsCollector.recordSuccess();
        return cached;
      }
    }

    const memoryRequirement = this.memoryManager.estimateMemoryRequirement(code);
    const memoryAllocated = await this.memoryManager.allocateMemory(cacheKey, memoryRequirement);
    if (!memoryAllocated) {
      throw new AIError('Insufficient memory for operation');
    }

    try {
      return await this.queueOperation(async () => {
        const perf = getPerf();
        const startTime = perf.now();

        // Run analysis in parallel
        const [analysisResult, securityResult, performanceResult] = await Promise.all([
          this.codeAnalyzer.analyzeCode(code),
          this.securityScanner.scanCode(code),
          this.performanceMonitor.collectMetrics()
        ]);

        // Potentially generate optimized version
        let optimizedCode = code;
        if (analysisResult.performance.score < 0.8) {
          optimizedCode = await this.optimizeCode(code, analysisResult);
        }

        const endTime = perf.now();
        const result: ProcessingResult = {
          original: code,
          optimized: optimizedCode,
          analysis: {
            complexity: analysisResult.quality,
            dependencies: analysisResult.dependencies,
            patterns: await this.detectPatterns(code)
          },
          security: securityResult,
          performance: {
            score: analysisResult.performance.score,
            timeComplexity: this.calculateTimeComplexity(analysisResult),
            spaceComplexity: this.calculateSpaceComplexity(analysisResult),
            optimizationPotential: 1 - analysisResult.performance.score,
            metrics: {
              loadTime: performanceResult.loadTime,
              memoryUsage: performanceResult.memoryUsage,
              cpuUsage: performanceResult.cpuUsage
            }
          },
          metrics: {
            totalRequests: this.metricsCollector.getMetrics().requestCount,
            successfulRequests: this.metricsCollector.getMetrics().successfulRequests,
            failedRequests: this.metricsCollector.getMetrics().failedRequests,
            averageProcessingTime: endTime - startTime,
            cacheHitRate: this.calculateCacheHitRate(),
            resourceUsage: {
              memory: process.memoryUsage().heapUsed / (1024 * 1024),
              cpu: this.performanceMonitor.getCPUUsage()
            }
          }
        };

        // Cache if enabled
        if (this.config.cacheEnabled) {
          this.setCache(cacheKey, result);
        }

        // Save analysis to supabase
        await this.saveAnalysisResult(result);

        this.metricsCollector.recordSuccess(endTime - startTime);
        return result;

      }, options.timeout);

    } catch (error) {
      this.metricsCollector.recordError(error as Error);
      throw error;
    } finally {
      this.memoryManager.releaseMemory(cacheKey);
    }
  }

  private async optimizeCode(code: string, analysis: any): Promise<string> {
    const optimizationPrompt = this.generateOptimizationPrompt(code, analysis);
    const optimized = await this.openai.generateCompletion(optimizationPrompt);

    // Validate
    const optimizedAnalysis = await this.codeAnalyzer.analyzeCode(optimized);
    if (optimizedAnalysis.performance.score <= analysis.performance.score) {
      return code;
    }
    return optimized;
  }

  private async detectPatterns(code: string): Promise<any> {
    // Stub for pattern detection
    return {};
  }

  private calculateTimeComplexity(analysis: any): string {
    return 'O(n)';
  }

  private calculateSpaceComplexity(analysis: any): string {
    return 'O(n)';
  }

  private calculateCacheHitRate(): number {
    const metrics = this.metricsCollector.getMetrics();
    return metrics.successfulRequests > 0
      ? metrics.cacheHits / metrics.successfulRequests
      : 0;
  }

  /**
   * Concurrency-managed operation queue with optional per-operation timeout.
   */
  private async queueOperation<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    if (this.activeRequests < (this.config.maxConcurrentRequests || 3)) {
      this.activeRequests++;
      try {
        return await this.executeOperation(operation, timeout);
      } finally {
        this.activeRequests--;
      }
    }

    // Otherwise queue it
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ id, operation, resolve, reject });
      if (timeout) {
        setTimeout(() => {
          const index = this.requestQueue.findIndex(req => req.id === id);
          if (index !== -1) {
            this.requestQueue.splice(index, 1);
            reject(new AIError('Operation timed out', 'TIMEOUT'));
          }
        }, timeout);
      }
    });
  }

  private async executeOperation<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
    let timeoutPromise: Promise<never> | null = null;
    if (timeout) {
      timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AIError('Operation timed out', 'TIMEOUT')), timeout);
      });
    }

    // Implement local retry logic
    const maxAttempts = this.config.retryAttempts || 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (timeoutPromise) {
          return await Promise.race([operation(), timeoutPromise]);
        }
        return await operation();

      } catch (error: any) {
        if (attempt === maxAttempts || !this.shouldRetry(error)) {
          throw error;
        }
        logger.warn(`Retry attempt ${attempt} after error: ${error.message}`);

        // Exponential backoff
        const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new AIError('Max retry attempts exceeded', 'RETRY_EXCEEDED');
  }

  private processQueue() {
    if (this.isProcessingQueue) return;
    if (this.requestQueue.length === 0) return;
    if (this.activeRequests >= (this.config.maxConcurrentRequests || 3)) return;

    this.isProcessingQueue = true;

    const item = this.requestQueue.shift();
    if (!item) {
      this.isProcessingQueue = false;
      return;
    }

    this.activeRequests++;
    this.executeOperation(item.operation, this.config.timeout)
      .then((result) => item.resolve(result))
      .catch((err) => item.reject(err))
      .finally(() => {
        this.activeRequests--;
        this.isProcessingQueue = false;
      });
  }

  private shouldRetry(error: any): boolean {
    // We skip retry for certain codes
    if (!(error instanceof AIError)) return false;
    if (error.code === 'VALIDATION_ERROR' || error.code === 'SAVE_ERROR' || error.code === 'TIMEOUT') {
      return false;
    }
    return true;
  }

  private generateCacheKey(type: string, data: any): string {
    return `${type}_${JSON.stringify(data).slice(0, 200)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > (this.config.cacheTTL || 3600000)) {
      this.cache.delete(key);
      return null;
    }
    this.metricsCollector.incrementCacheHit();
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private generateOptimizationPrompt(code: string, analysis: any): string {
    return `
Optimize this code for better performance:
${code}

Current analysis:
${JSON.stringify(analysis, null, 2)}

Focus on:
1. Reducing complexity
2. Improving memory usage
3. Optimizing algorithms
4. Enhancing readability
`;
  }

  private setupErrorHandling() {
    const handleError = (error: Error) => {
      logger.error('AIOrchestrator error', { error });
      this.metricsCollector.recordError(error);
      this.emit('error', error);
    };
    this.on('error', handleError);

    // Handle unhandled rejections in browser environment
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });
  }

  private logMetrics() {
    const metrics = this.getMetrics();
    logger.info('AIOrchestrator metrics', { metrics });
  }

  private async saveAnalysisResult(result: ProcessingResult): Promise<void> {
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('analysis_results')
          .insert({
            original_code: result.original,
            optimized_code: result.optimized,
            analysis_data: result.analysis,
            performance_metrics: result.performance,
            security_report: result.security,
            created_at: new Date().toISOString()
          });
        if (error) throw error;
      });
    } catch (error) {
      logger.error('Failed to save analysis result', { error });
      throw new AIError('Failed to save analysis result', 'SAVE_ERROR');
    }
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
    await this.performanceMonitor.shutdown();
    this.parallelProcessor.terminate();
    this.componentGenerator.terminate();

    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleError as any);
    }

    if (this.queueInterval) clearInterval(this.queueInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.removeAllListeners();
  }

  private handleError = (error: Error) => {
    logger.error('AIOrchestrator error', { error });
    this.metricsCollector.recordError(error);
    this.emit('error', error);
  };

  getMetrics() {
    return {
      ...this.metricsCollector.getMetrics(),
      performance: this.performanceMonitor.getMetrics(),
      memory: this.memoryManager.getMemoryUsage(),
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate()
      },
      queue: {
        length: this.requestQueue.length,
        activeRequests: this.activeRequests
      }
    };
  }
}