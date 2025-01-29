import React from 'react';
import { StatsWidget } from './widgets/StatsWidget';
import { PipelineWidget } from './widgets/PipelineWidget';
import { ActivityFeed } from './widgets/ActivityFeed';
import { ProjectList } from './widgets/ProjectList';

export function DashboardContent() {
  return (
    <main className="flex-1 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        
        <div className="mt-6">
          <StatsWidget />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PipelineWidget />
          <ActivityFeed />
        </div>

        <div className="mt-6">
          <ProjectList />
        </div>
      </div>
    </main>
  );
}