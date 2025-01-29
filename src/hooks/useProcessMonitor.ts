import { useState, useCallback, useRef } from 'react';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

interface ProcessLog {
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface UseProcessMonitorOptions {
  steps: Array<{ id: string; name: string }>;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
}

export function useProcessMonitor({ 
  steps: initialSteps, 
  onComplete, 
  onError,
  autoStart = false
}: UseProcessMonitorOptions) {
  const [steps, setSteps] = useState<ProcessStep[]>(
    initialSteps.map(step => ({
      ...step,
      status: 'pending',
      progress: 0
    }))
  );
  const [currentStep, setCurrentStep] = useState<string>(steps[0]?.id);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const addLog = useCallback((message: string, type: ProcessLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }]);
  }, []);

  const updateStepProgress = useCallback((stepId: string, progress: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { 
        ...step, 
        progress: Math.min(100, Math.max(0, progress))
      } : step
    ));
  }, []);

  const startStep = useCallback((stepId: string) => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Clear any existing progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setSteps(prev => prev.map(step =>
      step.id === stepId ? {
        ...step,
        status: 'running',
        startTime: Date.now(),
        progress: 0
      } : step
    ));
    setCurrentStep(stepId);
    addLog(`Started ${steps.find(s => s.id === stepId)?.name}`);

    // Start progress simulation
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 2; // Random increment between 0-2%
      if (progress >= 95) { // Cap at 95% until actually complete
        clearInterval(progressIntervalRef.current);
      }
      updateStepProgress(stepId, progress);
    }, 200);
  }, [steps, addLog, updateStepProgress]);

  const completeStep = useCallback((stepId: string) => {
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setSteps(prev => prev.map(step =>
      step.id === stepId ? {
        ...step,
        status: 'completed',
        progress: 100,
        endTime: Date.now()
      } : step
    ));
    addLog(`Completed ${steps.find(s => s.id === stepId)?.name}`, 'success');

    // Move to next step
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      if (!isPaused) {
        startStep(nextStep.id);
      }
    } else {
      const totalTime = startTimeRef.current 
        ? (Date.now() - startTimeRef.current) / 1000 
        : 0;
      addLog(`Process completed in ${totalTime.toFixed(1)}s`, 'success');
      onComplete?.();
    }
  }, [steps, isPaused, startStep, addLog, onComplete]);

  const failStep = useCallback((stepId: string, error: Error) => {
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setSteps(prev => prev.map(step =>
      step.id === stepId ? {
        ...step,
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      } : step
    ));
    addLog(`Failed: ${error.message}`, 'error');
    onError?.(error);
  }, [addLog, onError]);

  const pause = useCallback(() => {
    setIsPaused(true);
    addLog('Process paused');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, [addLog]);

  const resume = useCallback(() => {
    setIsPaused(false);
    addLog('Process resumed');
    const currentStepObj = steps.find(s => s.id === currentStep);
    if (currentStepObj?.status === 'running') {
      // Resume progress simulation
      let progress = currentStepObj.progress;
      progressIntervalRef.current = setInterval(() => {
        progress += Math.random() * 2;
        if (progress >= 95) {
          clearInterval(progressIntervalRef.current);
        }
        updateStepProgress(currentStep, progress);
      }, 200);
    }
  }, [addLog, currentStep, steps, updateStepProgress]);

  const reset = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSteps(initialSteps.map(step => ({
      ...step,
      status: 'pending',
      progress: 0
    })));
    setCurrentStep(initialSteps[0]?.id);
    setIsPaused(false);
    setLogs([]);
    startTimeRef.current = undefined;
  }, [initialSteps]);

  return {
    steps,
    currentStep,
    isPaused,
    logs,
    actions: {
      updateStepProgress,
      startStep,
      completeStep,
      failStep,
      pause,
      resume,
      reset,
      addLog
    }
  };
}