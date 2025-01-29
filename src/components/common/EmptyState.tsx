import React from 'react';
import { FolderOpen } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ 
  title, 
  description, 
  action,
  icon = <FolderOpen className="h-12 w-12 text-gray-400" />
}: Props) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}