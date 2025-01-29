import React from 'react';
import { Activity, GitBranch, Users, CheckCircle } from 'lucide-react';

export function StatsWidget() {
  const stats = [
    {
      name: 'Active Pipelines',
      value: '12',
      change: '+22%',
      icon: GitBranch
    },
    {
      name: 'Team Members',
      value: '36',
      change: '+3%',
      icon: Users
    },
    {
      name: 'Success Rate',
      value: '98.5%',
      change: '+4.75%',
      icon: CheckCircle
    },
    {
      name: 'Total Activity',
      value: '245',
      change: '+18%',
      icon: Activity
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      {stat.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}