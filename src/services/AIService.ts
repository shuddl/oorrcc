// src/services/AIService.ts

import { EventEmitter } from '../lib/events';
import { RateLimiter } from '../middleware/RateLimiter';
import { AI_CONFIG } from '../config/ai.config';
import { logger } from '../utils/logger';
import { componentPrompts } from '../config/prompts/component.prompts';
import { OpenAIService } from './OpenAIService';

import type {
  AIRequestConfig,
  AIResponse,
  AIError as TAIError,
  ComponentGenerationRequest,
  ComponentGenerationResult
} from '../types/ai.types';

import { ComplexityAnalyzer } from './analysis/ComplexityAnalyzer';
import { DependencyAnalyzer } from './analysis/DependencyAnalyzer';
import { PatternDetector } from './analysis/PatternDetector';
import { SecurityAnalyzer } from './analysis/SecurityAnalyzer';
import { CacheManager } from './analysis/CacheManager';

import { AIError } from '../types/ai.types';

export class AIService extends EventEmitter {
  private openai: OpenAIService;
  private rateLimiter: RateLimiter;
  private retryDelay: number;
  private complexityAnalyzer: ComplexityAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private patternDetector: PatternDetector;
  private securityAnalyzer: SecurityAnalyzer;
  private cacheManager: CacheManager;
  private readonly MAX_RETRIES: number;

  constructor() {
    super();

    // Basic environment check
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    // Initialize core services
    this.openai = new OpenAIService();
    this.rateLimiter = new RateLimiter({
      windowMs: 60_000,
      max: 50
    });
    this.retryDelay = AI_CONFIG.retry?.initialDelay || 1000;
    this.MAX_RETRIES = AI_CONFIG.retry?.maxAttempts || 3;

    // Analysis / security
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.patternDetector = new PatternDetector();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.cacheManager = new CacheManager();
  }

  async process(input: string, config?: AIRequestConfig): Promise<AIResponse> {
    try {
      await this.validateInput(input);
      await this.checkRateLimit();

      const response = await this.executeWithRetry(async () => {
        return this.openai.generateCompletion(input, {
          ...AI_CONFIG,
          ...config,
          stream: config?.stream || false
        });
      });

      return this.formatResponse(response);
    } catch (error: any) {
      logger.error('AI processing failed', { error, input });
      throw this.handleAIError(error);
    }
  }

  async generateComponent(
    request: ComponentGenerationRequest
  ): Promise<ComponentGenerationResult> {
    try {
      const prompt = await this.buildEnhancedComponentPrompt(request);
      const response = await this.executeWithRetry(async () => {
        return this.openai.generateCompletion(prompt, {
          temperature: 0.7,
          maxTokens: 2000,
          frequencyPenalty: 0.3,
          presencePenalty: 0.3
        });
      });

      return await this.parseComponentResponse(response, request);
    } catch (error: any) {
      logger.error('Component generation failed', { error, request });
      throw this.handleAIError(error);
    }
  }

  /**
   * New Feature:
   * Inspect a code snippet with ComplexityAnalyzer & SecurityAnalyzer
   * to get advanced analysis. This does not cause major cascading changes.
   */
  public async inspectSnippet(code: string) {
    const complexity = this.complexityAnalyzer.analyzeComplexity(this.parseAST(code));
    const security = await this.securityAnalyzer.scanCode(code);
    const patterns = await this.patternDetector.detectPatterns(this.parseAST(code));

    logger.info('Snippet inspection complete', {
      complexity,
      security,
      patterns
    });
    return { complexity, security, patterns };
  }

  private async validateInput(input: string): Promise<void> {
    if (!input.trim()) {
      throw new AIError('Empty input provided');
    }
    if (input.length > (AI_CONFIG.contextWindow?.maxSize || 4096)) {
      throw new AIError('Input exceeds maximum length');
    }
  }

  private async checkRateLimit(): Promise<void> {
    const mockReq = { ip: '127.0.0.1' } as any;
    const mockRes = { status: () => ({ json: () => {} }) } as any;

    return new Promise((resolve, reject) => {
      this.rateLimiter.middleware(mockReq, mockRes, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempts = 0;
    let lastError: any = null;

    while (attempts < this.MAX_RETRIES) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        attempts++;

        // Retry on rate limits or networkish errors
        if (err.status === 429 || err.code === 'ETIMEDOUT') {
          const delay = Math.min(
            this.retryDelay * Math.pow(2, attempts - 1),
            AI_CONFIG.retry?.maxDelay || 5000
          );
          await new Promise((res) => setTimeout(res, delay));
        } else {
          break;
        }
      }
    }
    throw lastError || new Error('Maximum retry attempts reached');
  }

  private parseAST(code: string): any {
    // In real code, you'd parse with Babel or @typescript-eslint parser,
    // returning an AST object. This is simplified:
    return {};
  }

  private async buildEnhancedComponentPrompt(
    request: ComponentGenerationRequest
  ): Promise<string> {
    const basePrompt = componentPrompts.base;
    const accessibilityPrompt = request.context?.requirements?.accessibility
      ? componentPrompts.accessibility
      : '';
    const performancePrompt = componentPrompts.performance;

    return `
${basePrompt}

Component Specifications:
Name: ${request.name}
Description: ${request.description}
Type: ${request.type}
Features: ${request.features?.join(', ') || 'None specified'}
Styling Framework: ${request.styling?.framework || 'None specified'}

Technical Requirements:
${this.buildTechnicalRequirements(request)}

${accessibilityPrompt}

${performancePrompt}

Additional Context:
${this.buildAdditionalContext(request)}

Generate production-ready code following best practices and including all necessary types, tests, and documentation.
`;
  }

  private buildTechnicalRequirements(
    request: ComponentGenerationRequest
  ): string {
    return `
- TypeScript: ${request.context?.requirements?.typescript ? 'Required' : 'Optional'}
- Testing: ${request.context?.requirements?.testing ? 'Required' : 'Optional'}
- Dependencies: ${request.context?.dependencies?.join(', ') || 'None'}
- Existing Components: ${request.context?.existingComponents?.join(', ') || 'None'}
`.trim();
  }

  private buildAdditionalContext(request: ComponentGenerationRequest): string {
    return `
- State Management: Use React hooks and context
- Error Handling: Comprehensive error boundaries
- Performance: Consider memoization and code splitting
- Documentation: JSDoc + usage examples
- Accessibility: WCAG 2.1 AA compliance
- Testing: Unit + integration tests
`.trim();
  }

  private async parseComponentResponse(
    response: string,
    request: ComponentGenerationRequest
  ): Promise<ComponentGenerationResult> {
    const sections = response.split('===');
    const componentCode = sections[0]?.trim() || '';

    return {
      code: componentCode,
      tests: this.extractTestCode(sections),
      types: this.extractTypeDefinitions(sections),
      documentation: this.generateDocumentation(request, componentCode),
      analysis: await this.analyzeGeneratedCode(componentCode)
    };
  }

  private extractTestCode(sections: string[]): string {
    return sections.find((s) => s.includes('test(')) || '';
  }

  private extractTypeDefinitions(sections: string[]): string {
    return sections.find(
      (s) => s.includes('interface') || s.includes('type')
    ) || '';
  }

  private generateDocumentation(
    request: ComponentGenerationRequest,
    code: string
  ): string {
    return `## Documentation for ${request.name}
Automatically generated. For demonstration. The code:
\`\`\`ts
${code.slice(0, 300)}...
\`\`\`
    `;
  }

  private async analyzeGeneratedCode(code: string): Promise<
    ComponentGenerationResult['analysis']
  > {
    // In real code, integrate actual analysis services
    return {
      complexity: 1,
      accessibility: { score: 1, issues: [] },
      performance: { score: 1, metrics: { renderTime: 0, bundleSize: 0 } },
      security: { score: 1, issues: [] }
    };
  }

  private formatResponse(response: string): AIResponse {
    return {
      text: response,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      metadata: {
        model: AI_CONFIG.model.name,
        finishReason: 'stop'
      }
    };
  }

  private handleAIError(error: any): AIError {
    const aiError = new AIError(error.message);
    aiError.code = error.code || 'UNKNOWN_ERROR';
    aiError.status = error.status;

    if (error.status === 429) {
      aiError.code = 'RATE_LIMIT_EXCEEDED';
      aiError.retryAfter = parseInt(error.headers?.['retry-after'] || '60');
    }

    return aiError;
  }
}