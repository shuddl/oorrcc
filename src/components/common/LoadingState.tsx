import React from 'react';

interface LoadingStateProps {
  rows?: number;
  type?: 'card' | 'list' | 'table';
}

export function LoadingState({ rows = 3, type = 'card' }: LoadingStateProps) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`
            mb-4 bg-gray-100 rounded-lg
            ${type === 'card' ? 'h-48' : 'h-12'}
          `}
        >
          <div className="h-full p-4">
            <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
            <div className="w-1/2 h-4 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}