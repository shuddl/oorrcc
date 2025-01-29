import { ComplexityMetrics, Metrics } from '../../types/analysis';
import { logger } from '../../utils/logger';

export class ComplexityAnalyzer {
  public analyzeComplexity(ast: any): ComplexityMetrics {
    try {
      const metrics: Metrics = {
        halsteadMetrics: {
          operators: new Set<string>(),
          operands: new Set<string>()
        },
        cyclomaticComplexity: 0
      };

      // Default values in case of failure
      const defaultMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 1,
        maintainabilityIndex: 85,
        cognitiveComplexity: 1,
        dependencyMetrics: {
          fanIn: 0,
          fanOut: 0,
          instability: 0
        }
      };

      if (!ast) {
        logger.warn('No AST provided for complexity analysis');
        return defaultMetrics;
      }

      const traverse = require('@babel/traverse').default;
      traverse(ast, {
        IfStatement: () => metrics.cyclomaticComplexity++,
        WhileStatement: () => metrics.cyclomaticComplexity++,
        ForStatement: () => metrics.cyclomaticComplexity++,
        BinaryExpression: (path: any) => {
          metrics.halsteadMetrics.operators.add(path.node.operator);
        },
        Identifier: (path: any) => {
          metrics.halsteadMetrics.operands.add(path.node.name);
        }
      });

      return {
        cyclomaticComplexity: metrics.cyclomaticComplexity || defaultMetrics.cyclomaticComplexity,
        maintainabilityIndex: this.calculateMaintainabilityIndex(metrics),
        cognitiveComplexity: this.calculateCognitiveComplexity(ast),
        dependencyMetrics: {
          fanIn: 0,
          fanOut: 0,
          instability: 0
        }
      };
    } catch (error) {
      logger.error('Complexity analysis failed', { error });
      return {
        cyclomaticComplexity: 1,
        maintainabilityIndex: 85,
        cognitiveComplexity: 1,
        dependencyMetrics: {
          fanIn: 0,
          fanOut: 0,
          instability: 0
        }
      };
    }
  }

  private calculateMaintainabilityIndex(metrics: Metrics): number {
    try {
      const halsteadVolume = this.calculateHalsteadVolume(metrics.halsteadMetrics);
      const cc = metrics.cyclomaticComplexity;
      const loc = this.calculateLOC(metrics);

      const mi = 171 - 
        5.2 * Math.log(Math.max(halsteadVolume, 1)) - 
        0.23 * cc - 
        16.2 * Math.log(Math.max(loc, 1));

      return Math.max(0, Math.min(100, mi));
    } catch (error) {
      logger.error('Failed to calculate maintainability index', { error });
      return 85; // Default reasonable value
    }
  }

  private calculateHalsteadVolume(metrics: { operators: Set<string>; operands: Set<string> }): number {
    try {
      const n1 = metrics.operators.size || 1;
      const n2 = metrics.operands.size || 1;
      const N1 = Array.from(metrics.operators).length || 1;
      const N2 = Array.from(metrics.operands).length || 1;
      
      const vocabulary = n1 + n2;
      const length = N1 + N2;
      
      return length * Math.log2(Math.max(vocabulary, 2));
    } catch (error) {
      logger.error('Failed to calculate Halstead volume', { error });
      return 100; // Default reasonable value
    }
  }

  private calculateLOC(metrics: any): number {
    return 100; // Default implementation
  }

  private calculateCognitiveComplexity(ast: any): number {
    try {
      let complexity = 0;
      const traverse = require('@babel/traverse').default;
      
      traverse(ast, {
        IfStatement: () => complexity++,
        WhileStatement: () => complexity++,
        ForStatement: () => complexity++,
        SwitchCase: () => complexity++,
        LogicalExpression: () => complexity += 0.5,
        ConditionalExpression: () => complexity += 0.5
      });

      return complexity;
    } catch (error) {
      logger.error('Failed to calculate cognitive complexity', { error });
      return 1; // Default reasonable value
    }
  }
}