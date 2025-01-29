import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Download } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { toast } from 'react-hot-toast';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

interface ProcessMonitorProps {
  steps: ProcessStep[];
  currentStep: string;
  canPause?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  logs: Array<{
    timestamp: number;
    message: string;
    type: 'info' | 'error' | 'success';
  }>;
  onExport?: () => void;
}

export function ProcessMonitor({
  steps,
  currentStep,
  canPause,
  onPause,
  onResume,
  isPaused,
  logs,
  onExport
}: ProcessMonitorProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStepObj = steps.find(s => s.id === currentStep);

  const calculateTimeMetrics = () => {
    const now = Date.now();
    const completedTimes = steps
      .filter(s => s.startTime && s.endTime)
      .map(s => s.endTime! - s.startTime!);
    
    if (completedTimes.length === 0) return {};

    const avgStepTime = completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length;
    const remainingSteps = steps.length - completedSteps;
    const estimatedTimeRemaining = avgStepTime * remainingSteps;

    const timeElapsed = currentStepObj?.startTime 
      ? now - currentStepObj.startTime 
      : 0;

    return {
      timeElapsed: timeElapsed / 1000,
      timeRemaining: estimatedTimeRemaining / 1000
    };
  };

  const handleExport = () => {
    try {
      const exportData = {
        steps,
        logs,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requirements-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Process log exported successfully');
    } catch (error) {
      toast.error('Failed to export process log');
      console.error('Export error:', error);
    }
  };

  const { timeElapsed, timeRemaining } = calculateTimeMetrics();

  return (
    <div className="bg-dark-700 rounded-lg border border-dark-600 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Process Status</h3>
        {canPause && (
          <button
            onClick={isPaused ? onResume : onPause}
            className="p-2 rounded-lg hover:bg-dark-600 text-accent-400 hover:text-accent-300"
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      <ProgressBar
        progress={totalProgress}
        status={currentStepObj?.status || 'idle'}
        currentOperation={currentStepObj?.name}
        timeElapsed={timeElapsed}
        timeRemaining={timeRemaining}
      />

      <div className="space-y-2">
        {steps.map(step => (
          <div 
            key={step.id}
            className={`p-3 rounded-lg ${
              step.id === currentStep ? 'bg-dark-600' : 'bg-dark-700'
            } border border-dark-600`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{step.name}</span>
              <span className="text-sm text-dark-300">
                {step.progress.toFixed(1)}%
              </span>
            </div>
            {step.error && (
              <p className="mt-1 text-sm text-red-400">{step.error}</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dark-600 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center space-x-2 text-sm text-dark-300 hover:text-white"
          >
            {showLogs ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>Activity Log</span>
          </button>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-dark-300">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-dark-500"
              />
              <span>Auto-scroll</span>
            </label>
            <button
              onClick={handleExport}
              className="flex items-center space-x-1 text-sm text-dark-300 hover:text-white"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {showLogs && (
          <div 
            ref={logsRef}
            className="mt-4 max-h-48 overflow-auto bg-dark-800 rounded-lg p-4 space-y-1"
          >
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-sm py-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-dark-300'
                }`}
              >
                <span className="text-dark-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {' '}{log.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}