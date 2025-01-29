import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { AIOrchestrator } from './AIOrchestrator';
import { retryOperation } from '../utils/retry';
import { 
  RequirementQuestion,
  RequirementResponse,
  RequirementCategory,
  RequirementSummary 
} from '../types/requirements.types';
import { AIError } from '../types/ai.types';

interface RequirementsState {
  categories: RequirementCategory[];
  responses: RequirementResponse[];
  currentQuestion: string | null;
  summary?: RequirementSummary[];
}

interface SessionMetadata {
  lastUpdated: string;
  completionPercentage: number;
  status: 'active' | 'paused' | 'completed';
  timeSpent: number;
}

export class RequirementsService extends EventEmitter {
  private ai: AIOrchestrator;
  private currentSession: string | null = null;
  private state: RequirementsState = {
    categories: [],
    responses: [],
    currentQuestion: null
  };
  private sessionStartTime: number = 0;
  private questionStartTime: number = 0;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
    this.ai = new AIOrchestrator();
    this.setupAutoSave();
  }

  async initialize(userId: string): Promise<void> {
    try {
      // Check for existing session
      const { data: session } = await supabase
        .from('requirement_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (session) {
        await this.loadSession(session.id, session.state);
      }

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize requirements service', { error });
      throw error;
    }
  }

  async startSession(
    description: string,
    analysisResult: any
  ): Promise<{ id: string; categories: RequirementCategory[] }> {
    try {
      // Generate initial questions based on AI analysis
      const categories = await this.generateInitialQuestions(description, analysisResult);

      // Create session in database
      const { data: session, error } = await supabase
        .from('requirement_sessions')
        .insert({
          description,
          state: {
            categories,
            responses: [],
            currentQuestion: categories[0]?.questions[0]?.id || null
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize state
      this.currentSession = session.id;
      this.state = {
        categories,
        responses: [],
        currentQuestion: categories[0]?.questions[0]?.id || null
      };

      this.sessionStartTime = Date.now();
      this.questionStartTime = Date.now();

      // Start real-time subscription
      await this.setupRealtimeSubscription(session.id);

      this.emit('sessionStarted', {
        sessionId: session.id,
        categories
      });

      return {
        id: session.id,
        categories
      };
    } catch (error) {
      logger.error('Failed to start requirements session', { error });
      throw error;
    }
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answer: string | boolean,
    context?: string
  ): Promise<{
    response: RequirementResponse;
    nextQuestion: string | null;
  }> {
    try {
      // Validate session
      if (sessionId !== this.currentSession) {
        throw new Error('Invalid session ID');
      }

      // Process answer with AI
      const processedAnswer = await this.processAnswer(answer, questionId, context);

      // Create response
      const response: RequirementResponse = {
        id: crypto.randomUUID(),
        questionId,
        answer: processedAnswer.answer,
        notes: processedAnswer.notes,
        timestamp: Date.now()
      };

      // Update state
      this.state.responses.push(response);
      
      // Calculate next question
      const nextQuestion = await this.determineNextQuestion(questionId, processedAnswer);
      this.state.currentQuestion = nextQuestion;

      // Update session in database
      await this.saveState();

      // Calculate metrics
      const timeSpent = Date.now() - this.questionStartTime;
      this.questionStartTime = Date.now();

      this.emit('answerSubmitted', {
        response,
        nextQuestion,
        metrics: {
          timeSpent,
          totalResponses: this.state.responses.length,
          completionPercentage: this.calculateCompletionPercentage()
        }
      });

      return {
        response,
        nextQuestion
      };
    } catch (error) {
      logger.error('Failed to submit answer', { error });
      throw error;
    }
  }

  async generateSummary(sessionId: string): Promise<RequirementSummary[]> {
    try {
      // Validate session
      if (sessionId !== this.currentSession) {
        throw new Error('Invalid session ID');
      }

      // Generate summary using AI
      const summary = await this.generateAISummary(
        this.state.categories,
        this.state.responses
      );

      // Update state
      this.state.summary = summary;

      // Save to database
      await this.saveState();

      this.emit('summaryGenerated', { summary });

      return summary;
    } catch (error) {
      logger.error('Failed to generate summary', { error });
      throw error;
    }
  }

  private async generateInitialQuestions(
    description: string,
    analysisResult: any
  ): Promise<RequirementCategory[]> {
    try {
      const prompt = `
        Based on this project description and analysis, generate comprehensive requirements gathering questions:
        
        Description: ${description}
        
        Analysis: ${JSON.stringify(analysisResult, null, 2)}
        
        Generate questions for these categories:
        1. Core Functionality
        2. User Experience
        3. Technical Architecture
        4. Security & Compliance
        5. Performance & Scalability
        
        For each question:
        - Make it specific and focused
        - Include technical considerations
        - Provide example approaches
        - Keep language clear
      `;

      const response = await this.ai.analyzeAndOptimizeCode(prompt, {
        useCache: true
      });

      return this.parseQuestionsResponse(response);
    } catch (error) {
      logger.error('Failed to generate initial questions', { error });
      throw error;
    }
  }

  private async processAnswer(
    answer: string | boolean,
    questionId: string,
    context?: string
  ): Promise<{
    answer: string | boolean;
    notes?: string;
    followUpQuestions?: RequirementQuestion[];
  }> {
    try {
      const question = this.findQuestion(questionId);
      if (!question) throw new Error('Question not found');

      const prompt = `
        Analyze this answer in the context of the question:
        
        Question: ${question.question}
        Answer: ${answer}
        ${context ? `Additional Context: ${context}` : ''}
        
        Provide:
        1. Validation of the answer
        2. Technical implications
        3. Potential follow-up questions
        4. Implementation considerations
      `;

      const analysis = await this.ai.analyzeAndOptimizeCode(prompt, {
        useCache: true
      });

      return this.parseAnswerAnalysis(analysis);
    } catch (error) {
      logger.error('Failed to process answer', { error });
      throw error;
    }
  }

  private async determineNextQuestion(
    currentQuestionId: string,
    processedAnswer: any
  ): Promise<string | null> {
    const currentCategory = this.findQuestionCategory(currentQuestionId);
    if (!currentCategory) return null;

    // Check for follow-up questions based on answer
    if (processedAnswer.followUpQuestions?.length > 0) {
      // Add follow-up questions to current category
      currentCategory.questions.push(...processedAnswer.followUpQuestions);
      return processedAnswer.followUpQuestions[0].id;
    }

    // Find next question in current category
    const currentIndex = currentCategory.questions.findIndex(
      q => q.id === currentQuestionId
    );
    
    if (currentIndex < currentCategory.questions.length - 1) {
      return currentCategory.questions[currentIndex + 1].id;
    }

    // Move to next category
    const categoryIndex = this.state.categories.findIndex(
      c => c.id === currentCategory.id
    );
    
    if (categoryIndex < this.state.categories.length - 1) {
      const nextCategory = this.state.categories[categoryIndex + 1];
      return nextCategory.questions[0]?.id || null;
    }

    return null;
  }

  private findQuestion(questionId: string): RequirementQuestion | null {
    for (const category of this.state.categories) {
      const question = category.questions.find(q => q.id === questionId);
      if (question) return question;
    }
    return null;
  }

  private findQuestionCategory(questionId: string): RequirementCategory | null {
    return this.state.categories.find(category =>
      category.questions.some(q => q.id === questionId)
    ) || null;
  }

  private calculateCompletionPercentage(): number {
    const totalQuestions = this.state.categories.reduce(
      (sum, category) => sum + category.questions.length,
      0
    );
    return (this.state.responses.length / totalQuestions) * 100;
  }

  private async setupRealtimeSubscription(sessionId: string): Promise<void> {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requirement_sessions',
          filter: `id=eq.${sessionId}`
        }, 
        async (payload) => {
          try {
            const newState = payload.new?.state;
            if (newState) {
              await this.loadSession(sessionId, newState);
            }
          } catch (error) {
            logger.error('Failed to handle real-time update', { error });
            this.emit('error', new Error('Failed to sync changes'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private async saveState(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const { error } = await supabase
        .from('requirement_sessions')
        .update({
          state: this.state,
          last_synced: new Date().toISOString()
        })
        .eq('id', this.currentSession);

      if (error) throw error;

      this.emit('stateSaved');
    } catch (error) {
      logger.error('Failed to save state', { error });
      throw error;
    }
  }

  private setupAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      if (this.currentSession) {
        try {
          await this.saveState();
        } catch (error) {
          logger.error('Auto-save failed', { error });
        }
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  async loadSession(id: string, state: RequirementsState): Promise<void> {
    try {
      this.currentSession = id;
      this.state = state;
      this.emit('sessionLoaded', { id, state });
    } catch (error) {
      logger.error('Failed to load session', { error });
      throw error;
    }
  }

  private async generateAISummary(
    categories: RequirementCategory[],
    responses: RequirementResponse[]
  ): Promise<RequirementSummary[]> {
    try {
      const prompt = `
        Generate a comprehensive technical summary based on these requirements:
        
        Categories: ${JSON.stringify(categories, null, 2)}
        Responses: ${JSON.stringify(responses, null, 2)}
        
        Provide:
        1. Key technical decisions
        2. Architecture recommendations
        3. Implementation priorities
        4. Risk assessment
        5. Resource requirements
      `;

      const result = await this.ai.analyzeAndOptimizeCode(prompt, {
        useCache: true
      });

      return this.parseSummaryResponse(result);
    } catch (error) {
      logger.error('Failed to generate AI summary', { error });
      throw error;
    }
  }

  private parseQuestionsResponse(response: any): RequirementCategory[] {
    // Implementation of response parsing
    return [];
  }

  private parseAnswerAnalysis(analysis: any): any {
    // Implementation of analysis parsing
    return {};
  }

  private parseSummaryResponse(response: any): RequirementSummary[] {
    // Implementation of summary parsing
    return [];
  }

  getSessionMetadata(): SessionMetadata {
    return {
      lastUpdated: new Date().toISOString(),
      completionPercentage: this.calculateCompletionPercentage(),
      status: this.state.currentQuestion ? 'active' : 'completed',
      timeSpent: Date.now() - this.sessionStartTime
    };
  }

  async cleanup(): Promise<void> {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    if (this.currentSession) {
      await this.saveState();
    }

    this.removeAllListeners();
  }
}