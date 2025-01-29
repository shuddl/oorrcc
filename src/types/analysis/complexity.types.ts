export interface AnalysisResult {
    semanticAnalysis: SemanticAnalysisResult;
    contextAnalysis: ContextAnalysisResult;
    dependencyGraph: DependencyGraphResult;
    performanceMetrics: PerformanceMetricsResult;
    securityReport: SecurityReport;
  }
  
  export interface AnalysisContext {
    projectType?: string;
    dependencies?: string[];
    environment?: string;
    [key: string]: any;
  }
  
  export interface CachedAnalysis {
    result: AnalysisResult;
    timestamp: number;
    expiresAt: number;
  }
  
  export interface SemanticAnalysisResult {
    codeStructure: CodeStructure;
    complexityMetrics: ComplexityMetrics;
    qualityIndicators: QualityIndicators;
  }
  
  export interface ContextAnalysisResult {
    patterns: DetectedPattern[];
    optimizationSuggestions: OptimizationSuggestion[];
    contextualDependencies: ContextDependency[];
  }
  
  export interface CodeStructure {
    classes: string[];
    functions: string[];
    imports: ImportInfo[];
    exports: ExportInfo[];
  }
  
  export interface ImportInfo {
    source: string;
    specifiers: string[];
  }
  
  export interface ExportInfo {
    name: string;
    type: string;
  }
  
  export interface DetectedPattern {
    type: string;
    location: string;
    confidence: number;
  }
  
  export interface OptimizationSuggestion {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    impact: number;
    location?: string;
  }
  
  export interface ContextDependency {
    name: string;
    type: string;
    usage: string[];
  }
  
export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  cognitiveComplexity: number;
  dependencyMetrics: {
    fanIn: number;
    fanOut: number;
    instability: number;
  };
}

export interface Metrics {
  halsteadMetrics: {
    operators: Set<string>;
    operands: Set<string>;
  };
  cyclomaticComplexity: number;
}

export interface QualityIndicators {
  maintainability: number;
  reliability: number;
  security: number;
  coverage: number;
  documentation: number;
}

export interface PerformanceMetricsResult {
  timeComplexity: string;
  spaceComplexity: string;
  bottlenecks: Bottleneck[];
  optimizationPotential: number;
}

export interface Bottleneck {
  location: string;
  type: string;
      severity: 'low' | 'medium' | 'high';
  impact: number;
}

export interface CodeAnalysisResult {
  quality: {
    score: number;
    issues: Array<{
      severity: 'low' | 'medium' | 'high';
      message: string;
      location?: string;
    }>;
  };
  security: {
    score: number;
    vulnerabilities: Array<{
      severity: 'low' | 'medium' | 'high';
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
    };
    suggestions: string[];
  };
  dependencies: {
    outdated: string[];
    security: string[];
    unused: string[];
  };
}