import { logger } from '../../utils/logger';
import {
  DependencyNode,
  DependencyEdge,
  DependencyGraphResult,
  DependencyCycle,
  DependencyMetrics
} from '../../types/analysis';

export class DependencyAnalyzer {
  async analyzeDependencies(ast: any): Promise<DependencyGraphResult> {
    try {
      const dependencies = this.extractDependencies(ast);
      const graph = this.buildDependencyGraph(dependencies);
      const cycles = this.detectCycles(graph);
      const metrics = this.calculateMetrics(graph);

      return {
        nodes: graph.nodes,
        edges: graph.edges,
        cycles,
        metrics
      };
    } catch (error) {
      logger.error('Dependency analysis failed', { error });
      throw error;
    }
  }

  private extractDependencies(ast: any): any[] {
    const dependencies: any[] = [];
    const traverse = require('@babel/traverse').default;

    traverse(ast, {
      ImportDeclaration(path: any) {
        dependencies.push({
          type: 'import',
          source: path.node.source.value,
          specifiers: path.node.specifiers.map((s: any) => ({
            type: s.type,
            name: s.local.name,
            imported: s.imported?.name
          }))
        });
      },
      CallExpression(path: any) {
        if (path.node.callee.name === 'require') {
          dependencies.push({
            type: 'require',
            source: path.node.arguments[0].value
          });
        }
      }
    });

    return dependencies;
  }

  private buildDependencyGraph(dependencies: any[]): {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  } {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const processedNodes = new Set();

    dependencies.forEach(dep => {
      if (!processedNodes.has(dep.source)) {
        nodes.push({
          id: dep.source,
          type: dep.type,
          metrics: {
            importCount: 1,
            complexity: this.calculateComplexity(dep)
          }
        });
        processedNodes.add(dep.source);
      }

      dep.specifiers?.forEach((spec: any) => {
        edges.push({
          source: dep.source,
          target: spec.name,
          type: spec.type
        });
      });
    });

    return { nodes, edges };
  }

  private detectCycles(graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  }): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node: string, path: string[] = []): void => {
      if (recursionStack.has(node)) {
        const cycle = path.slice(path.indexOf(node));
        cycles.push({
          nodes: cycle,
          severity: this.calculateCycleSeverity(cycle)
        });
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      graph.edges
        .filter(edge => edge.source === node)
        .forEach(edge => {
          dfs(edge.target, [...path, node]);
        });

      recursionStack.delete(node);
    };

    graph.nodes.forEach(node => dfs(node.id));
    return cycles;
  }

  private calculateMetrics(graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  }): DependencyMetrics {
    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;

    return {
      nodeCount,
      edgeCount,
      averageDependencies: edgeCount / nodeCount || 0,
      cyclomaticComplexity: this.calculateCyclomaticComplexity(graph),
      dependencyCohesion: this.calculateCohesion(graph)
    };
  }

  private calculateCycleSeverity(cycle: string[]): 'low' | 'medium' | 'high' {
    const cycleLength = cycle.length;
    const hasCriticalDependencies = cycle.some(node => 
      this.isCriticalDependency(node)
    );

    if (hasCriticalDependencies || cycleLength > 5) return 'high';
    if (cycleLength > 3) return 'medium';
    return 'low';
  }

  private calculateComplexity(dep: any): number {
    return (dep.specifiers?.length || 0) / 10;
  }

  private calculateCyclomaticComplexity(graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  }): number {
    const edges = graph.edges.length;
    const nodes = graph.nodes.length;
    const components = this.findConnectedComponents(graph);
    return edges - nodes + (2 * components);
  }

  private calculateCohesion(graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  }): number {
    const totalNodes = graph.nodes.length;
    if (totalNodes <= 1) return 1;

    const actualConnections = graph.edges.length;
    const maxPossibleConnections = (totalNodes * (totalNodes - 1)) / 2;

    return actualConnections / maxPossibleConnections;
  }

  private findConnectedComponents(graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  }): number {
    const visited = new Set<string>();
    let components = 0;

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      graph.edges
        .filter(edge => edge.source === nodeId)
        .forEach(edge => {
          if (!visited.has(edge.target)) {
            dfs(edge.target);
          }
        });
    };

    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
        components++;
      }
    });

    return components;
  }

  private isCriticalDependency(node: string): boolean {
    const criticalPatterns = ['auth', 'security', 'payment', 'user'];
    return criticalPatterns.some(pattern => 
      node.toLowerCase().includes(pattern)
    );
  }
}
