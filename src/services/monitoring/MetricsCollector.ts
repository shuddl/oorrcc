import { logger } from '../../utils/logger';

interface MetricsConfig {
  enabled: boolean;
  metricsInterval: number;
  errorThreshold: number;
}

export class MetricsCollector {
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastError: null as Error | null,
    startTime: Date.now(),
    successfulRequests: 0,
    failedRequests: 0
  };

  constructor(private config: MetricsConfig) {
    if (config.enabled) {
      setInterval(() => this.logMetrics(), config.metricsInterval);
    }
  }

  recordSuccess(duration: number = 0) {
    this.metrics.requestCount++;
    this.metrics.successfulRequests++;
    this.metrics.totalResponseTime += duration;
    this.metrics.averageResponseTime = 
      this.metrics.totalResponseTime / this.metrics.successfulRequests;
  }

  recordError(error: Error) {
    this.metrics.errorCount++;
    this.metrics.failedRequests++;
    this.metrics.lastError = error;

    const errorRate = this.metrics.errorCount / this.metrics.requestCount;
    if (errorRate > this.config.errorThreshold) {
      logger.error('Error rate exceeded threshold', {
        errorRate,
        threshold: this.config.errorThreshold
      });
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const errorRate = this.metrics.requestCount > 0
      ? this.metrics.errorCount / this.metrics.requestCount
      : 0;

    return {
      ...this.metrics,
      uptime,
      errorRate,
      requestsPerSecond: this.metrics.requestCount / (uptime / 1000)
    };
  }

  private logMetrics() {
    logger.info('Current metrics', this.getMetrics());
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastError: null,
      startTime: Date.now(),
      successfulRequests: 0,
      failedRequests: 0
    };
  }
}