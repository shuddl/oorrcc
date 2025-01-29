import React from 'react';
import { PipelineStage } from '../../services/PipelineStages';
import { Play, Pause, RotateCw, Plus } from 'lucide-react';

interface Props {
  onAddStage: () => void;
  onStartAll: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
  completedCount: number;
  totalCount: number;
}

export function PipelineControls({
  onAddStage,
  onStartAll,
  onPause,
  onReset,
  isRunning,
  completedCount,
  totalCount
}: Props) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onAddStage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Stage
            </button>
            
            <button
              onClick={isRunning ? onPause : onStartAll}
              className={`px-4 py-2 rounded-lg flex items-center ${
                isRunning
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start All
                </>
              )}
            </button>

            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
            >
              <RotateCw className="h-5 w-5 mr-2" />
              Reset
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Progress: {completedCount} / {totalCount} stages completed
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}