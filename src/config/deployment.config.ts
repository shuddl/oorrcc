import { BuildConfig, EnvironmentConfig, MonitoringConfig } from '../types/deployment.types';

export const deploymentConfig = {
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    target: 'es2020',
    cssMinify: true,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ai-vendor': ['openai'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  } as BuildConfig,

  environments: {
    production: {
      apiUrl: process.env.VITE_API_URL,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
      aiConfig: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 4000
      },
      cache: {
        maxAge: 3600,
        staleWhileRevalidate: 7200
      }
    },
    staging: {
      apiUrl: process.env.VITE_STAGING_API_URL,
      supabaseUrl: process.env.VITE_STAGING_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_STAGING_SUPABASE_ANON_KEY,
      aiConfig: {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 4000
      }
    }
  } as EnvironmentConfig,

  monitoring: {
    errorReporting: true,
    performanceMonitoring: true,
    analyticsEnabled: true,
    sentry: {
      dsn: process.env.VITE_SENTRY_DSN,
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    },
    metrics: {
      collectCoreWebVitals: true,
      collectCustomMetrics: true,
      reportingEndpoint: '/api/metrics'
    },
    logging: {
      level: 'error',
      console: false,
      remote: true
    }
  } as MonitoringConfig
};
