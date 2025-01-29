import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { AriaAnalysis } from '../types/AnalysisTypes';

const MLWorker = {
  async generateLayout(description: string) {
    const requirements = this.parseRequirements(description);
    const layout = this.generateOptimalLayout(requirements);
    const accessibility = await this.analyzeAccessibility(layout);

    return [{
      components: layout.components,
      layout: layout.type,
      confidence: this.calculateConfidence(requirements, layout),
      accessibility
    }];
  },

  async analyzeAccessibility(code: string) {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    const analysis: AriaAnalysis = {
      ariaAttributes: 0,
      semanticElements: 0,
      interactiveElements: 0,
      keyboardHandlers: 0,
      labelAssociations: 0
    };

    traverse(ast, {
      JSXOpeningElement(path) {
        // Check ARIA attributes
        path.node.attributes.forEach(attr => {
          if (attr.type === 'JSXAttribute' && 
              attr.name.name.toString().startsWith('aria-')) {
            analysis.ariaAttributes++;
          }
        });

        // Check semantic elements
        const elementName = path.node.name.name;
        if (['header', 'nav', 'main', 'article', 'section', 'aside', 'footer']
            .includes(elementName)) {
          analysis.semanticElements++;
        }

        // Check interactive elements
        if (['button', 'a', 'input', 'select', 'textarea']
            .includes(elementName)) {
          analysis.interactiveElements++;
        }
      },

      JSXAttribute(path) {
        // Check keyboard handlers
        if (path.node.name.name.match(/^onKey/)) {
          analysis.keyboardHandlers++;
        }

        // Check label associations
        if (path.node.name.name === 'htmlFor') {
          analysis.labelAssociations++;
        }
      }
    });

    const score = this.calculateAccessibilityScore(analysis);
    const issues = this.identifyAccessibilityIssues(analysis);
    const fixes = this.generateAccessibilityFixes(issues);

    return { score, issues, fixes };
  },

  parseRequirements(description: string) {
    return {
      complexity: this.assessComplexity(description),
      interactivity: this.assessInteractivity(description),
      dataVisualization: description.includes('chart') || description.includes('graph'),
      userInput: description.includes('form') || description.includes('input'),
      navigation: description.includes('nav') || description.includes('menu')
    };
  },

  generateOptimalLayout(requirements: any) {
    const components = ['Header'];
    const layout = {
      type: requirements.complexity > 0.7 ? 'grid' : 'flex',
      components: []
    };

    if (requirements.navigation) {
      components.push('Navigation');
    }

    if (requirements.complexity > 0.5) {
      components.push('Sidebar');
    }

    components.push('MainContent');

    if (requirements.dataVisualization) {
      components.push('Dashboard');
    }

    if (requirements.userInput) {
      components.push('Forms');
    }

    components.push('Footer');
    layout.components = components;

    return layout;
  },

  calculateConfidence(requirements: any, layout: any): number {
    const factors = {
      componentMatch: this.calculateComponentMatchScore(requirements, layout),
      layoutComplexity: this.calculateLayoutComplexityScore(requirements, layout),
      interactivityMatch: this.calculateInteractivityScore(requirements, layout)
    };

    return Object.values(factors).reduce((sum, score) => sum + score, 0) / 3;
  },

  calculateComponentMatchScore(requirements: any, layout: any): number {
    let score = 1;
    
    if (requirements.navigation && !layout.components.includes('Navigation')) {
      score -= 0.2;
    }
    
    if (requirements.dataVisualization && !layout.components.includes('Dashboard')) {
      score -= 0.2;
    }
    
    if (requirements.userInput && !layout.components.includes('Forms')) {
      score -= 0.2;
    }

    return Math.max(0, score);
  },

  calculateLayoutComplexityScore(requirements: any, layout: any): number {
    const layoutScore = layout.type === 'grid' ? 0.8 : 0.6;
    const componentScore = Math.min(1, layout.components.length / 5);
    return (layoutScore + componentScore) / 2;
  },

  calculateInteractivityScore(requirements: any, layout: any): number {
    return requirements.interactivity;
  },

  calculateAccessibilityScore(analysis: any): number {
    const scores = {
      ariaAttributes: analysis.ariaAttributes / Math.max(1, analysis.interactiveElements),
      semanticElements: Math.min(1, analysis.semanticElements / 3),
      keyboardHandlers: analysis.keyboardHandlers / Math.max(1, analysis.interactiveElements),
      labelAssociations: analysis.labelAssociations / Math.max(1, analysis.interactiveElements)
    };

    return Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;
  },

  identifyAccessibilityIssues(analysis: any): string[] {
    const issues = [];

    if (analysis.interactiveElements > analysis.ariaAttributes) {
      issues.push('Missing ARIA attributes on interactive elements');
    }

    if (analysis.interactiveElements > analysis.keyboardHandlers) {
      issues.push('Missing keyboard event handlers');
    }

    if (analysis.semanticElements < 2) {
      issues.push('Insufficient use of semantic HTML elements');
    }

    return issues;
  },

  generateAccessibilityFixes(issues: string[]): string[] {
    return issues.map(issue => {
      switch (issue) {
        case 'Missing ARIA attributes':
          return 'Add appropriate aria-label or aria-describedby attributes';
        case 'Missing keyboard event handlers':
          return 'Implement onKeyPress/onKeyDown handlers for interactive elements';
        case 'Insufficient use of semantic HTML':
          return 'Replace generic div elements with semantic HTML elements';
        default:
          return 'Review WCAG guidelines for specific requirements';
      }
    });
  },

  assessComplexity(description: string): number {
    const factors = {
      length: description.length,
      components: (description.match(/component/gi) || []).length,
      features: (description.match(/feature|functionality/gi) || []).length
    };
    return Math.min(1, (factors.length + factors.components * 2 + factors.features * 3) / 100);
  },

  assessInteractivity(description: string): number {
    const interactiveTerms = [
      'click', 'drag', 'input', 'select', 'button', 'form',
      'interactive', 'dynamic', 'update', 'change'
    ];
    const matches = interactiveTerms.reduce((count, term) => 
      count + (description.match(new RegExp(term, 'gi')) || []).length, 0
    );
    return Math.min(1, matches / 5);
  }
};

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;
  try {
    const result = await MLWorker[type](data);
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

export type { MLWorker };