import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../services/PerformanceMonitor';
import { AIService } from '../../services/AIService';
import { AIComponentGenerator } from '../../services/AIComponentGenerator';
import { Logger } from '../../utils/logger';
import { ComponentGenerationRequest } from '../../types/ai.types';
import * as os from 'os';

describe('AI Performance Tests', () => {
  let aiService: AIService;
  let componentGenerator: AIComponentGenerator;
  let perfMonitor: PerformanceMonitor;
  let logger: Logger;

  // Performance thresholds aligned with ProductSpec validation_protocol
  const THRESHOLDS = {
    singleRequestMs: 200,
    batchRequestMs: 1000,
    memoryUsageMB: 512,
    cpuUsagePercent: 80,
    errorRate: 0.01, // 1%
    minAccessibilityScore: 0.8,
    minPerformanceScore: 0.85,
    maxComplexity: 15
  };

  beforeAll(async () => {
    aiService = new AIService();
    componentGenerator = new AIComponentGenerator();
    perfMonitor = new PerformanceMonitor();
    logger = new Logger();
    
    // Log test environment
    logger.info('Test Environment:', {
      node: process.version,
      cpu: os.cpus()[0].model,
      cores: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
      env: process.env.NODE_ENV
    });
  });

  beforeEach(async () => {
    await perfMonitor.reset();
    perfMonitor.startTracking();
  });

  // Helper functions
  const calculateStats = (measurements: number[]) => {
    measurements.sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);
    const mean = sum / measurements.length;
    const median = measurements[Math.floor(measurements.length / 2)];
    const p95 = measurements[Math.floor(measurements.length * 0.95)];
    const p99 = measurements[Math.floor(measurements.length * 0.99)];
    const stdDev = Math.sqrt(
      measurements.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / measurements.length
    );

    return { mean, median, p95, p99, stdDev };
  };

  const measureMemoryUsage = () => {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
    };
  };

  describe('Basic AI Operations', () => {
    test('Single request baseline performance', async () => {
      const start = performance.now();
      const response = await aiService.process('test query');
      const duration = performance.now() - start;

      const memoryUsage = measureMemoryUsage();
      const cpuUsage = perfMonitor.getCPUUsage();

      expect(duration).toBeLessThan(THRESHOLDS.singleRequestMs);
      expect(memoryUsage.heapUsed).toBeLessThan(THRESHOLDS.memoryUsageMB);
      expect(cpuUsage).toBeLessThan(THRESHOLDS.cpuUsagePercent);
      expect(response).toBeDefined();
      
      // Log performance metrics
      logger.info('Single Request Performance:', {
        duration,
        memoryUsage,
        cpuUsage
      });
    });

    test('Component generation performance', async () => {
      const request: ComponentGenerationRequest = {
        name: 'TestButton',
        description: 'A simple button component',
        features: ['loading', 'disabled'],
        styling: {
          framework: 'tailwind'
        }
      };

      const startMemory = measureMemoryUsage();
      const startCPU = perfMonitor.getCPUUsage();
      
      const start = performance.now();
      const result = await componentGenerator.generateComponent(request);
      const duration = performance.now() - start;

      const endMemory = measureMemoryUsage();
      const endCPU = perfMonitor.getCPUUsage();

      expect(duration).toBeLessThan(THRESHOLDS.singleRequestMs * 2);
      expect(result.analysis.complexity).toBeLessThan(THRESHOLDS.maxComplexity);
      expect(result.analysis.performance.score).toBeGreaterThan(THRESHOLDS.minPerformanceScore);

      logger.info('Component Generation Performance:', {
        duration,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        },
        cpuDelta: endCPU - startCPU,
        complexity: result.analysis.complexity
      });
    });
  });

  describe('Batch Processing', () => {
    test('Batch processing efficiency', async () => {
      const batchSize = 100;
      const requests = Array(batchSize).fill('test query');
      const durations: number[] = [];

      const start = performance.now();
      const results = await Promise.all(
        requests.map(async (req) => {
          const reqStart = performance.now();
          const result = await aiService.process(req);
          durations.push(performance.now() - reqStart);
          return result;
        })
      );
      const totalDuration = performance.now() - start;

      const stats = calculateStats(durations);
      const errors = results.filter((r) => r.error).length;

      expect(totalDuration).toBeLessThan(THRESHOLDS.batchRequestMs * batchSize);
      expect(errors / batchSize).toBeLessThan(THRESHOLDS.errorRate);
      expect(stats.p95).toBeLessThan(THRESHOLDS.batchRequestMs);

      logger.info('Batch Processing Stats:', {
        ...stats,
        totalDuration,
        errorRate: errors / batchSize
      });
    });
  });

  describe('Load Testing', () => {
    test('Handles increasing load gracefully', async () => {
      const loadTests = [100, 1000, 10000];

      for (const numRequests of loadTests) {
        const durations: number[] = [];
        const startMemory = measureMemoryUsage();
        const startCPU = perfMonitor.getCPUUsage();

        // Execute requests in batches to prevent memory issues
        const batchSize = 100;
        for (let i = 0; i < numRequests; i += batchSize) {
          const batch = Array(Math.min(batchSize, numRequests - i))
            .fill('test query')
            .map(async (req) => {
              const start = performance.now();
              try {
                await aiService.process(req);
                durations.push(performance.now() - start);
              } catch (error) {
                logger.error('Request failed:', error);
              }
            });

          await Promise.all(batch);
        }

        const endMemory = measureMemoryUsage();
        const endCPU = perfMonitor.getCPUUsage();
        const stats = calculateStats(durations);

        logger.info(`Load Test Results (${numRequests} requests):`, {
          stats,
          memoryDelta: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          },
          cpuDelta: endCPU - startCPU,
        });

        // Assertions
        expect(stats.p95).toBeLessThan(THRESHOLDS.singleRequestMs * 2);
        expect(endMemory.heapUsed - startMemory.heapUsed).toBeLessThan(
          THRESHOLDS.memoryUsageMB
        );
        expect(endCPU - startCPU).toBeLessThan(THRESHOLDS.cpuUsagePercent);
      }
    });
  });

  describe('Error Handling', () => {
    test('Handles errors gracefully under load', async () => {
      const errorRequests = [
        { input: '', expectedError: 'EmptyInput' },
        { input: 'invalid_query', expectedError: 'InvalidQuery' },
        { input: 'x'.repeat(1000000), expectedError: 'InputTooLarge' },
      ];

      for (const { input, expectedError } of errorRequests) {
        const start = performance.now();
        try {
          await aiService.process(input);
          fail('Should have thrown an error');
        } catch (error: any) {
          const duration = performance.now() - start;
          
          expect(error.code).toBe(expectedError);
          expect(duration).toBeLessThan(THRESHOLDS.singleRequestMs);
          
          // Verify system stability after error
          const memoryUsage = measureMemoryUsage();
          const cpuUsage = perfMonitor.getCPUUsage();
          
          expect(memoryUsage.heapUsed).toBeLessThan(THRESHOLDS.memoryUsageMB);
          expect(cpuUsage).toBeLessThan(THRESHOLDS.cpuUsagePercent);

          logger.info(`Error Handling Test (${expectedError}):`, {
            duration,
            memoryUsage,
            cpuUsage
          });
        }
      }
    });
  });

  afterEach(async () => {
    await perfMonitor.collectMetrics();
    perfMonitor.stopTracking();
  });

  afterAll(async () => {
    await logger.flush();
    await perfMonitor.shutdown();
  });
});
