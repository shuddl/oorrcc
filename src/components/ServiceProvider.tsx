import React, { useEffect } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { ServiceContext } from '../hooks/useServices';
import { useAuth } from '../lib/auth';
import { toast } from 'react-hot-toast';
import { logger } from '../utils/logger';
import { LoadingOverlay } from './common/LoadingOverlay';

export interface ServiceProviderProps {
  children: React.ReactNode;
}

const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const registryRef = React.useRef<ServiceRegistry>();

  useEffect(() => {
    const initializeServices = async () => {
      try {
        registryRef.current = ServiceRegistry.getInstance({
          enableRealtime: true, 
          enableOfflineSupport: false, // Disable offline support in WebContainer
          enableAnalytics: true
        });

        // Initialize services with user context
        if (user) {
          await registryRef.current.callService('requirements', 'initialize', user.id);
          await registryRef.current.callService('analytics', 'startTracking', user.id); // Added analytics tracking
        }

        // Start health monitoring
        registryRef.current.startHealthMonitoring(); // New feature: Health monitoring
      } catch (error) {
        logger.error('Failed to initialize services:', { error });
        toast.error('Failed to initialize application services');
        setError(error as Error);
        // Retry initialization up to 3 times
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            logger.info(`Retrying service initialization... Attempt ${attempt}`);
            registryRef.current = ServiceRegistry.getInstance({
              enableRealtime: true, 
              enableOfflineSupport: false,
              enableAnalytics: true
            });
            if (user) {
              await registryRef.current.callService('requirements', 'initialize', user.id);
              await registryRef.current.callService('analytics', 'startTracking', user.id);
            }
            registryRef.current.startHealthMonitoring();
            setError(null);
            toast.success('Services initialized successfully on retry');
            break;
          } catch (retryError) {
            logger.error(`Retry ${attempt} failed:`, { retryError });
            if (attempt === 3) {
              setError(retryError as Error);
              toast.error('Failed to initialize services after multiple attempts');
            }
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeServices();

    return () => {
      if (registryRef.current) {
        registryRef.current.cleanup();
        registryRef.current.stopHealthMonitoring(); // Stop health monitoring on cleanup
      }
    };
  }, [user]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800/50 backdrop-blur">
        <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-white mb-4">Service Initialization Failed</h2>
          <p className="text-dark-300 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800/50 backdrop-blur">
        <LoadingOverlay message="Initializing services..." />
      </div>
    );
  }

  return (
    <ServiceContext.Provider value={registryRef.current || null}>
      {children}
      {/* New Feature: Service Health Status Indicator */}
      <ServiceHealthStatus />
    </ServiceContext.Provider>
  );
};

// New Component: ServiceHealthStatus.tsx
import React, { useEffect, useState } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { CheckCircle, AlertTriangle, Server } from 'lucide-react';

const ServiceHealthStatus: React.FC = () => {
  const registry = ServiceRegistry.getInstance();
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');

  useEffect(() => {
    const updateHealthStatus = () => {
      const status = registry.getOverallHealth(); // Assume this method exists
      setHealthStatus(status);
    };

    registry.on('healthUpdate', updateHealthStatus);
    updateHealthStatus(); // Initial check

    return () => {
      registry.off('healthUpdate', updateHealthStatus);
    };
  }, [registry]);

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <Server className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case 'healthy':
        return 'All services are running smoothly.';
      case 'degraded':
        return 'Some services are experiencing issues.';
      case 'unhealthy':
        return 'Major service disruptions detected.';
      default:
        return '';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-dark-700 text-white p-3 rounded-lg flex items-center gap-2 shadow-lg">
      {getStatusIcon()}
      <span className="text-sm">{getStatusText()}</span>
    </div>
  );
};

export default ServiceProvider;