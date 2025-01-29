import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';
import { logger } from '../utils/logger';
import { SecurityScanner } from './SecurityScanner';
import { ParallelProcessor } from './ParallelProcessor';
import { MemoryManager } from './memory/MemoryManager';

export interface CodeAnalysisResult {
  quality: {
    score: number;
    issues: Array<{
      severity: 'low' | 'medium' | 'high';
      message: string;
      location?: string;
      rule?: string;
      fix?: string;
    }>;
  };
  security: {
    score: number;
    vulnerabilities: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
  };
  performance: {
    score: number;
    metrics: {
      complexity: number;
      maintainability: number;
      reliability: number;
      bundleSize: number;
      renderTime: number;
      memoryUsage: number;
    };
    suggestions: string[];
  };
  dependencies: {
    outdated: string[];
    security: string[];
    unused: string[];
    circular: string[][];
    size: Record<string, number>;
  };
}

export class CodeAnalyzer {
  private securityScanner: SecurityScanner;
  private parallelProcessor: ParallelProcessor;
  private memoryManager: MemoryManager;
  private eslint: ESLint;
  private analysisCache: Map<string, { result: CodeAnalysisResult; timestamp: number }>;
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes
  private readonly MAX_CONCURRENT_ANALYSES = 3;
  private activeAnalyses = 0;
  private analysisQueue: Array<{
    code: string;
    resolve: (result: CodeAnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor() {
    this.securityScanner = new SecurityScanner();
    this.parallelProcessor = new ParallelProcessor();
    this.memoryManager = new MemoryManager({
      maxContextSize: 128000,
      chunkSize: 4096,
      overlapSize: 200,
      maxConcurrentChunks: 3
    });
    this.eslint = new ESLint({
      useEslintrc: false,
      baseConfig: {
        extends: [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended',
          'plugin:react/recommended',
          'plugin:react-hooks/recommended'
        ],
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
          ecmaFeatures: { jsx: true }
        }
      }
    });
    this.analysisCache = new Map();

    // Clean cache periodically
    setInterval(() => this.cleanCache(), this.CACHE_TTL);
  }

  async analyzeCode(code: string): Promise<CodeAnalysisResult> {
    try {
      // Check cache
      const cacheKey = this.generateCacheKey(code);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Queue if at capacity
      if (this.activeAnalyses >= this.MAX_CONCURRENT_ANALYSES) {
        return new Promise((resolve, reject) => {
          this.analysisQueue.push({ code, resolve, reject });
        });
      }

      this.activeAnalyses++;

      // Allocate memory
      const memoryRequirement = code.length * 2; // Rough estimate
      const memoryAllocated = await this.memoryManager.allocateMemory(
        cacheKey,
        memoryRequirement
      );

      if (!memoryAllocated) {
        throw new Error('Insufficient memory for analysis');
      }

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      // Parallel analysis
      const [
        lintResults,
        securityResults,
        complexityMetrics,
        eslintResults,
        dependencyResults
      ] = await Promise.all([
        this.runLintAnalysis(ast),
        this.securityScanner.scanCode(code),
        this.analyzeComplexity(ast),
        this.eslint.lintText(code),
        this.analyzeDependencies(ast)
      ]);

      const performanceMetrics = await this.analyzePerformance(code);
      const qualityScore = this.calculateQualityScore(lintResults, complexityMetrics);
      const performanceScore = this.calculatePerformanceScore(performanceMetrics);

      const result: CodeAnalysisResult = {
        quality: {
          score: qualityScore,
          issues: [
            ...this.formatLintIssues(lintResults),
            ...this.formatESLintIssues(eslintResults)
          ]
        },
        security: {
          score: securityResults.score,
          vulnerabilities: securityResults.issues
        },
        performance: {
          score: performanceScore,
          metrics: performanceMetrics,
          suggestions: [
            ...this.generatePerformanceSuggestions(complexityMetrics),
            ...this.generateOptimizationSuggestions(ast)
          ]
        },
        dependencies: dependencyResults
      };

      // Cache result
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Code analysis failed', { error });
      throw error;
    } finally {
      this.activeAnalyses--;
      this.processQueue();
      this.memoryManager.releaseMemory(cacheKey);
    }
  }

  private async processQueue() {
    if (this.activeAnalyses >= this.MAX_CONCURRENT_ANALYSES) return;
    
    const next = this.analysisQueue.shift();
    if (next) {
      try {
        const result = await this.analyzeCode(next.code);
        next.resolve(result);
      } catch (error) {
        next.reject(error as Error);
      }
    }
  }

  private generateCacheKey(code: string): string {
    return `analysis_${code.slice(0, 100)}`;
  }

  private getFromCache(key: string): CodeAnalysisResult | null {
    const cached = this.analysisCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.analysisCache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  private setCache(key: string, result: CodeAnalysisResult): void {
    this.analysisCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.analysisCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.analysisCache.delete(key);
      }
    }
  }

  private formatESLintIssues(results: ESLint.LintResult[]): Array<{
    severity: 'low' | 'medium' | 'high';
    message: string;
    location?: string;
    rule?: string;
    fix?: string;
  }> {
    return results.flatMap(result =>
      result.messages.map(msg => ({
        severity: this.mapESLintSeverity(msg.severity),
        message: msg.message,
        location: `Line ${msg.line}, Column ${msg.column}`,
        rule: msg.ruleId || undefined,
        fix: msg.fix ? generate(msg.fix.text).code : undefined
      }))
    );
  }

  private mapESLintSeverity(severity: number): 'low' | 'medium' | 'high' {
    switch (severity) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      default: return 'medium';
    }
  }

  private generateOptimizationSuggestions(ast: any): string[] {
    const suggestions: string[] = [];
    
    traverse(ast, {
      // Check for unoptimized React patterns
      JSXElement(path) {
        const props = path.node.openingElement.attributes;
        if (props.some(p => p.type === 'JSXSpreadAttribute')) {
          suggestions.push('Consider explicitly declaring props instead of spreading');
        }
      },
      
      // Check for potential memory leaks
      useEffect(path) {
        if (!path.node.cleanup) {
          suggestions.push('Add cleanup function to useEffect to prevent memory leaks');
        }
      },
      
      // Check for expensive computations
      CallExpression(path) {
        if (path.node.callee.name === 'useState' && 
            path.node.arguments[0]?.type === 'ArrowFunctionExpression') {
          suggestions.push('Consider using useMemo for expensive initial state computations');
        }
      }
    });
    
    return suggestions;
  }

  private async runLintAnalysis(ast: any): Promise<any[]> {
    const issues: any[] = [];
    traverse(ast, {
      enter: (path) => {
        this.checkForCommonIssues(path, issues);
      }
    });
    return issues;
  }

  private checkForCommonIssues(path: any, issues: any[]) {
    if (path.isCallExpression() && 
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.name === 'console') {
      issues.push({
        severity: 'medium',
        message: 'Avoid using console statements in production code',
        location: `line ${path.node.loc?.start.line}`
      });
    }

    if (path.isCatchClause() && 
        path.node.body.body.length === 0) {
      issues.push({
        severity: 'high',
        message: 'Empty catch block detected',
        location: `line ${path.node.loc?.start.line}`
      });
    }

    if (path.isTryStatement() && 
        !path.node.handler?.param) {
      issues.push({
        severity: 'medium',
        message: 'Catch clause should handle error parameter',
        location: `line ${path.node.loc?.start.line}`
      });
    }
  }

  private async analyzeComplexity(ast: any) {
    let complexity = 0;
    let maintainability = 100;
    let reliability = 100;

    traverse(ast, {
      enter(path) {
        if (path.isIfStatement() || path.isWhileStatement() || 
            path.isForStatement() || path.isSwitchCase()) {
          complexity++;
          maintainability -= 1;
        }

        if (path.isTryStatement()) {
          reliability += 5;
        }

        if (path.isVariableDeclaration() && !path.node.declarations[0].id.typeAnnotation) {
          maintainability -= 2;
        }
      }
    });

    return {
      complexity,
      maintainability: Math.max(0, maintainability),
      reliability: Math.min(100, reliability),
      bundleSize: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }

  private async analyzeDependencies(ast: any) {
    const imports = new Set<string>();
    traverse(ast, {
      ImportDeclaration(path) {
        imports.add(path.node.source.value);
      }
    });

    return {
      outdated: [],
      security: [],
      unused: Array.from(imports).filter(imp => 
        !ast.program.body.some((node: any) => 
          node.type === 'ImportDeclaration' && 
          node.source.value === imp
        )
      ),
      circular: [],
      size: {}
    };
  }

  private calculateQualityScore(
    lintResults: any[],
    metrics: { complexity: number; maintainability: number }
  ): number {
    const lintScore = 1 - (lintResults.length / 100);
    const complexityScore = Math.max(0, 1 - (metrics.complexity / 20));
    const maintainabilityScore = metrics.maintainability / 100;

    return (lintScore + complexityScore + maintainabilityScore) / 3;
  }

  private calculatePerformanceScore(metrics: { complexity: number }): number {
    return Math.max(0, 1 - (metrics.complexity / 30));
  }

  private formatLintIssues(lintResults: any[]) {
    return lintResults.map(issue => ({
      severity: this.mapSeverity(issue.severity),
      message: issue.message,
      location: issue.location,
      rule: issue.rule,
      fix: issue.fix
    }));
  }

  private mapSeverity(severity: number): 'low' | 'medium' | 'high' {
    switch (severity) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      default: return 'medium';
    }
  }

  private generatePerformanceSuggestions(metrics: { complexity: number }) {
    const suggestions: string[] = [];

    if (metrics.complexity > 10) {
      suggestions.push('Consider breaking down complex functions into smaller ones');
    }
    if (metrics.complexity > 15) {
      suggestions.push('Implement memoization for expensive calculations');
    }

    return suggestions;
  }

  private async analyzePerformance(code: string) {
    return {
      complexity: 0,
      maintainability: 100,
      reliability: 100,
      bundleSize: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }
}