import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { AIComponentGenerator } from './AIComponentGenerator';

interface PipelineStage {
  id: string;
  name: string;
  type: 'analysis' | 'generation' | 'optimization';
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: Error;
}

interface PipelineMetrics {
  totalTime: number;
  successRate: number;
  performanceScore: number;
  qualityScore: number;
}

export class PipelineOrchestrator extends EventEmitter {
  private stages: Map<string, PipelineStage> = new Map();
  private componentGenerator: AIComponentGenerator;
  private metrics: PipelineMetrics = {
    totalTime: 0,
    successRate: 0,
    performanceScore: 0,
    qualityScore: 0
  };
  private executionTimes: number[] = [];

  constructor() {
    super();
    this.componentGenerator = new AIComponentGenerator();
  }

  addStage(stage: PipelineStage) {
    if (this.stages.has(stage.id)) {
      throw new Error(`Stage with id ${stage.id} already exists`);
    }
    this.stages.set(stage.id, { ...stage, status: 'pending' });
    this.emit('stageAdded', stage);
    logger.info('Pipeline stage added', { stageId: stage.id, type: stage.type });
  }

  async executeStage(stageId: string) {
    const stage = this.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    try {
      stage.status = 'running';
      this.emit('stageStarted', stage);
      logger.info('Executing pipeline stage', { stageId, type: stage.type });

      const startTime = Date.now();
      const result = await this.processStage(stage);
      const executionTime = Date.now() - startTime;

      this.executionTimes.push(executionTime);
      stage.status = 'completed';
      stage.result = result;

      this.updateMetrics();
      this.emit('stageCompleted', { stage, result });
      logger.info('Pipeline stage completed', { 
        stageId, 
        executionTime,
        type: stage.type 
      });
    } catch (error) {
      stage.status = 'failed';
      stage.error = error as Error;
      this.updateMetrics();
      this.emit('stageFailed', { stage, error });
      logger.error('Pipeline stage failed', { 
        stageId, 
        error,
        type: stage.type 
      });
      throw error;
    }
  }

  private async processStage(stage: PipelineStage) {
    switch (stage.type) {
      case 'analysis':
        return this.processAnalysisStage(stage);
      case 'generation':
        return this.processGenerationStage(stage);
      case 'optimization':
        return this.processOptimizationStage(stage);
      default:
        throw new Error(`Unknown stage type: ${stage.type}`);
    }
  }

  private async processAnalysisStage(stage: PipelineStage) {
    const analysis = await this.componentGenerator.analyzeComponent(stage.data.code, stage.data.name);
    return {
      analysis,
      recommendations: this.generateRecommendations(analysis)
    };
  }

  private async processGenerationStage(stage: PipelineStage) {
    return this.componentGenerator.generateComponent(stage.data);
  }

  private async processOptimizationStage(stage: PipelineStage) {
    return this.componentGenerator.optimizeComponent(stage.data.code, stage.data.name);
  }

  private generateRecommendations(analysis: any) {
    return [
      {
        type: 'performance',
        description: 'Consider optimizing render performance',
        priority: 'medium'
      },
      {
        type: 'accessibility',
        description: 'Add ARIA labels for better accessibility',
        priority: 'high'
      }
    ];
  }

  private updateMetrics() {
    const completedStages = Array.from(this.stages.values()).filter(
      s => s.status === 'completed'
    );
    const failedStages = Array.from(this.stages.values()).filter(
      s => s.status === 'failed'
    );

    this.metrics = {
      totalTime: this.executionTimes.reduce((a, b) => a + b, 0),
      successRate: completedStages.length / this.stages.size,
      performanceScore: this.calculatePerformanceScore(),
      qualityScore: this.calculateQualityScore()
    };
  }

  private calculatePerformanceScore(): number {
    if (this.executionTimes.length === 0) return 1;
    const avgTime = this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
    return Math.min(1, 5000 / avgTime); // 5 seconds is baseline
  }

  private calculateQualityScore(): number {
    const stages = Array.from(this.stages.values());
    if (stages.length === 0) return 1;

    const qualitySum = stages.reduce((sum, stage) => {
      if (stage.result?.analysis?.qualityMetrics) {
        return sum + (
          stage.result.analysis.qualityMetrics.testCoverage +
          stage.result.analysis.qualityMetrics.codeQuality +
          stage.result.analysis.qualityMetrics.performance
        ) / 3;
      }
      return sum;
    }, 0);

    return qualitySum / stages.length;
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  getAllStages(): PipelineStage[] {
    return Array.from(this.stages.values());
  }
}