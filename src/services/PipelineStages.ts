import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface PipelineStage {
  id: string;
  name: string;
  type: 'analysis' | 'processing' | 'optimization';
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependencies: string[];
  data?: any;
  metrics: {
    duration?: number;
    accuracy?: number;
    performance?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

export class PipelineStageManager extends EventEmitter {
  private stages: Map<string, PipelineStage> = new Map();
  private executionOrder: string[] = [];

  addStage(stage: PipelineStage) {
    this.validateDependencies(stage);
    this.stages.set(stage.id, stage);
    this.updateExecutionOrder();
    this.emit('stageAdded', stage);
    logger.info('Pipeline stage added', { stageId: stage.id, type: stage.type });
  }

  async executeStage(stageId: string) {
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found`);

    if (!this.canExecuteStage(stage)) {
      throw new Error('Dependencies not satisfied');
    }

    try {
      stage.status = 'running';
      this.emit('stageStatusChanged', { stageId, status: 'running' });

      const startTime = Date.now();
      await this.processStage(stage);
      
      stage.metrics.duration = Date.now() - startTime;
      stage.status = 'completed';
      
      this.emit('stageStatusChanged', { 
        stageId, 
        status: 'completed',
        metrics: stage.metrics 
      });

      logger.info('Pipeline stage completed', { 
        stageId,
        duration: stage.metrics.duration 
      });
    } catch (error) {
      stage.status = 'failed';
      this.emit('stageStatusChanged', { stageId, status: 'failed', error });
      logger.error('Pipeline stage failed', { stageId, error });
      throw error;
    }
  }

  private async processStage(stage: PipelineStage) {
    const startTime = performance.now();
    
    try {
      let result: any;
      switch (stage.type) {
        case 'analysis':
          result = await this.performAnalysis(stage);
          break;
        case 'processing':
          result = await this.performProcessing(stage);
          break;
        case 'optimization':
          result = await this.performOptimization(stage);
          break;
        default:
          throw new Error(`Unknown stage type: ${stage.type}`);
      }
      
      stage.metrics = {
        ...result,
        duration: performance.now() - startTime,
        memoryUsage: await this.getMemoryUsage(),
        cpuUsage: await this.getCPUUsage()
      };
      
      this.emit('stageMetricsCollected', { 
        stageId: stage.id, 
        metrics: stage.metrics 
      });
    } catch (error) {
      logger.error('Stage processing failed', { 
        stageId: stage.id, 
        type: stage.type,
        error 
      });
      throw error;
    }
  }

  private async performAnalysis(stage: PipelineStage) {
    const performanceMonitor = new PerformanceMonitor();
    await performanceMonitor.startTracking();
    const metrics = await performanceMonitor.getMetrics();

    return {
      accuracy: metrics.accuracy || 0,
      performance: metrics.performance || 0,
      ...metrics
    };
  }

  private async performProcessing(stage: PipelineStage) {
    // Implement actual processing logic
    const result = await this.processData(stage.data);
    return {
      accuracy: result.accuracy,
      performance: result.performance,
      ...result.metrics
    };
  }

  private async performOptimization(stage: PipelineStage) {
    // Implement actual optimization logic
    const result = await this.optimizeData(stage.data);
    return {
      accuracy: result.accuracy,
      performance: result.performance,
      ...result.metrics
    };
  }

  private async getMemoryUsage(): Promise<number> {
    if (typeof window !== 'undefined') {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
    }
    return 0;
  }

  private async getCPUUsage(): Promise<number> {
    // Use Performance API to estimate CPU usage
    const start = performance.now();
    const startCpu = await this.estimateCPUTime();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const end = performance.now();
    const endCpu = await this.estimateCPUTime();
    
    const cpuTime = endCpu - startCpu;
    const totalTime = end - start;
    
    return (cpuTime / totalTime) * 100;
  }

  private async estimateCPUTime(): Promise<number> {
    const iterations = 1000000;
    const start = performance.now();
    
    // Perform CPU-intensive operation
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(i);
    }
    
    return performance.now() - start;
  }

  private async processData(data: any) {
    return {
      accuracy: 0,
      performance: 0,
      metrics: {}
    };
  }

  private async optimizeData(data: any) {
    return {
      accuracy: 0,
      performance: 0,
      metrics: {}
    };
  }

  private validateDependencies(stage: PipelineStage) {
    for (const depId of stage.dependencies) {
      if (!this.stages.has(depId)) {
        throw new Error(`Dependency ${depId} not found`);
      }
    }
  }

  private canExecuteStage(stage: PipelineStage): boolean {
    return stage.dependencies.every(depId => {
      const dep = this.stages.get(depId);
      return dep && dep.status === 'completed';
    });
  }

  private updateExecutionOrder() {
    // Topological sort for execution order
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (stageId: string) => {
      if (temp.has(stageId)) throw new Error('Circular dependency detected');
      if (visited.has(stageId)) return;

      temp.add(stageId);
      const stage = this.stages.get(stageId)!;
      
      for (const depId of stage.dependencies) {
        visit(depId);
      }

      temp.delete(stageId);
      visited.add(stageId);
      order.push(stageId);
    };

    for (const stageId of this.stages.keys()) {
      if (!visited.has(stageId)) {
        visit(stageId);
      }
    }

    this.executionOrder = order;
  }

  getStage(stageId: string): PipelineStage | undefined {
    return this.stages.get(stageId);
  }

  getAllStages(): PipelineStage[] {
    return Array.from(this.stages.values());
  }

  getExecutionOrder(): string[] {
    return [...this.executionOrder];
  }
}