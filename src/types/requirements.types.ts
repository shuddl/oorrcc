export interface RequirementQuestion {
  id: string;
  question: string;
  type: 'yesno' | 'choice' | 'text';
  choices?: string[] | null;
  details?: string[];
  considerations?: string[];
  required: boolean;
  followUp?: {
    yes: RequirementQuestion[];
    no: RequirementQuestion[];
  };
}

export interface RequirementResponse {
  id: string;
  questionId: string;
  answer: string | boolean;
  notes?: string;
  timestamp: number;
}

export interface RequirementCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  completed: boolean;
  questions: RequirementQuestion[];
}

export interface RequirementSummary {
  keyDecisions: string[];
  technicalRequirements: string[];
  implementationConsiderations: string[];
  nextSteps: string[];
}