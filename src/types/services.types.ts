import { AccessibilityAnalysis, PerformanceAnalysis, SecurityAnalysis } from './analysis/component.types';

export interface CodeAnalyzer {
  analyzeCode(code: string): Promise<PerformanceAnalysis>;
  optimizeCode(code: string, analysis: PerformanceAnalysis): Promise<string>;
}

export interface SecurityScanner {
  scanCode(code: string): Promise<SecurityAnalysis>;  
}

export interface MLModelService {
  analyzeAccessibility(code: string): Promise<AccessibilityAnalysis>;
  terminate(): void;
}

export interface AnalysisEngine {
  analyze(code: string): Promise<{
    accessibility: AccessibilityAnalysis;
    performance: PerformanceAnalysis; 
    security: SecurityAnalysis;
  }>;
}
