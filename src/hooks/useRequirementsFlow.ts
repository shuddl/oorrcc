import { useState, useCallback, useRef, useEffect } from 'react';
import { useServices } from './useServices';
import { RequirementResponse } from '../types/requirements.types';
import { toast } from 'react-hot-toast';

const AUTOSAVE_INTERVAL = 2000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

export function useRequirementsFlow() {
  const { requirements, ai } = useServices();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [categories, setCategories] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [responses, setResponses] = useState<RequirementResponse[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const lastSaveRef = useRef<number>(Date.now());
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }]);
  }, []);

  const startSession = useCallback(async (description: string) => {
    try {
      // Start AI analysis
      const analysisResult = await ai.analyzeAndOptimizeCode(description, {
        useCache: true
      });

      // Generate initial questions based on analysis
      const session = await requirements.startSession(description, analysisResult);
      setSessionId(session.id);
      setCategories(session.categories);
      setCurrentQuestion(session.categories[0]?.questions[0]?.id || null);

      addLog('Session started successfully', 'success');
      return session.id;
    } catch (error) {
      addLog(`Failed to start session: ${error.message}`, 'error');
      throw error;
    }
  }, [ai, requirements, addLog]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion) return;

    try {
      // Process answer with AI
      const processedResponse = await ai.processResponse(answer, currentQuestion);

      // Submit to requirements service
      const result = await requirements.submitAnswer(
        sessionId!,
        currentQuestion,
        processedResponse.answer,
        processedResponse.context
      );

      setResponses(prev => [...prev, result.response]);
      setCurrentQuestion(result.nextQuestion);

      addLog('Answer submitted successfully', 'success');
    } catch (error) {
      addLog(`Failed to submit answer: ${error.message}`, 'error');
      throw error;
    }
  }, [sessionId, currentQuestion, ai, requirements, addLog]);

  const generateSummary = useCallback(async () => {
    if (!sessionId) return null;

    try {
      const summary = await requirements.generateSummary(sessionId);
      addLog('Summary generated successfully', 'success');
      return summary;
    } catch (error) {
      addLog(`Failed to generate summary: ${error.message}`, 'error');
      throw error;
    }
  }, [sessionId, requirements, addLog]);

  const loadSession = useCallback(async (id: string, state: any) => {
    try {
      setSessionId(id);
      setCategories(state.categories || []);
      setResponses(state.responses || []);
      setCurrentQuestion(state.currentQuestion);
      addLog('Session loaded successfully', 'success');
    } catch (error) {
      addLog(`Failed to load session: ${error.message}`, 'error');
      throw error;
    }
  }, [addLog]);

  const cleanup = useCallback(() => {
    setSessionId(null);
    setCategories([]);
    setCurrentQuestion(null);
    setResponses([]);
    setSteps([]);
    setCurrentStep('');
    setIsPaused(false);
    setLogs([]);
  }, []);

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        retryCountRef.current++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCountRef.current));
        return retryOperation(operation, errorMessage);
      }
      throw new Error(errorMessage);
    }
  }, []);

  const saveState = useCallback(async () => {
    if (!sessionId || Date.now() - lastSaveRef.current < AUTOSAVE_INTERVAL) {
      return;
    }

    try {
      await retryOperation(
        () => requirements.saveSession(sessionId, { categories, responses }),
        'Failed to save session state'
      );
      lastSaveRef.current = Date.now();
    } catch (error) {
      setError(error as Error);
      toast.error('Failed to save progress');
    }
  }, [sessionId, categories, responses, requirements, retryOperation]);

  // Auto-save effect
  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(saveState, AUTOSAVE_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [sessionId, saveState]);

  return {
    sessionId,
    categories,
    currentQuestion,
    responses,
    error,
    steps,
    currentStep,
    isPaused,
    logs,
    startSession,
    submitAnswer,
    generateSummary,
    saveState,
    loadSession,
    cleanup,
    actions: {
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
      addLog
    }
  };
}