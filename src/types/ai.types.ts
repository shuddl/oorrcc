import { z } from 'zod';
import { ProductSpec, ModuleAnalysis } from './ProductSpec';

/**
 * Custom error class for AI-related errors with additional context
 */
export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

// AI Configuration Types
export interface AIConfigType {
  model: {
    name: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  memory: {
    maxContextSize: number;
    chunkSize: number;
    overlapSize: number;
    maxConcurrentChunks: number;
  };
  streaming: {
    enabled: boolean;
    chunkSize: number;
    maxChunksPerSecond: number;
  };
  retry: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
  rateLimit: {
    maxRequestsPerMinute: number;
    maxTokensPerMinute: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    errorThreshold: number;
  };
}

// Request/Response Types
export interface AIRequestConfig {
  stream?: boolean;
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    model: string;
    finishReason: string;
  };
}

export interface ProcessingResult {
  original: string;
  optimized: string;
  analysis: {
    complexity: any;
    dependencies: any;
    patterns: any;
  };
  security: any;
  performance: {
    score: number;
    timeComplexity: string;
    spaceComplexity: string;
    optimizationPotential: number;
    metrics: {
      loadTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
}

export interface OrchestratorMetrics {
  processedFiles: number;
  totalErrors: number;
  averageProcessingTime: number;
  cacheHits: number;
  cacheMisses: number;
  securityIssuesFound: number;
  complexityScore: number;
}

export interface ComponentGenerationRequest {
  name: string;
  type: 'functional' | 'class';
  description: string;
  features: string[];
  styling: {
    framework: string;
    theme: {
      primaryColor: string;
      secondaryColor: string;
    };
  };
  state: {
    type: string;
    schema: Record<string, any>;
  };
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  dependencies: string[];
}

export interface ComponentGenerationResult {
  files: Map<string, string>;
}