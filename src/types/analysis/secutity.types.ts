export interface SecurityIssue {
    severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  fix?: string;
  }
  
  export interface SecurityRecommendation {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    implementation: string;
  }
  
export interface SecurityReport {
  vulnerabilities: SecurityIssue[];
  riskScore: number;
  recommendations: SecurityRecommendation[];
}

export interface SecurityScanResult {
  passed: boolean;
  score: number;
  issues: SecurityIssue[];
  recommendations: string[];
}

export interface Vulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location?: string;
  description?: string;
}