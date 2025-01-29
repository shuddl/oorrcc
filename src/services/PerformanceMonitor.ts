import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  loadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceMonitorInterface {
  reset(): Promise<void>;
  startTracking(): void;
  stopTracking(): void;
  getCPUUsage(): number;
  collectMetrics(): Promise<void>;
  shutdown(): Promise<void>;
}

export class PerformanceMonitor implements PerformanceMonitorInterface {
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    timeToInteractive: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  private isTracking = false;
  private intervalId?: NodeJS.Timeout;
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];

  async reset(): Promise<void> {
    this.metrics = {
      loadTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      timeToInteractive: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    
    // Monitor page load metrics
    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      this.metrics.loadTime = navigationTiming.loadEventEnd - navigationTiming.startTime;

      // Get paint timing
      const paintMetrics = performance.getEntriesByType('paint');
      paintMetrics.forEach(paint => {
        if (paint.name === 'first-paint') {
          this.metrics.firstPaint = paint.startTime;
        }
        if (paint.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = paint.startTime;
        }
      });

      this.notifyObservers();
    });

    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isTracking = false;
  }

  getCPUUsage(): number {
    return this.metrics.cpuUsage;
  }

  async collectMetrics(): Promise<void> {
    if (!this.isTracking) return;
    
    try {
      await this.updateMetrics();
      logger.info('Performance metrics collected', this.metrics);
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  async shutdown(): Promise<void> {
    this.stopTracking();
    await this.collectMetrics();
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback({ ...this.metrics }));
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  private async updateMetrics(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Browser environment
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
      }
    } else {
      // Node.js environment
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      
      this.metrics.cpuUsage = (endUsage.user + endUsage.system) / 1000000;
      this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    }
    
    this.notifyObservers();
  }
}
