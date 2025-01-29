/// <reference lib="webworker" />

export interface MLWorkerAPI {
  generateLayout(description: string): Promise<Array<{
    components: string[];
    layout: string;
    confidence: number;
    accessibility: {
      score: number;
      improvements: string[];
    };
  }>>;
  
  analyzeAccessibility(code: string): Promise<{
    score: number;
    issues: string[];
    fixes: string[];
  }>;
}

export type MLWorkerType = Worker & MLWorkerAPI;
