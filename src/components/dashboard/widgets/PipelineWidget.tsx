import React from 'react';
import { GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';

export function PipelineWidget() {
  const pipelines = [
    {
      id: 1,
      name: 'Frontend Build',
      status: 'completed',
      duration: '2m 35s'
    },
    {
      id: 2,
      name: 'API Tests',
      status: 'running',
      duration: '1m 15s'
    },
    {
      id: 3,
      name: 'Database Migration',
      status: 'failed',
      duration: '45s'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <GitBranch className="h-5 w-5 text-gray-400 mr-2" />
          Recent Pipelines
        </h2>
        <div className="mt-4 space-y-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center">
                {pipeline.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : pipeline.status === 'failed' ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500" />
                )}
                <span className="ml-3 font-medium text-gray-900">
                  {pipeline.name}
                </span>
              </div>
              <div className="text-sm text-gray-500">{pipeline.duration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}