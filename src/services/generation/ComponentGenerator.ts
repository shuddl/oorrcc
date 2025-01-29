// src/services/ComponentGenerator.ts

import { EventEmitter } from '../../lib/events';
import { logger } from '../../utils/logger';
import { OpenAIService } from './OpenAIService';
import {
  AIRequestConfig,
  AIResponse,
  AIError,
  ComponentGenerationRequest,
  ComponentGenerationResult,
  GenerationOptions,
  ComponentTemplate
} from '../types/ai.types';
import { ComplexityAnalyzer } from './analysis/ComplexityAnalyzer';
import { DependencyAnalyzer } from './analysis/DependencyAnalyzer';
import { PatternDetector } from './analysis/PatternDetector';
import { SecurityAnalyzer } from './analysis/SecurityAnalyzer';
import { CacheManager } from './analysis/CacheManager';

export class ComponentGenerator extends EventEmitter {
  private openai: OpenAIService;
  private complexityAnalyzer: ComplexityAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private patternDetector: PatternDetector;
  private securityAnalyzer: SecurityAnalyzer;
  private cacheManager: CacheManager;

  constructor() {
    super();
    this.openai = new OpenAIService();
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.patternDetector = new PatternDetector();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.cacheManager = new CacheManager();
  }

  /**
   * Generates a React component based on the provided request and options.
   * @param request ComponentGenerationRequest
   * @param options GenerationOptions
   * @returns ComponentGenerationResult
   */
  async generateComponent(
    request: ComponentGenerationRequest,
    options: GenerationOptions = {}
  ): Promise<ComponentGenerationResult> {
    try {
      // Validate request
      this.validateRequest(request);

      // Check cache
      const cacheKey = this.createCacheKey(request);
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        logger.info('Returning cached component', { name: request.name });
        return cached;
      }

      logger.info('Starting component generation', { request });

      // Generate all files in parallel
      const [
        componentCode,
        types,
        tests,
        story,
        documentation
      ] = await Promise.all([
        this.generateComponentCode(request),
        options.typescript ? this.generateTypes(request) : null,
        options.testing ? this.generateTests(request) : null,
        options.storybook ? this.generateStory(request) : null,
        options.documentation ? this.generateDocumentation(request) : null
      ]);

      // Create files map
      const files = new Map<string, string>();
      files.set(`${request.name}.tsx`, componentCode);
      if (types) files.set(`${request.name}.types.ts`, types);
      if (tests) files.set(`${request.name}.test.tsx`, tests);
      if (story) files.set(`${request.name}.stories.tsx`, story);
      if (documentation) files.set(`${request.name}.md`, documentation);

      // Analyze generated code
      const [accessibility, performance, security] = await Promise.all([
        this.securityAnalyzer.analyzeAccessibility(componentCode),
        this.complexityAnalyzer.analyzeComplexity(componentCode),
        this.dependencyAnalyzer.analyzeDependencies(componentCode)
      ]);

      // Create result
      const result: ComponentGenerationResult = {
        files,
        analysis: {
          accessibility,
          performance,
          security,
          dependencies: security.dependencies, // Adjust based on actual analysis results
          complexity: performance.cyclomaticComplexity
        }
      };

      // Optimize if needed
      if (options.optimization && result.analysis.performance.score < 0.8) {
        const optimizedCode = await this.optimizeComponent(
          componentCode,
          result.analysis
        );
        files.set(`${request.name}.tsx`, optimizedCode);
      }

      // Cache result
      this.cacheManager.set(cacheKey, result);

      // Emit completion event
      this.emit('componentGenerated', {
        name: request.name,
        result
      });

      logger.info('Component generation completed', {
        name: request.name,
        fileCount: files.size,
        performance: result.analysis.performance.score
      });

      return result;
    } catch (error) {
      const generationError = new AIError(
        'Component generation failed',
        error instanceof Error ? error.message : 'Unknown error',
        { request }
      );
      this.emit('error', generationError);
      throw generationError;
    }
  }

  /**
   * Validates the component generation request.
   * @param request ComponentGenerationRequest
   */
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

  /**
   * Generates the main component code.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private async generateComponentCode(request: ComponentGenerationRequest): Promise<string> {
    const prompt = this.buildComponentPrompt(request);
    const response = await this.openai.generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3
    });
    return this.formatCode(response);
  }

  /**
   * Generates TypeScript types for the component.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private async generateTypes(request: ComponentGenerationRequest): Promise<string> {
    const prompt = `Generate TypeScript types for the following component:
${JSON.stringify(request, null, 2)}

Include:
- Props interface with JSDoc comments
- State types
- Event handler types
- Utility types
- Strict type safety
`;
    const response = await this.openai.generateCompletion(prompt);
    return this.formatCode(response);
  }

  /**
   * Generates test files for the component.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private async generateTests(request: ComponentGenerationRequest): Promise<string> {
    const prompt = `Generate comprehensive tests for this React component:
${JSON.stringify(request, null, 2)}

Include tests for:
- Component rendering
- Props validation
- User interactions
- State management
- Error handling
- Accessibility compliance
- Performance benchmarks
- Edge cases
`;
    const response = await this.openai.generateCompletion(prompt);
    return this.formatCode(response);
  }

  /**
   * Generates a Storybook story for the component.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private async generateStory(request: ComponentGenerationRequest): Promise<string> {
    const prompt = `Generate a Storybook story for this component:
${JSON.stringify(request, null, 2)}

Include:
- Default story
- All prop variations
- Interactive controls
- Documentation
- Usage examples
- Accessibility notes
- Performance considerations
`;
    const response = await this.openai.generateCompletion(prompt);
    return this.formatCode(response);
  }

  /**
   * Generates comprehensive documentation for the component.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private async generateDocumentation(request: ComponentGenerationRequest): Promise<string> {
    const prompt = `Generate comprehensive documentation for this component:
${JSON.stringify(request, null, 2)}

Include:
- Component overview
- Props documentation
- Usage examples
- Best practices
- Performance considerations
- Accessibility notes
- Browser compatibility
- Known issues
`;
    const response = await this.openai.generateCompletion(prompt);
    return this.formatCode(response);
  }

  /**
   * Optimizes the generated component code based on analysis.
   * @param code string
   * @param analysis any
   * @returns string
   */
  private async optimizeComponent(
    code: string,
    analysis: ComponentGenerationResult['analysis']
  ): Promise<string> {
    const prompt = `Optimize this React component for better performance:
${code}

Current metrics:
${JSON.stringify(analysis, null, 2)}

Implement these optimizations:
- Memoization (useMemo, useCallback)
- Render optimization
- State management efficiency
- Event handling optimization
- Resource cleanup
- Code splitting
`;
    const response = await this.openai.generateCompletion(prompt);
    return this.formatCode(response);
  }

  /**
   * Builds the prompt for component generation.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private buildComponentPrompt(request: ComponentGenerationRequest): string {
    return `
${componentPrompts.base}

Component Specifications:
${JSON.stringify(request, null, 2)}

${request.styling?.framework === 'tailwind' ? componentPrompts.tailwind : ''}
${request.features?.includes('accessibility') ? componentPrompts.accessibility : ''}
${componentPrompts.performance}
${componentPrompts.patterns}
`;
  }

  /**
   * Formats the AI response by removing unwanted characters or formatting.
   * @param code string
   * @returns string
   */
  private formatCode(code: string): string {
    // Remove markdown code blocks if present
    code = code.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
    return code.trim();
  }

  /**
   * Creates a unique cache key based on the component request.
   * @param request ComponentGenerationRequest
   * @returns string
   */
  private createCacheKey(request: ComponentGenerationRequest): string {
    return `${request.name}_${JSON.stringify(request)}`;
  }

  /**
   * Terminates the ComponentGenerator service, cleaning up resources.
   */
  terminate(): void {
    this.cacheManager.clear();
    this.removeAllListeners();
    logger.info('Component generator terminated');
  }
}