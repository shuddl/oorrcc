import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRequirementsFlow } from '../hooks/useRequirementsFlow';
import { ProcessMonitor } from './common/ProcessMonitor';
import { Wand2, MessageSquare, History, AlertCircle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingOverlay } from './common/LoadingOverlay';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import { RequirementResponse, RequirementQuestion } from '../types/requirements.types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AIError } from '../types/ai.types';
import { useCanvasStore } from '../store/canvasItems';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      pre: React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
      code: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
    }
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => (
  <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
    <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      </div>
      <p className="text-dark-300 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
      >
        Try again
      </button>
    </div>
  </div>
);

const MAX_PROCESSING_TIME = 5 * 60 * 1000; // 5 minutes timeout
const AUTO_SAVE_DELAY = 2000; // 2 seconds
const MAX_DESCRIPTION_LENGTH = 5000;

const ProductSpecGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const addCanvasItem = useCanvasStore((s: any) => s.addItem);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timer | null>(null);
  
  const {
    sessionId,
    categories,
    currentQuestion,
    responses,
    steps,
    currentStep,
    isPaused,
    logs,
    startSession,
    submitAnswer,
    generateSummary,
    actions,
    loadSession,
    cleanup,
    endAndDeleteSession
  } = useRequirementsFlow();

  // Session recovery query
  const { data: lastSession } = useQuery({
    queryKey: ['lastSession', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('requirement_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    retry: 2,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Save session mutation
  const saveMutation = useMutation({
    mutationFn: async (responses: RequirementResponse[]) => {
      if (!sessionId) throw new Error('No active session');
      
      const { error } = await supabase
        .from('requirement_sessions')
        .update({
          state: {
            categories,
            responses
          }
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Failed to save responses:', error);
      toast.error('Failed to save your answers');
    }
  });

  // Session recovery
  useEffect(() => {
    const recoverSession = async () => {
      if (!lastSession) return;

      try {
        setIsLoading(true);
        await loadSession(lastSession.id, lastSession.state);
        setDescription(lastSession.description);
        toast.success('Previous session recovered');
      } catch (error) {
        console.error('Failed to recover session:', error);
        toast.error('Failed to recover previous session');
      } finally {
        setIsLoading(false);
      }
    };

    recoverSession();
  }, [lastSession, loadSession]);

  // Real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requirement_sessions',
          filter: `id=eq.${sessionId}`
        }, 
        async (payload: any) => {
          try {
            const newState = payload.new?.state;
            if (newState) {
              await loadSession(sessionId, newState);
            }
          } catch (error: unknown) {
            console.error('Failed to handle real-time update:', error);
            toast.error('Failed to sync changes');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, loadSession]);

  // Auto-save responses
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (responses.length > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveMutation.mutate(responses);
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [responses, saveMutation]);

  useEffect(() => {
    if (user && !sessionId && !isLoading && description.trim()) {
      handleStartAnalysis();
    }
  }, [user, sessionId, isLoading, description]);

  const handleStartAnalysis = useCallback(async () => {
    if (!description.trim()) {
      toast.error('Please enter a project description');
      return;
    }

    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/login');
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`);
      return;
    }

    setIsLoading(true);

    // Set processing timeout
    processingTimeoutRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current!);
      setIsLoading(false);
      toast.error('Processing timed out. Please try again.');
      cleanup();
    }, MAX_PROCESSING_TIME);

    try {
      // Save session to Supabase
      const { data: session, error: dbError } = await supabase
        .from('requirement_sessions')
        .insert({
          description,
          user_id: user.id,
          state: {
            categories: [],
            responses: []
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await startSession(description);
      toast.success('Analysis started successfully');

      // Track progress
      progressIntervalRef.current = setInterval(async () => {
        const progress = steps.filter(s => s.status === 'completed').length / steps.length;
        if (progress === 1) {
          clearInterval(progressIntervalRef.current!);
          clearTimeout(processingTimeoutRef.current!);
          const summary = await generateSummary();
          if (summary) {
            await supabase
              .from('requirement_sessions')
              .update({
                state: {
                  ...session.state,
                  summary
                }
              })
              .eq('id', session.id);

            navigate('/summary', { state: { summary } });
          }
        }
      }, 1000);
    } catch (error: unknown) {
      if (error instanceof AIError) {
        toast.error(`AI Error: ${error.message}`);
      } else {
        toast.error('Failed to start analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
      console.error('Analysis error:', error);
      cleanup();
    } finally {
      setIsLoading(false);
    }
  }, [description, startSession, user, steps, generateSummary, navigate, cleanup]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    setIsLoading(true);
    try {
      await submitAnswer(currentAnswer);
      setCurrentAnswer('');
      
      // Add response to infinite canvas
      addCanvasItem({
        type: 'function',
        label: `Response: ${currentAnswer.slice(0, 30)}...`,
        code: currentAnswer,
        x: Math.random() * window.innerWidth * 0.6,
        y: Math.random() * window.innerHeight * 0.6,
        color: '#f4a261'
      });
      
      // Focus back on input after submission
      if (answerInputRef.current) {
        answerInputRef.current.focus();
      }
    } catch (error: unknown) {
      if (error instanceof AIError) {
        toast.error(`AI Error: ${error.message}`);
      } else {
        toast.error('Failed to submit answer: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentAnswer, submitAnswer]);

  const getCurrentQuestion = useCallback((): (RequirementQuestion & { category: string }) | null => {
    if (!currentQuestion || !categories) return null;

    for (const category of categories) {
      const question = category.questions.find((q: any) => q.id === currentQuestion);
      if (question) {
        return {
          category: category.name,
          ...question
        };
      }
    }
    return null;
  }, [categories, currentQuestion]);

  const handleEndSession = useCallback(async () => {
    if (!window.confirm('Are you sure you want to end and delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      await endAndDeleteSession();
      toast.success('Session ended and deleted successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  }, [endAndDeleteSession, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [cleanup]);

  const question = getCurrentQuestion();

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        cleanup();
        setDescription('');
        setCurrentAnswer('');
      }}
    >
      <div className="min-h-screen bg-dark-800 text-white">
        {(isLoading || isSaving || saveMutation.isPending) && <LoadingOverlay />}
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Wand2 className="h-8 w-8 text-accent-500" />
              <h1 className="text-2xl font-bold">AI Requirements Assistant</h1>
            </div>
            <div className="flex items-center gap-4">
              {saveMutation.isPending && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Save className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              {responses.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                >
                  <History className="h-5 w-5" />
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
              )}
            </div>
          </div>

          {!sessionId ? (
            <div className="space-y-6">
              <div className="bg-dark-700 rounded-lg p-6">
                <label className="block text-sm font-medium mb-2">
                  Describe your project
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell me about the project you want to build..."
                  className="w-full h-32 px-4 py-3 rounded-lg bg-dark-600 border border-dark-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-dark-300">
                    {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                  </span>
                  <button
                    onClick={handleStartAnalysis}
                    disabled={!description.trim() || isLoading}
                    className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Start Analysis
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <ProcessMonitor
                steps={steps}
                currentStep={currentStep}
                canPause={true}
                onPause={actions.pause}
                onResume={actions.resume}
                isPaused={isPaused}
                logs={logs}
                onExport={() => {
                  // Export session data
                  const data = {
                    description,
                    categories,
                    responses,
                    logs
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `requirements-${new Date().toISOString()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              />

              {question && (
                <div className="bg-dark-700 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <MessageSquare className="h-6 w-6 text-accent-500 mt-1" />
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="text-sm text-accent-400 mb-1">
                          {question.category}
                        </div>
                        <h3 className="text-lg font-medium">{question.question}</h3>
                        {question.details && (
                          <p className="mt-1 text-dark-300">{question.details}</p>
                        )}
                      </div>

                      {question.considerations?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-dark-200">
                            Technical Considerations:
                          </h4>
                          {question.considerations.map((consideration: string, index: number) => (
                            <div 
                              key={index}
                              className="bg-dark-600 rounded-lg p-4"
                            >
                              <p className="text-sm text-dark-200">
                                {consideration}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4">
                        <textarea
                          ref={answerInputRef}
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          placeholder="Type your answer..."
                          className="w-full h-32 px-4 py-3 rounded-lg bg-dark-600 border border-dark-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              handleSubmitAnswer();
                            }
                          }}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm text-dark-300">
                            Press ⌘/Ctrl + Enter to submit
                          </p>
                          <button
                            onClick={handleSubmitAnswer}
                            disabled={!currentAnswer.trim() || isLoading}
                            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showHistory && (
                <div className="bg-dark-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Response History</h3>
                  <div className="space-y-4">
                    {responses.map((response: RequirementResponse) => {
                      const responseQuestion = categories
                        .flatMap((c: any) => c.questions)
                        .find((q: any) => q.id === response.questionId);

                      return (
                        <div 
                          key={response.id}
                          className="bg-dark-600 rounded-lg p-4"
                        >
                          <div className="text-sm text-accent-400 mb-1">
                            {categories.find((c: any) => 
                              c.questions.some((q: any) => q.id === response.questionId)
                            )?.name}
                          </div>
                          <p className="font-medium mb-2">
                            {responseQuestion?.question}
                          </p>
                          <p className="text-dark-200">{response.answer}</p>
                          {response.notes && (
                            <p className="mt-2 text-sm text-dark-300">
                              {response.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleEndSession}
                disabled={!sessionId || isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export { ProductSpecGenerator };