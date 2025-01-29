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

export interface AnalysisResult {
  semanticAnalysis: SemanticAnalysisResult;
  contextAnalysis: ContextAnalysisResult;
  dependencyGraph: DependencyGraphResult;
  performanceMetrics: PerformanceMetricsResult;
  securityReport: SecurityReport;
  moduleAnalysis?: ModuleAnalysis;
}

export interface QualityIndicators {
  maintainability: number;
  reliability: number;
  security: number;
  coverage: number;
  documentation: number;
  quality: number; // Added missing property
}