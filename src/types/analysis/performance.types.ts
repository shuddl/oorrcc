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
