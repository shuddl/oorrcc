import { AccessibilityAnalysis, PerformanceAnalysis, SecurityAnalysis } from '../analysis/component.types';

export interface ComponentGenerationRequest {
  name: string;
  type: 'functional' | 'class';
  description: string;
  features?: string[];
  styling?: {
    framework: 'tailwind' | 'css-modules';
    theme?: Record<string, unknown>;
  };
  state?: {
    type: 'local' | 'global';
    schema?: Record<string, unknown>;
  };
  props?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  dependencies?: string[];
}

export interface ComponentGenerationResult {
  files: Map<string, string>;
  analysis: {
    accessibility: AccessibilityAnalysis;
    performance: PerformanceAnalysis;
    security: SecurityAnalysis;
    dependencies: string[];
    complexity: number;
  };
}

export interface ComponentTemplate {
  name: string;
  type: 'component' | 'container' | 'feature';
  description: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  state: Array<{
    name: string;
    type: string;
    initial: unknown;
    description: string;
  }>;
  methods: Array<{
    name: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
    description: string;
  }>;
}

export interface GenerationOptions {
  typescript?: boolean;
  testing?: boolean;
  storybook?: boolean;
  documentation?: boolean;
  optimization?: boolean;
}