import { useContext, createContext, useEffect, useCallback } from 'react';
import React from 'react'; // Added missing React import
import { ServiceRegistry } from '../services/ServiceRegistry';
import { useAuth } from '../lib/auth';
import { toast } from 'react-hot-toast'; // Added missing react-hot-toast import
import { logger } from '../utils/logger';
import { AIError } from '../types/ai.types';
import { SecurityScanResult, PipelineStatus, DependencyAnalysis, PerformanceAnalysis, ComplexityAnalysis } from '../types/analysis.types'; // Imported missing types

export const ServiceContext = createContext<ServiceRegistry | null>(null);

interface ServiceHookReturn {
  registry: ServiceRegistry;
  callService: <T>(service: string, method: string, ...args: any[]) => Promise<T>;
  ai: {
    analyze: (code: string) => Promise<any>;
    generate: (prompt: string) => Promise<string>;
    optimize: (code: string) => Promise<string>;
  };
  requirements: any;
  performance: any;
  security: {
    scan: (code: string) => Promise<SecurityScanResult>;
    validate: (dependencies: string[]) => Promise<boolean>;
  };
  pipeline: {
    create: (stages: string[]) => Promise<string>;
    execute: (id: string) => Promise<void>;
    status: (id: string) => Promise<PipelineStatus>;
  };
  analysis: {
    dependencies: (code: string) => Promise<DependencyAnalysis>;
    performance: (code: string) => Promise<PerformanceAnalysis>;
    complexity: (code: string) => Promise<ComplexityAnalysis>;
  };
}

export function useServices(): ServiceHookReturn {
  const registry = useContext(ServiceContext);
  const { user } = useAuth();

  if (!registry) {
    throw new Error('useServices must be used within ServiceProvider');
  }

  const handleServiceError = useCallback((error: Record<string, unknown>) => {
    logger.error('Service error:', error);
    
    // Handle specific error types
    if (error instanceof AIError) {
      toast.error(`AI Service Error: ${error.message}`);
    } else if (error.message.includes('rate limit')) {
      toast.error('Rate limit exceeded. Please try again later.');
    } else if (error.message.includes('network')) {
      toast.warning('Network error. Changes will be saved when connection is restored.');
    } else {
      toast.error('An unexpected error occurred');
    }
  }, []);

  const callService = useCallback(async <T>(
    service: string,
    method: string,
    ...args: any[]
  ): Promise<T> => {
    try {
      const result = await registry.callService<T>(service, method, ...args);
      return result;
    } catch (error) {
      handleServiceError(error as Record<string, unknown>);
      throw error;
    }
  }, [registry, handleServiceError]);

  useEffect(() => {
    const handleOffline = () => {
      toast.warning('You are offline. Changes will be synced when connection is restored.');
    };

    const handleSync = () => {
      toast.success('Changes synced successfully');
    };

    registry.on('serviceError', handleServiceError);
    registry.on('offline', handleOffline);
    registry.on('sync', handleSync);

    return () => {
      registry.off('serviceError', handleServiceError);
      registry.off('offline', handleOffline);
      registry.off('sync', handleSync);
    };
  }, [registry, handleServiceError]);

  return {
    registry,
    callService,
    ai: registry.getService('ai'),
    requirements: registry.getService('requirements'),
    performance: registry.getService('performance'),
    security: registry.getService('security'),
    pipeline: registry.getService('pipeline'),
    analysis: registry.getService('analysis')
  };
}

export type { ServiceHookReturn };
export default useServices;