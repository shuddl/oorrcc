export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  files: Array<{
    path: string;
    type: 'component' | 'hook' | 'util' | 'test' | 'type';
    description: string;
    content?: string;
    requires?: {
      imports: string[];
      exports: string[];
      types: string[];
    };
  }>;
  order: number;
  context?: {
    stateManagement?: string[];
    apiEndpoints?: string[];
    sharedUtils?: string[];
    testCases?: string[];
  };
}

export interface ProjectContext {
  structure: {
    components: string[];
    hooks: string[];
    utils: string[];
    types: string[];
    tests: string[];
  };
  dependencies: {
    internal: Map<string, string[]>;
    external: Set<string>;
  };
  sharedState: Map<string, any>;
  apiSchema: Map<string, any>;
  testCoverage: Map<string, number>;
}

export interface GenerationState {
  currentModule: string | null;
  completedModules: Set<string>;
  moduleDefinitions: Map<string, ModuleDefinition>;
  generatedFiles: Map<string, string>;
  projectContext: ProjectContext;
  generationHistory: Array<{
    moduleId: string;
    timestamp: string;
    context: string;
  }>;
}

export interface ComponentAnalysis extends ModuleAnalysis {
  innovations: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    feasibility: 'easy' | 'medium' | 'hard';
  }>;
  deployment?: {
    stage: 'development' | 'staging' | 'production';
    status: 'not_started' | 'in_progress' | 'completed';
    healthCheck: {
      status: 'healthy' | 'unhealthy';
      lastCheck: string;
    };
  };
  changelog: Array<{
    timestamp: string;
    type: 'create' | 'update' | 'optimize';
    message: string;
  }>;
}
