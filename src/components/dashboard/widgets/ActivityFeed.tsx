import React from 'react';
import { Activity, GitCommit, GitPullRequest, Package } from 'lucide-react';

export function ActivityFeed() {
  const activities = [
    {
      id: 1,
      type: 'commit',
      message: 'Updated pipeline configuration',
      user: 'John Doe',
      time: '5m ago',
      icon: GitCommit
    },
    {
      id: 2,
      type: 'pr',
      message: 'Merged feature branch',
      user: 'Jane Smith',
      time: '15m ago',
      icon: GitPullRequest
    },
    {
      id: 3,
      type: 'deploy',
      message: 'Deployed to production',
      user: 'System',
      time: '1h ago',
      icon: Package
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Activity className="h-5 w-5 text-gray-400 mr-2" />
          Recent Activity
        </h2>
        <div className="mt-4 space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex space-x-3">
              <div className="flex-shrink-0">
                <activity.icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {activity.message}
                </p>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <span>{activity.user}</span>
                  <span className="mx-1">•</span>
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}