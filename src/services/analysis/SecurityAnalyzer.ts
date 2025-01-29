import { logger } from '../../utils/logger';
import {
  SecurityReport,
  Vulnerability,
  SecurityRecommendation
} from '../../types/analysis';

export class SecurityAnalyzer {
  async analyzeSecurity(code: string): Promise<SecurityReport> {
    try {
      const vulnerabilities = await this.detectVulnerabilities(code);
      const riskScore = this.calculateRiskScore(vulnerabilities);
      const recommendations = this.generateRecommendations(vulnerabilities);

      return {
        vulnerabilities,
        riskScore,
        recommendations
      };
    } catch (error) {
      logger.error('Security analysis failed', { error });
      throw error;
    }
  }

  private async detectVulnerabilities(code: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Check for common security issues
    if (code.includes('eval(')) {
      vulnerabilities.push({
        type: 'code-injection',
        severity: 'critical',
        description: 'Dangerous use of eval() detected',
        location: this.findLocation(code, 'eval(')
      });
    }

    if (code.includes('innerHTML')) {
      vulnerabilities.push({
        type: 'xss',
        severity: 'high',
        description: 'Potential XSS vulnerability with innerHTML',
        location: this.findLocation(code, 'innerHTML')
      });
    }

    // Add more security checks as needed
    return vulnerabilities;
  }

  private calculateRiskScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) return 0;

    const weights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.2
    };

    const totalRisk = vulnerabilities.reduce((sum, vuln) => 
      sum + weights[vuln.severity], 0);

    return Math.min(totalRisk / vulnerabilities.length, 1);
  }

  private generateRecommendations(
    vulnerabilities: Vulnerability[]
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];
    const groupedVulnerabilities = this.groupVulnerabilities(vulnerabilities);

    Object.entries(groupedVulnerabilities).forEach(([type, vulns]) => {
      const maxSeverity = this.getMaxSeverity(vulns);
      recommendations.push({
        type,
        description: this.getRecommendationDescription(type, vulns.length),
        priority: this.mapSeverityToPriority(maxSeverity),
        implementation: this.getImplementationGuidance(type)
      });
    });

    return recommendations;
  }

  private groupVulnerabilities(vulnerabilities: Vulnerability[]): Record<string, Vulnerability[]> {
    return vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.type] = acc[vuln.type] || [];
      acc[vuln.type].push(vuln);
      return acc;
    }, {} as Record<string, Vulnerability[]>);
  }

  private getMaxSeverity(vulnerabilities: Vulnerability[]): Vulnerability['severity'] {
    const severityOrder = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return vulnerabilities.reduce((max, vuln) => 
      severityOrder[vuln.severity] > severityOrder[max] ? vuln.severity : max,
      'low' as Vulnerability['severity']
    );
  }

  private mapSeverityToPriority(
    severity: Vulnerability['severity']
  ): 'low' | 'medium' | 'high' {
    const priorityMap: Record<Vulnerability['severity'], 'low' | 'medium' | 'high'> = {
      critical: 'high',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return priorityMap[severity];
  }

  private getRecommendationDescription(type: string, count: number): string {
    const descriptions: Record<string, string> = {
      'xss': `Found ${count} potential XSS vulnerabilities. Implement proper input sanitization`,
      'sql-injection': `Found ${count} SQL injection risks. Use parameterized queries`,
      'auth': `Found ${count} authentication concerns. Implement strong auth mechanisms`,
      'csrf': `Found ${count} CSRF vulnerabilities. Implement CSRF tokens`,
      'default': `Found ${count} security issues of type ${type}`
    };
    return descriptions[type] || descriptions.default;
  }

  private getImplementationGuidance(type: string): string {
    const guidance: Record<string, string> = {
      'xss': 'Use DOMPurify or similar libraries for sanitization',
      'sql-injection': 'Use ORM or prepared statements',
      'auth': 'Implement JWT or session-based auth with proper validation',
      'csrf': 'Use CSRF tokens on all state-changing requests',
      'default': 'Follow OWASP security guidelines'
    };
    return guidance[type] || guidance.default;
  }

  private findLocation(code: string, pattern: string): string {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        return `Line ${i + 1}`;
      }
    }
    return 'Unknown location';
  }
}
