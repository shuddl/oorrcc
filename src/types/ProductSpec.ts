// src/types/ProductSpec.ts

export interface ProductSpec {
  version: string;
  systemDefinition: {
    purpose: string;
    constraints: string[];
    success_metrics: {
      accuracy: string;
      test_coverage: string;
    };
  };
  core_features: Array<{
    id: string;
    name: string;
    acceptance: string[];
    metrics?: {
      [key: string]: number;
    };
    depends_on?: string[];
    generates?: string[];
    constraints?: {
      [key: string]: number;
    };
  }>;
  validation_protocol: {
    steps: string[];
    required_coverage: number;
    max_cyclomatic_complexity: number;
  };
}

export interface ModuleAnalysis {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  complexity: number;
  status: 'pending' | 'in_progress' | 'completed';
  qualityMetrics: {
    testCoverage: number;
    codeQuality: number;
    performance: number;
  };
  refactoring?: {
    suggestions: Array<{
      type: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    status: 'pending' | 'in_progress' | 'completed';
  };
}
