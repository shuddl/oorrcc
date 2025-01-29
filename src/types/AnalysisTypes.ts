// ...existing code...
export interface DetectedPattern {
  type: string;
  description?: string;
  location?: string;
}

export interface ProcessingResult {
  code: string;
  analysis: any;
  errors?: string[];
}
// ...existing code...
