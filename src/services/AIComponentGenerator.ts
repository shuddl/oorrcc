import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { parse } from '@babel/parser';
import { OpenAIService } from './OpenAIService';
import { ComplexityAnalyzer } from './analysis/ComplexityAnalyzer';
import { DependencyAnalyzer } from './analysis/DependencyAnalyzer';
import { PatternDetector } from './analysis/PatternDetector';
import { SecurityAnalyzer } from './analysis/SecurityAnalyzer';
import { SecurityScanner } from './SecurityScanner';
import { MLModelService } from './MLModelService';
import { componentPrompts } from '../config/prompts/component.prompts';
import {
  ComponentGenerationRequest,
  ComponentGenerationResult,
  AIError
} from '../types/ai.types';

interface QueuedRequest {
  request: ComponentGenerationRequest;
  resolve: (result: ComponentGenerationResult) => void;
  reject: (error: Error) => void;
}

function getPerf(): Performance {
  if (typeof performance !== 'undefined') {
    return performance;
  }
  const { performance: nodePerf } = require('perf_hooks');
  return nodePerf;
}

export class AIComponentGenerator extends EventEmitter {
  private openai: OpenAIService;
  private complexityAnalyzer: ComplexityAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private patternDetector: PatternDetector;
  private securityAnalyzer: SecurityAnalyzer;
  private securityScanner: SecurityScanner;
  private mlService: MLModelService;
  private generationCache: Map<string, ComponentGenerationResult>;
  private requestQueue: QueuedRequest[] = [];
  private isProcessing = false;
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private activeRequests = 0;

  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    averageGenerationTime: 0,
    totalGenerationTime: 0,
    failedRequests: 0,
    queueLength: 0
  };

  private queueInterval: NodeJS.Timer;

  constructor() {
    super();
    this.openai = new OpenAIService();
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.patternDetector = new PatternDetector();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.securityScanner = new SecurityScanner();
    this.mlService = new MLModelService();
    this.generationCache = new Map();

    // Process queue
    this.queueInterval = setInterval(() => this.processQueue(), 100);

    // Log metrics periodically
    setInterval(() => this.logMetrics(), 60000);
  }

  private logMetrics(): void {
    logger.info('AIComponentGenerator metrics', {
      ...this.metrics,
      cacheSize: this.generationCache.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests
    });
  }

  async generateComponent(request: ComponentGenerationRequest): Promise<ComponentGenerationResult> {
    this.metrics.totalRequests++;
    const perf = getPerf();
    const startTime = perf.now();

    try {
      this.validateRequest(request);

      const cacheKey = this.createCacheKey(request);
      const cached = this.generationCache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        logger.info('Returning cached component', { name: request.name });
        return cached;
      }

      // If concurrency is at capacity, queue
      if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
        this.metrics.queueLength = this.requestQueue.length;
        return new Promise((resolve, reject) => {
          this.requestQueue.push({ request, resolve, reject });
        });
      }

      return await this.processRequest(request);

    } catch (error) {
      this.metrics.failedRequests++;
      throw new AIError('Component generation failed', (error as Error).message, { request });
    } finally {
      const duration = perf.now() - startTime;
      this.updateMetrics(duration);
    }
  }

  private validateRequest(request: ComponentGenerationRequest): void {
    if (!request.name?.trim()) {
      throw new AIError('Component name is required');
    }
    if (!request.type || !['functional', 'class'].includes(request.type)) {
      throw new AIError('Invalid component type');
    }
    if (!request.description?.trim()) {
      throw new AIError('Component description is required');
    }
    if (!/^[A-Z][A-Za-z0-9]*$/.test(request.name)) {
      throw new AIError('Component name must be in PascalCase');
    }
  }

  private async processRequest(request: ComponentGenerationRequest): Promise<ComponentGenerationResult> {
    this.activeRequests++;
    const perf = getPerf();
    const startTime = perf.now();

    try {
      // Generate various files in parallel
      const [componentCode, types, tests, documentation] = await Promise.all([
        this.generateComponentCode(request),
        this.generateTypes(request),
        this.generateTests(request),
        this.generateDocumentation(request)
      ]);

      // Consolidate
      const files = new Map<string, string>();
      files.set(`${request.name}.tsx`, componentCode);
      if (types) files.set(`${request.name}.types.ts`, types);
      if (tests) files.set(`${request.name}.test.tsx`, tests);
      if (documentation) files.set(`${request.name}.md`, documentation);

      // Analyze the main code in parallel
      const codeAnalysis = this.complexityAnalyzer.analyzeComplexity(
        parse(componentCode, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        })
      );
      const dependencies = await this.dependencyAnalyzer.analyzeDependencies(
        parse(componentCode, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        })
      );
      const securityScan = await this.securityScanner.scanCode(componentCode);
      const accessibility = await this.mlService.analyzeAccessibility(componentCode);

      const result: ComponentGenerationResult = {
        files,
        analysis: {
          accessibility,
          performance: { score: 1, metrics: { renderTime: 0, bundleSize: 0 } },
          security: securityScan,
          dependencies: dependencies,
          complexity: {
            cyclomatic: codeAnalysis.cyclomaticComplexity,
            maintainability: codeAnalysis.maintainabilityIndex
          }
        }
      };

      // Cache result
      const cacheKey = this.createCacheKey(request);
      this.generationCache.set(cacheKey, result);

      this.emit('componentGenerated', {
        name: request.name,
        result,
        duration: getPerf().now() - startTime
      });
      return result;

    } finally {
      this.activeRequests--;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.requestQueue.length === 0) return;
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) return;

    this.isProcessing = true;
    const queued = this.requestQueue.shift();
    if (!queued) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await this.processRequest(queued.request);
      queued.resolve(result);
    } catch (err) {
      queued.reject(err as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async generateComponentCode(request: ComponentGenerationRequest): Promise<string> {
    try {
      const prompt = await this.buildEnhancedPrompt(request);
      const response = await this.openai.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 4000,
        frequencyPenalty: 0.3,
        presencePenalty: 0.3
      });
      const code = this.formatCode(response);

      // Minimal security check
      const secResult = await this.securityScanner.scanCode(code);
      if (!secResult.passed) {
        throw new AIError('Security issues found in generated code', 'SECURITY_ERROR');
      }
      return code;

    } catch (error) {
      logger.error('generateComponentCode failed', { error, request });
      throw error;
    }
  }

  private async generateTypes(request: ComponentGenerationRequest): Promise<string> {
    // Stub for generating TypeScript definitions
    if (request.type === 'functional') {
      return `export interface ${request.name}Props {\n  // add props here\n}`;
    }
    return '';
  }

  private async generateTests(request: ComponentGenerationRequest): Promise<string> {
    // Stub for generating test files
    return `import { render } from '@testing-library/react';\n` +
           `import { ${request.name} } from './${request.name}';\n\n` +
           `test('renders ${request.name} without crashing', () => {\n` +
           `  const { container } = render(<${request.name} />);\n` +
           `  expect(container).toBeInTheDocument();\n` +
           `});\n`;
  }

  private async generateDocumentation(request: ComponentGenerationRequest): Promise<string> {
    return `# ${request.name}\n\n` +
           `**Description**: ${request.description}\n\n` +
           `## Usage\n\`\`\`jsx\n<${request.name} />\n\`\`\`\n`;
  }

  private async buildEnhancedPrompt(request: ComponentGenerationRequest): Promise<string> {
    const projectContext = {}; // Stub; could fetch from some config
    return `
${componentPrompts.base}

Component Requirements:
${JSON.stringify(request, null, 2)}

Project Context:
${JSON.stringify(projectContext, null, 2)}

Technical Requirements:
- TypeScript strict
- React Hooks if functional
- Minimal security vulnerabilities
- Enough comments for clarity

`;
  }

  private formatCode(code: string): string {
    // Could integrate prettier or other library
    return code.trim();
  }

  private createCacheKey(request: ComponentGenerationRequest): string {
    return `${request.name}_${request.type}_${(request.description || '').slice(0, 50)}`;
  }

  private updateMetrics(duration: number): void {
    this.metrics.totalGenerationTime += duration;
    const successCount = Math.max(1, this.metrics.totalRequests - this.metrics.failedRequests);
    this.metrics.averageGenerationTime = this.metrics.totalGenerationTime / successCount;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests,
      cacheHitRate: this.metrics.cacheHits / this.metrics.totalRequests,
      averageQueueLength: this.metrics.queueLength / this.metrics.totalRequests
    };
  }

  clearCache(): void {
    this.generationCache.clear();
    logger.info('AIComponentGenerator cache cleared');
  }

  terminate(): void {
    this.mlService.terminate();
    this.removeAllListeners();
    this.clearCache();
    clearInterval(this.queueInterval);
    logger.info('AIComponentGenerator terminated');
  }
}