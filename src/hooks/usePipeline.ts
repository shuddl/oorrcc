import { create } from 'zustand';
import { PipelineOrchestrator, PipelineStage, PipelineMetrics } from '../services/PipelineOrchestrator';

interface PipelineState {
  orchestrator: PipelineOrchestrator;
  stages: PipelineStage[];
  metrics: PipelineMetrics;
  addStage: (stage: PipelineStage) => void;
  executeStage: (stageId: string) => Promise<void>;
  getMetrics: () => PipelineMetrics;
}

export const usePipeline = create<PipelineState>((set, get) => {
  const orchestrator = new PipelineOrchestrator();

  return {
    orchestrator,
    stages: [],
    metrics: {
      totalTime: 0,
      successRate: 0,
      performanceScore: 0,
      qualityScore: 0
    },
    addStage: (stage) => {
      orchestrator.addStage(stage);
      set({ stages: orchestrator.getAllStages() });
    },
    executeStage: async (stageId) => {
      await orchestrator.executeStage(stageId);
      set({
        stages: orchestrator.getAllStages(),
        metrics: orchestrator.getMetrics()
      });
    },
    getMetrics: () => orchestrator.getMetrics()
  };
});