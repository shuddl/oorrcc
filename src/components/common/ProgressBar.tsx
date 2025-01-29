import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentOperation?: string;
  timeElapsed?: number;
  timeRemaining?: number;
}

export function ProgressBar({ 
  progress, 
  status, 
  currentOperation,
  timeElapsed,
  timeRemaining 
}: ProgressBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-accent-500';
      default: return 'bg-dark-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-accent-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-dark-400" />;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className="font-medium text-white">{currentOperation || 'Processing'}</span>
        </div>
        <span className="text-dark-300">
          {progress.toFixed(1)}%
        </span>
      </div>

      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {(timeElapsed !== undefined || timeRemaining !== undefined) && (
        <div className="flex justify-between text-sm text-dark-300">
          {timeElapsed !== undefined && (
            <span>Elapsed: {formatTime(timeElapsed)}</span>
          )}
          {timeRemaining !== undefined && (
            <span>Remaining: ~{formatTime(timeRemaining)}</span>
          )}
        </div>
      )}
    </div>
  );
}
