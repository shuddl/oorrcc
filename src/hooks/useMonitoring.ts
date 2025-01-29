import { useState, useEffect } from 'react';
import { useServices } from './useServices';

export function useMonitoring() {
  const { performance } = useServices();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    performance.startTracking();
    
    const unsubscribe = performance.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => {
      performance.stopTracking();
      unsubscribe();
    };
  }, []);

  return metrics;
}
