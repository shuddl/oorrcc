import React from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { Activity, CheckCircle, XCircle, Clock, BarChart } from 'lucide-react';

export function PipelineMonitor() {
  const { stages, metrics, executeStage } = usePipeline();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Activity className="h-5 w-5 text-indigo-600 mr-2" />
        Pipeline Status
      </h3>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {(metrics.successRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Total Time</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {(metrics.totalTime / 1000).toFixed(1)}s
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Performance</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {(metrics.performanceScore * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Quality</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {(metrics.qualityScore * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center">
              {stage.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : stage.status === 'failed' ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : stage.status === 'running' ? (
                <BarChart className="h-5 w-5 text-yellow-500 animate-pulse" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <span className="ml-3 font-medium text-gray-900">{stage.name}</span>
            </div>

            <div className="flex items-center space-x-4">
              {stage.startTime && (
                <span className="text-sm text-gray-500">
                  {new Date(stage.startTime).toLocaleTimeString()}
                </span>
              )}
              {stage.status === 'pending' && (
                <button
                  onClick={() => executeStage(stage.id)}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  disabled={stage.dependencies.some(
                    (depId) => stages.find(s => s.id === depId)?.status !== 'completed'
                  )}
                >
                  Execute
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}