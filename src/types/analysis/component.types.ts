// src/types/analysis/component.types.ts
import { BaseAnalysis } from './base.types';

export interface ComponentAnalysis extends BaseAnalysis {
  accessibility: AccessibilityAnalysis;
  performance: PerformanceAnalysis;
  security: SecurityAnalysis;
  quality: QualityAnalysis;
  dependencies: DependencyAnalysis;
}

export interface AccessibilityAnalysis {
  score: number;
  wcag: {
    level: 'A' | 'AA' | 'AAA';
    violations: AccessibilityViolation[];
  };
  aria: {
    roles: string[];
    attributes: Record<string, string>;
    missingLabels: string[];
  };
}

export interface AccessibilityViolation {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
    description: string;
  suggestion: string;
}

export interface PerformanceAnalysis {
  score: number;
  metrics: {
    firstRender: number;
    rerender: number;
    memoryUsage: number;
    bundleSize: number;
  };
  optimizations: Array<{
    type: 'memoization' | 'codeElimination' | 'stateManagement';
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
}

export interface SecurityAnalysis {
  score: number;
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation: string;
  }>;
}

export interface QualityAnalysis {
  score: number;
  metrics: {
    complexity: number;
    maintainability: number;
    testability: number;
    reusability: number;
  };
  suggestions: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export interface DependencyAnalysis {
  direct: number;
  indirect: number;
  circular: boolean;
  unusedDependencies: string[];
  missingPeerDependencies: string[];
  vulnerabilities: Array<{
    package: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}