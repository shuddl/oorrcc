// src/types/generation.types.ts
export interface GenerationContext {
  projectName: string;
  description: string;
  architecture: {
    framework: string;
    styling: string;
    stateManagement: string;
    testing: string;
  };
  requirements: {
    performance: boolean;
    accessibility: boolean;
    i18n: boolean;
    seo: boolean;
    testing: boolean;
    documentation: boolean;
  };
  dependencies: {
    required: string[];
    optional: string[];
  };
}

export interface ComponentTemplate {
  name: string;
  type: 'component' | 'container' | 'feature';
  description: string;
  props: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  state: {
    name: string;
    type: string;
    initial: any;
    description: string;
  }[];
  methods: {
    name: string;
    params: { name: string; type: string }[];
    returnType: string;
    description: string;
  }[];
}
