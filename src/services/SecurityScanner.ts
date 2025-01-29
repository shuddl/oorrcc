import { logger } from '../utils/logger';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export interface SecurityScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  score: number;
  recommendations: string[];
}

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  location?: string;
  fix?: string;
}

export class SecurityScanner {
  private readonly VULNERABILITY_PATTERNS = {
    'eval-usage': {
      pattern: /eval\s*\(/,
      severity: 'critical',
      description: 'Dangerous use of eval()',
      fix: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor'
    },
    'innerHTML-usage': {
      pattern: /innerHTML\s*=/,
      severity: 'high',
      description: 'Potential XSS vulnerability with innerHTML',
      fix: 'Use textContent or sanitize HTML input'
    },
    'sql-injection': {
      pattern: /execute\s*\(\s*['"`]\s*SELECT|UPDATE|DELETE|INSERT/i,
      severity: 'critical',
      description: 'Potential SQL injection vulnerability',
      fix: 'Use parameterized queries or an ORM'
    }
  };

  async scanCode(code: string): Promise<SecurityScanResult> {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      const issues: SecurityIssue[] = [];

      // Static analysis
      this.performStaticAnalysis(ast, issues);

      // Pattern matching
      this.performPatternMatching(code, issues);

      // Dependency analysis
      await this.analyzeDependencies(code, issues);

      const score = this.calculateSecurityScore(issues);

      return {
        passed: issues.length === 0,
        issues,
        score,
        recommendations: this.generateRecommendations(issues)
      };
    } catch (error) {
      logger.error('Security scan failed', { error });
      throw error;
    }
  }

  private performStaticAnalysis(ast: any, issues: SecurityIssue[]): void {
    traverse(ast, {
      CallExpression: (path) => {
        // Check for dangerous function calls
        if (path.node.callee.name === 'eval') {
          issues.push({
            severity: 'critical',
            type: 'code-injection',
            description: 'Use of eval() detected',
            location: `Line ${path.node.loc?.start.line}`,
            fix: 'Replace eval() with safer alternatives'
          });
        }
      },
      AssignmentExpression: (path) => {
        // Check for innerHTML assignments
        if (path.node.left.property?.name === 'innerHTML') {
          issues.push({
            severity: 'high',
            type: 'xss',
            description: 'Direct innerHTML manipulation detected',
            location: `Line ${path.node.loc?.start.line}`,
            fix: 'Use textContent or sanitize HTML input'
          });
        }
      },
      MemberExpression: (path) => {
        // Check for sensitive data exposure
        if (path.node.property.name === 'localStorage' ||
            path.node.property.name === 'sessionStorage') {
          issues.push({
            severity: 'medium',
            type: 'data-exposure',
            description: 'Sensitive data stored in browser storage',
            location: `Line ${path.node.loc?.start.line}`,
            fix: 'Use secure storage methods for sensitive data'
          });
        }
      }
    });
  }

  private performPatternMatching(code: string, issues: SecurityIssue[]): void {
    Object.entries(this.VULNERABILITY_PATTERNS).forEach(([type, config]) => {
      if (config.pattern.test(code)) {
        issues.push({
          severity: config.severity as SecurityIssue['severity'],
          type,
          description: config.description,
          fix: config.fix
        });
      }
    });
  }

  private async analyzeDependencies(code: string, issues: SecurityIssue[]): Promise<void> {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    const dependencies = new Set<string>();
    traverse(ast, {
      ImportDeclaration(path) {
        dependencies.add(path.node.source.value);
      }
    });

    // Check each dependency against known vulnerabilities
    // In production, this would integrate with a vulnerability database
    for (const dep of dependencies) {
      if (dep.includes('vulnerable-package')) {
        issues.push({
          severity: 'high',
          type: 'vulnerable-dependency',
          description: `Known vulnerable package: ${dep}`,
          fix: 'Update to latest secure version'
        });
      }
    }
  }

  private calculateSecurityScore(issues: SecurityIssue[]): number {
    if (issues.length === 0) return 1;

    const weights = {
      critical: 1.0,
      high: 0.7,
      medium: 0.4,
      low: 0.1
    };

    const totalWeight = issues.reduce((sum, issue) => 
      sum + weights[issue.severity], 0
    );

    return Math.max(0, 1 - (totalWeight / issues.length));
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations = new Set<string>();

    issues.forEach(issue => {
      if (issue.fix) {
        recommendations.add(issue.fix);
      }
    });

    // Add general security recommendations
    recommendations.add('Implement Content Security Policy (CSP)');
    recommendations.add('Use HTTPS for all external requests');
    recommendations.add('Implement proper input validation');
    recommendations.add('Keep dependencies up to date');

    return Array.from(recommendations);
  }
}