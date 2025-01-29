import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { logger } from '../utils/logger';
import type { ProcessorTask, ProcessorResult } from '../types/processor.types';

class ProcessorWorker {
  async processTask(task: ProcessorTask): Promise<ProcessorResult> {
    try {
      let result;
      
      switch (task.type) {
        case 'analysis':
          result = await this.analyzeCode(task.data);
          break;
        case 'generation':
          result = await this.generateComponent(task.data);
          break;
        case 'optimization':
          result = await this.optimizeCode(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      return {
        taskId: task.id,
        result,
        error: null
      };
    } catch (error) {
      logger.error('Task processing failed', { error, task });
      return {
        taskId: task.id,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async analyzeCode(data: { code: string }): Promise<any> {
    const ast = parse(data.code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    const analysis = {
      complexity: 0,
      dependencies: new Set<string>(),
      hooks: new Set<string>(),
      stateUsage: new Set<string>(),
      effectDependencies: new Map<string, string[]>(),
      accessibility: {
        ariaUsage: 0,
        semanticElements: 0,
        interactiveElements: 0
      }
    };

    traverse(ast, {
      // Analyze complexity
      IfStatement: () => analysis.complexity++,
      WhileStatement: () => analysis.complexity++,
      ForStatement: () => analysis.complexity++,
      SwitchCase: () => analysis.complexity++,

      // Analyze imports
      ImportDeclaration(path) {
        analysis.dependencies.add(path.node.source.value);
      },

      // Analyze hooks
      CallExpression(path) {
        if (path.node.callee.type === 'Identifier' && 
            path.node.callee.name.startsWith('use')) {
          analysis.hooks.add(path.node.callee.name);
        }
      },

      // Analyze state usage
      MemberExpression(path) {
        if (path.node.object.type === 'Identifier' &&
            path.node.object.name === 'state') {
          analysis.stateUsage.add(path.node.property.name);
        }
      },

      // Analyze useEffect dependencies
      ExpressionStatement(path) {
        const expr = path.node.expression;
        if (expr.type === 'CallExpression' && 
            expr.callee.name === 'useEffect') {
          const deps = expr.arguments[1];
          if (deps?.type === 'ArrayExpression') {
            analysis.effectDependencies.set(
              path.scope.generateUid('effect'),
              deps.elements.map(el => el.name)
            );
          }
        }
      },

      // Analyze accessibility
      JSXOpeningElement(path) {
        // Check ARIA attributes
        path.node.attributes.forEach(attr => {
          if (attr.type === 'JSXAttribute' && 
              attr.name.name.toString().startsWith('aria-')) {
            analysis.accessibility.ariaUsage++;
          }
        });

        // Check semantic elements
        const elementName = path.node.name.name;
        if (['header', 'nav', 'main', 'footer', 'article', 'section']
            .includes(elementName)) {
          analysis.accessibility.semanticElements++;
        }

        // Check interactive elements
        if (['button', 'a', 'input', 'select', 'textarea']
            .includes(elementName)) {
          analysis.accessibility.interactiveElements++;
        }
      }
    });

    return {
      complexity: analysis.complexity,
      quality: this.calculateQualityScore(analysis),
      suggestions: this.generateSuggestions(analysis)
    };
  }

  private async generateComponent(data: { template: string }): Promise<any> {
    const ast = parse(data.template, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    // Transform AST to optimize the component
    traverse(ast, {
      // Add performance optimizations
      FunctionDeclaration(path) {
        if (path.node.id.name.match(/[A-Z]/)) {
          // Add memo for component functions
          path.replaceWith(
            t.callExpression(
              t.identifier('memo'),
              [path.node]
            )
          );
        }
      },

      // Optimize event handlers
      VariableDeclarator(path) {
        if (path.node.init?.type === 'ArrowFunctionExpression') {
          // Wrap handlers with useCallback
          path.replaceWith(
            t.callExpression(
              t.identifier('useCallback'),
              [path.node.init, t.arrayExpression([])]
            )
          );
        }
      }
    });

    return {
      code: generate(ast).code,
      analysis: await this.analyzeCode({ code: generate(ast).code })
    };
  }

  private async optimizeCode(data: { code: string }): Promise<any> {
    const ast = parse(data.code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    const optimizations = [];

    traverse(ast, {
      // Optimize renders
      JSXElement(path) {
        const props = path.node.openingElement.attributes;
        if (props.some(p => p.type === 'JSXSpreadAttribute')) {
          optimizations.push({
            type: 'performance',
            description: 'Avoid spreading props',
            suggestion: 'Explicitly declare required props'
          });
        }
      },

      // Optimize state updates
      CallExpression(path) {
        if (path.node.callee.name === 'setState') {
          optimizations.push({
            type: 'performance',
            description: 'Batch state updates',
            suggestion: 'Use functional updates for related state changes'
          });
        }
      },

      // Optimize event handlers
      FunctionDeclaration(path) {
        if (path.node.async) {
          optimizations.push({
            type: 'performance',
            description: 'Debounce async event handlers',
            suggestion: 'Add debounce wrapper for async operations'
          });
        }
      }
    });

    return {
      optimized: generate(ast).code,
      improvements: optimizations
    };
  }

  private calculateQualityScore(analysis: any): number {
    const weights = {
      complexity: 0.3,
      hooks: 0.2,
      accessibility: 0.3,
      dependencies: 0.2
    };

    const scores = {
      complexity: Math.max(0, 1 - (analysis.complexity / 20)),
      hooks: Math.min(1, analysis.hooks.size / 5),
      accessibility: (
        analysis.accessibility.ariaUsage +
        analysis.accessibility.semanticElements
      ) / 10,
      dependencies: Math.max(0, 1 - (analysis.dependencies.size / 15))
    };

    return Object.entries(weights).reduce(
      (score, [key, weight]) => score + (scores[key] * weight),
      0
    );
  }

  private generateSuggestions(analysis: any): string[] {
    const suggestions = [];

    if (analysis.complexity > 10) {
      suggestions.push('Consider breaking down complex logic into smaller functions');
    }

    if (analysis.hooks.size > 5) {
      suggestions.push('Consider extracting hook logic into custom hooks');
    }

    if (analysis.accessibility.ariaUsage < analysis.accessibility.interactiveElements) {
      suggestions.push('Add ARIA labels for better accessibility');
    }

    if (analysis.dependencies.size > 10) {
      suggestions.push('Consider reducing external dependencies');
    }

    return suggestions;
  }
}

const worker = new ProcessorWorker();

self.onmessage = async (e: MessageEvent) => {
  const result = await worker.processTask(e.data);
  self.postMessage(result);
};