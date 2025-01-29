import { useState, useCallback } from 'react';
import { RequirementsService } from '../services/RequirementsService';
import { 
  RequirementQuestion, 
  RequirementResponse,
  RequirementCategory,
  RequirementSummary 
} from '../types/requirements.types';
  RequirementSummary 
} from '../types/requirements.types';

export function useRequirements() {
  const [categories, setCategories] = useState<RequirementCategory[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [responses, setResponses] = useState<RequirementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirementsService = new RequirementsService();
  const requirementsOrchestrator = useRef<RequirementsOrchestrator>(new RequirementsOrchestrator()).current;
  const stateManager = useRef<StateManager>(new StateManager()).current;

  const initializeRequirements = useCallback(async (description: string) => {
    setIsLoading(true);
    try {
      const questions = await requirementsService.generateQuestions(description);
      setCategories(questions);
      setCurrentCategory(questions[0]?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const answerQuestion = useCallback(async (
    questionId: string,
    answer: string | boolean,
    notes?: string
  ) => {
    const response: RequirementResponse = {
      id: crypto.randomUUID(),
      questionId,
      answer,
      notes,
      timestamp: Date.now()
    };

    setResponses(prev => [...prev, response]);

    // Find question and generate follow-ups if needed
    const category = categories.find(c => 
      c.questions.some(q => q.id === questionId)
    );
    const question = category?.questions.find(q => q.id === questionId);

    if (question) {
      try {
        const followUps = await requirementsService.generateFollowUp(
          question,
          answer,
          notes || ''
        );

        setCategories(prev => prev.map(c => 
          c.id === category?.id ? {
            ...c,
            questions: c.questions.map(q =>
              q.id === questionId ? {
                ...q,
                followUp: {
                  yes: answer === true ? followUps : [],
                  no: answer === false ? followUps : []
                }
              } : q
            )
          } : c
        ));
      } catch (err) {
        console.error('Failed to generate follow-up questions:', err);
      }
    }
  }, [categories]);

  const moveToNextCategory = useCallback(() => {
    const currentIndex = categories.findIndex(c => c.id === currentCategory);
    if (currentIndex < categories.length - 1) {
      setCurrentCategory(categories[currentIndex + 1].id);
    }
  }, [categories, currentCategory]);

  const generateSummary = useCallback(async (): Promise<RequirementSummary[]> => {
    try {
      const summary = await requirementsService.generateSummary(responses);
      return JSON.parse(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      return [];
    }
  }, [responses]);

  return {
    categories,
    currentCategory,
    responses,
    isLoading,
    error,
    initializeRequirements,
    answerQuestion,
    categories,
    moveToNextCategory,
    generateSummary
  };
}
  return {
    categories,
    currentCategory,
    responses,
    isLoading,
    error,
    initializeRequirements,
    answerQuestion,
    moveToNextCategory,
    generateSummary,
    endAndDeleteSession
  };
}
    currentCategory,
    responses,
    isLoading,
    error,
    initializeRequirements,
    answerQuestion,
    moveToNextCategory,
    generateSummary,
    endAndDeleteSession
  };
}