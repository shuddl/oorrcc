import { AIConfigType } from '../types/ai.types';

export const AI_CONFIG: AIConfigType = {
  model: {
    name: 'gpt-4-turbo-preview',
    temperature: 0.8,
    maxTokens: 4096,
    topP: 1,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3
  },
  memory: {
    maxContextSize: 128000,
    chunkSize: 4096,
    overlapSize: 200,
    maxConcurrentChunks: 3
  },
  streaming: {
    enabled: true,
    chunkSize: 1024,
    maxChunksPerSecond: 10
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  },
  rateLimit: {
    maxRequestsPerMinute: 50,
    maxTokensPerMinute: 100000
  },
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 1000
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    errorThreshold: 0.1
  }
};