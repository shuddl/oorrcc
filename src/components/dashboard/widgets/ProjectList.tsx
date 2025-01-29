import React from 'react';
import { Folder, MoreVertical, GitBranch, Clock } from 'lucide-react';

export function ProjectList() {
  const projects = [
    {
      id: 1,
      name: 'E-commerce Platform',
      description: 'Online shopping platform with AI recommendations',
      status: 'active',
      lastUpdated: '2h ago',
      pipelineCount: 3
    },
    {
      id: 2,
      name: 'Analytics Dashboard',
      description: 'Real-time data visualization dashboard',
      status: 'completed',
      lastUpdated: '1d ago',
      pipelineCount: 5
    },
    {
      id: 3,
      name: 'Mobile App Backend',
      description: 'RESTful API for mobile application',
      status: 'in_progress',
      lastUpdated: '30m ago',
      pipelineCount: 2
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Folder className="h-5 w-5 text-gray-400 mr-2" />
            Recent Projects
          </h2>
          <button className="text-sm text-indigo-600 hover:text-indigo-900">
            View all
          </button>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pipelines
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <GitBranch className="h-4 w-4 mr-1" />
                      {project.pipelineCount} pipelines
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {project.lastUpdated}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-500">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}