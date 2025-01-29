export interface DependencyGraphResult {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: DependencyCycle[];
  metrics: DependencyMetrics;
}

export interface DependencyNode {
  id: string;
  type: string;
  metrics: {
    importCount: number;
    complexity: number;
  };
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: string;
}

export interface DependencyCycle {
  nodes: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface DependencyMetrics {
  nodeCount: number;
  edgeCount: number;
  averageDependencies: number;
  cyclomaticComplexity: number;
  dependencyCohesion: number;
}

export interface NodeComplexityMetrics {
  importCount: number;
  dependencyDepth: number;
  coupling: number;
}
