import React from 'react';
import { PipelineStage } from '../../services/PipelineStages';
import { Play, CheckCircle, XCircle, Loader2, BarChart2 } from 'lucide-react';

interface Props {
  stage: PipelineStage;
  onExecute: (stageId: string) => void;
  className?: string;
}

export function PipelineStageCard({ stage, onExecute, className = '' }: Props) {
  const getStatusIcon = () => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <Play className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <h3 className="text-lg font-medium text-gray-900">{stage.name}</h3>
        </div>
        <span className={`px-2 py-1 text-sm rounded-full ${
          stage.status === 'completed' ? 'bg-green-100 text-green-800' :
          stage.status === 'failed' ? 'bg-red-100 text-red-800' :
          stage.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {stage.status}
        </span>
      </div>

      {stage.metrics && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {stage.metrics.accuracy && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm font-medium text-gray-500">Accuracy</div>
              <div className="text-lg font-semibold text-gray-900">
                {(stage.metrics.accuracy * 100).toFixed(1)}%
              </div>
            </div>
          )}
          {stage.metrics.performance && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm font-medium text-gray-500">Performance</div>
              <div className="text-lg font-semibold text-gray-900">
                {(stage.metrics.performance * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {stage.status === 'pending' && (
        <button
          onClick={() => onExecute(stage.id)}
          disabled={stage.dependencies.length > 0}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <BarChart2 className="h-4 w-4 mr-2" />
          Execute Stage
        </button>
      )}
    </div>
  );
}