import React, { useState, useEffect } from 'react';
import { PipelineStageManager, PipelineStage } from '../../services/PipelineStages';
import { PipelineStageCard } from './PipelineStageCard';
import { PipelineVisualizer } from './PipelineVisualizer';
import { PipelineControls } from './PipelineControls';
import { toast } from 'react-hot-toast';

export function PipelineManager() {
  const [stageManager] = useState(() => new PipelineStageManager());
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [executionOrder, setExecutionOrder] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleStageAdded = () => {
      setStages(stageManager.getAllStages());
      setExecutionOrder(stageManager.getExecutionOrder());
    };

    const handleStageStatusChanged = ({ stageId, status, metrics }: any) => {
      setStages(stageManager.getAllStages());
      
      if (status === 'completed') {
        toast.success(`Stage ${stageId} completed successfully!`);
      } else if (status === 'failed') {
        toast.error(`Stage ${stageId} failed`);
      }
    };

    stageManager.on('stageAdded', handleStageAdded);
    stageManager.on('stageStatusChanged', handleStageStatusChanged);

    return () => {
      stageManager.removeAllListeners();
    };
  }, [stageManager]);

  const handleAddStage = () => {
    const stageId = `stage-${stages.length + 1}`;
    const stage: PipelineStage = {
      id: stageId,
      name: `Processing Stage ${stages.length + 1}`,
      type: 'processing',
      status: 'pending',
      dependencies: stages.length > 0 ? [stages[stages.length - 1].id] : [],
      metrics: {}
    };

    stageManager.addStage(stage);
  };

  const handleExecuteStage = async (stageId: string) => {
    try {
      await stageManager.executeStage(stageId);
    } catch (error) {
      toast.error('Failed to execute stage');
    }
  };

  const handleStartAll = async () => {
    setIsRunning(true);
    for (const stageId of executionOrder) {
      try {
        await stageManager.executeStage(stageId);
      } catch (error) {
        break;
      }
    }
    setIsRunning(false);
  };

  const handleReset = () => {
    window.location.reload();
  };

  const completedCount = stages.filter(s => s.status === 'completed').length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PipelineControls
        onAddStage={handleAddStage}
        onStartAll={handleStartAll}
        onPause={() => setIsRunning(false)}
        onReset={handleReset}
        isRunning={isRunning}
        completedCount={completedCount}
        totalCount={stages.length}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6">
          <PipelineVisualizer
            stages={stages}
            executionOrder={executionOrder}
          />
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stages.map(stage => (
              <PipelineStageCard
                key={stage.id}
                stage={stage}
                onExecute={handleExecuteStage}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}