import { logger } from '../../utils/logger';
import { DetectedPattern } from '../../types/analysis';

export class PatternDetector {
  async detectPatterns(ast: any): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const patternRules = this.getPatternRules();

    try {
      const traverse = require('@babel/traverse').default;
      traverse(ast, {
        ClassDeclaration: (path: any) => {
          this.detectClassPatterns(path.node, patterns);
        },
        CallExpression: (path: any) => {
          this.detectHookPatterns(path.node, patterns);
        },
        FunctionDeclaration: (path: any) => {
          this.detectFunctionPatterns(path.node, patterns);
        }
      });
    } catch (error) {
      logger.error('Pattern detection failed', { error });
    }

    return patterns;
  }

  private getPatternRules() {
    return {
      singleton: {
        test: (node: any) => 
          node.type === 'ClassDeclaration' &&
          node.body.body.some((m: any) => 
            m.key?.name === 'getInstance' ||
            m.key?.name === 'instance'
          ),
        confidence: 0.9
      },
      observer: {
        test: (node: any) =>
          node.type === 'ClassDeclaration' &&
          node.body.body.some((m: any) =>
            ['subscribe', 'unsubscribe', 'notify'].includes(m.key?.name)
          ),
        confidence: 0.85
      },
      factory: {
        test: (node: any) =>
          node.type === 'ClassDeclaration' &&
          node.body.body.some((m: any) =>
            m.key?.name?.toLowerCase().includes('create') ||
            m.key?.name?.toLowerCase().includes('factory')
          ),
        confidence: 0.8
      },
      customHook: {
        test: (node: any) =>
          node.type === 'FunctionDeclaration' &&
          node.id?.name?.startsWith('use'),
        confidence: 0.95
      }
    };
  }

  private detectClassPatterns(node: any, patterns: DetectedPattern[]) {
    const rules = this.getPatternRules();
    
    Object.entries(rules).forEach(([type, rule]) => {
      if (rule.test(node)) {
        patterns.push({
          type,
          location: `Line ${node.loc.start.line}`,
          confidence: rule.confidence
        });
      }
    });
  }

  private detectHookPatterns(node: any, patterns: DetectedPattern[]) {
    if (
      node.callee?.type === 'Identifier' &&
      node.callee.name.startsWith('use')
    ) {
      patterns.push({
        type: 'react-hook',
        location: `Line ${node.loc.start.line}`,
        confidence: 0.95
      });
    }
  }

  private detectFunctionPatterns(node: any, patterns: DetectedPattern[]) {
    // Higher-Order Function detection
    if (
      node.params.some((param: any) => param.type === 'FunctionExpression' || 
        param.type === 'ArrowFunctionExpression') ||
      (node.body?.body || []).some((stmt: any) => 
        stmt.type === 'ReturnStatement' &&
        (stmt.argument?.type === 'FunctionExpression' ||
         stmt.argument?.type === 'ArrowFunctionExpression'))
    ) {
      patterns.push({
        type: 'higher-order-function',
        location: `Line ${node.loc.start.line}`,
        confidence: 0.85
      });
    }

    // Custom Hook detection
    if (node.id?.name?.startsWith('use')) {
      patterns.push({
        type: 'custom-hook',
        location: `Line ${node.loc.start.line}`,
        confidence: 0.95
      });
    }
  }
}
