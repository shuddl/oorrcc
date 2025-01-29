import { EventEmitter } from '../lib/events';
import { AIModelService } from './AIModelService';
import { ContextManager } from './memory/ContextManager';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { StateManager } from './persistence/StateManager';
import { AIModelTrainer } from './AIModelTrainer';
import type { 
  RequirementQuestion,
  RequirementResponse,
  RequirementCategory,
  RequirementSummary 
} from '../types/requirements.types';

interface SessionState {
  categories: RequirementCategory[];
  responses: RequirementResponse[];
  currentQuestion: string | null;
}

export class RequirementsOrchestrator extends EventEmitter {
  private aiModel: AIModelService;
  private contextManager: ContextManager;
  private currentSession: string | null = null;
  private realtimeSubscription: any = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private aiModelTrainer: AIModelTrainer;

  constructor() {
    super();
    this.aiModel = new AIModelService();
    this.contextManager = new ContextManager();
    this.stateManager = new StateManager();
    this.aiModelTrainer = new AIModelTrainer();

    // Setup error handling
    this.on('error', (error) => {
      logger.error('RequirementsOrchestrator error', { error });
    });
  }

  async startSession(description: string): Promise<string> {
    try {
      // Create new session
      const { data: session, error } = await supabase
        .from('requirement_sessions')
        .insert({
          description,
          state: {
            categories: [],
            responses: [],
            currentQuestion: null
          }
        })
        .select()
        .single();

      if (error) throw error;

      this.currentSession = session.id;
      
      // Initialize context
      this.contextManager.addContext(
        `session:${session.id}`,
        description,
        2 // High priority for session context
      );

      // Setup realtime subscription
      await this.setupRealtimeSubscription(session.id);

      logger.info('Requirements session started', { sessionId: session.id });
      return session.id;
    } catch (error) {
      logger.error('Failed to start session', { error });
      throw error;
    }
  }

  async generateQuestions(description: string): Promise<RequirementCategory[]> {
    try {
      const prompt = this.buildQuestionsPrompt(description);
      const response = await this.executeWithRetry(() => 
        this.aiModel.generateCompletion(prompt)
      );
      
      const categories = this.parseCategories(response);
      
      // Store categories in context and database
      if (this.currentSession) {
        await this.updateSessionState({
          categories,
          responses: [],
          currentQuestion: categories[0]?.questions[0]?.id || null
        });

        categories.forEach(category => {
          this.contextManager.addContext(
            `category:${category.id}`,
            JSON.stringify(category)
          );
        });
      }

      return categories;
    } catch (error) {
      logger.error('Failed to generate questions', { error });
      throw error;
    }
  }

  async processAnswer(
    questionId: string,
    answer: string | boolean,
    context: string
  ): Promise<RequirementQuestion[]> {
    try {
      // Get relevant context
      const sessionContext = this.currentSession ? 
        this.contextManager.getContext(`session:${this.currentSession}`) : null;

      const prompt = this.buildFollowUpPrompt(
        questionId,
        answer,
        context,
        sessionContext
      );

      const response = await this.executeWithRetry(() =>
        this.aiModel.generateCompletion(prompt)
      );

      const followUps = this.parseFollowUps(response);

      // Store follow-ups in context
      this.contextManager.addContext(
        `followup:${questionId}`,
        JSON.stringify(followUps)
      );

      // Update session state if needed
      if (this.currentSession) {
        const currentState = await this.getCurrentState();
        if (currentState) {
          const updatedResponses = [...currentState.responses, {
            id: crypto.randomUUID(),
            questionId,
            answer,
            timestamp: Date.now()
          }];

          await this.updateSessionState({
            ...currentState,
            responses: updatedResponses
          });
        }
      }

      return followUps;
    } catch (error) {
      logger.error('Failed to process answer', { error });
      throw error;
    }
  }

  async generateSummary(responses: RequirementResponse[]): Promise<RequirementSummary[]> {
    try {
      // Get all relevant context
      const sessionContext = this.currentSession ? 
        this.contextManager.getContext(`session:${this.currentSession}`) : null;

      const prompt = this.buildSummaryPrompt(responses, sessionContext);
      const response = await this.executeWithRetry(() =>
        this.aiModel.generateCompletion(prompt)
      );
      
      return this.parseSummary(response);
    } catch (error) {
      logger.error('Failed to generate summary', { error });
      throw error;
    }
  }

  private async getCurrentState(): Promise<SessionState | null> {
    if (!this.currentSession) return null;

    try {
      const { data, error } = await supabase
        .from('requirement_sessions')
        .select('state')
        .eq('id', this.currentSession)
        .single();

      if (error) throw error;
      return data.state as SessionState;
    } catch (error) {
      logger.error('Failed to get current state', { error });
      return null;
    }
  }

  private async updateSessionState(state: SessionState): Promise<void> {
    if (!this.currentSession) return;

    try {
      const { error } = await supabase
        .from('requirement_sessions')
        .update({
          state,
          last_synced: new Date().toISOString()
        })
        .eq('id', this.currentSession);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update session state', { error });
      throw error;
    }
  }

  private async setupRealtimeSubscription(
    sessionId: string, 
    withHealthCheck: boolean = false
  ): Promise<void> {
    // Clean up existing subscription
    if (this.realtimeSubscription) {
      await supabase.removeChannel(this.realtimeSubscription);
    }

    // Subscribe with health monitoring
    this.realtimeSubscription = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requirement_sessions',
          filter: `id=eq.${sessionId}`
        }, 
        this.handleRealtimeUpdate.bind(this)
      )
      .on('error', (error) => {
        logger.error('Realtime subscription error', { error });
        this.emit('subscriptionError', error);
        this.recoverState();
      })
      .subscribe();

    if (withHealthCheck) {
      // Verify subscription health
      const isHealthy = await this.checkSubscriptionHealth(sessionId);
      if (!isHealthy) {
        throw new Error('Failed to establish healthy subscription');
      }
    }
  }

  private async handleRealtimeUpdate(payload: any) {
    try {
      const { new: newData } = payload;
      
      if (newData?.state && this.validateSessionState(newData.state)) {
        // Update local state
        this.emit('stateUpdated', newData.state);
        
        // Update context with validation
        if (newData.state.categories) {
          await this.restoreContext(newData);
        }
      }
    } catch (error) {
      logger.error('Failed to handle realtime update', { error });
      await this.recoverState(); // Attempt recovery on error
    }
  }

  private async recoverState(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Fetch latest state with exponential backoff
      const session = await this.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('requirement_sessions')
          .select('*')
          .eq('id', this.currentSession)
          .single();

        if (error) throw error;
        return data;
      });

      // Verify state integrity
      if (!this.validateSessionState(session.state)) {
        throw new Error('Invalid session state');
      }

      // Restore context with validation
      await this.restoreContext(session);

      // Reestablish realtime connection with health check
      await this.setupRealtimeSubscription(this.currentSession, true);

      this.emit('stateRecovered', session);
    } catch (error) {
      logger.error('State recovery failed', { error });
      throw error;
    }
  }

  private validateSessionState(state: any): boolean {
    return state && 
           Array.isArray(state.categories) && 
           Array.isArray(state.responses);
  }

  private async restoreContext(session: any): Promise<void> {
    // Restore with validation
    if (session.state?.categories) {
      try {
        const categories = JSON.parse(JSON.stringify(session.state.categories));
        this.contextManager.addContext(
          `categories:${this.currentSession}`,
          JSON.stringify(categories),
          2 // High priority for categories
        );
      } catch (error) {
        logger.error('Failed to restore categories context', { error });
        throw error;
      }
    }
  }

  private async checkSubscriptionHealth(sessionId: string): Promise<boolean> {
    try {
      const testUpdate = { timestamp: Date.now() };
      const { error } = await supabase
        .from('requirement_sessions')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', sessionId);

      return !error;
    } catch {
      return false;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const delay = this.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private buildQuestionsPrompt(description: string): string {
    return `
      Analyze this project description and generate a comprehensive set of requirements gathering questions.
      Group questions into logical categories. Each question should be specific and actionable.

      Project Description: "${description}"

      Return the response in this exact JSON format:
      {
        "categories": [
          {
            "id": "string (uuid)",
            "name": "string",
            "description": "string",
            "order": number,
            "completed": false,
            "questions": [
              {
                "id": "string (uuid)",
                "question": "string",
                "type": "yesno" | "choice" | "text",
                "choices": ["string"] | null,
                "details": ["string"],
                "considerations": ["string"],
                "required": true
              }
            ]
          }
        ]
      }

      Categories must include:
      1. Core Functionality
      2. User Experience
      3. Technical Architecture
      4. Security & Compliance
      5. Performance & Scalability

      For each question:
      - Make it specific and focused on one aspect
      - Include 2-3 key technical considerations
      - Provide example approaches where relevant
      - Keep language clear and non-technical
    `;
  }

  private buildFollowUpPrompt(
    questionId: string,
    answer: string | boolean,
    context: string,
    sessionContext: string | null
  ): string {
    return `
      Based on the previous context and answer, generate follow-up questions:

      ${sessionContext ? `Project Context: ${sessionContext}\n` : ''}
      Question Context: ${context}
      Answer: ${answer}

      Generate 2-3 follow-up questions that:
      1. Are specific and focused
      2. Help clarify technical requirements
      3. Can be answered simply
      4. Include relevant technical considerations
    `;
  }

  private buildSummaryPrompt(
    responses: RequirementResponse[],
    sessionContext: string | null
  ): string {
    return `
      Based on these requirement responses and context, generate a comprehensive technical summary:

      ${sessionContext ? `Project Context: ${sessionContext}\n` : ''}
      Responses: ${JSON.stringify(responses, null, 2)}

      Format the summary as:
      1. Key Decisions
      2. Technical Requirements
      3. Implementation Considerations
      4. Next Steps
    `;
  }

  private parseCategories(response: string): RequirementCategory[] {
    try {
      // Remove any markdown code block markers
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '');
      const parsed = JSON.parse(cleanResponse);

      if (!parsed?.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Invalid response structure');
      }

      return parsed.categories.map((category: any, index: number) => ({
        id: category.id || crypto.randomUUID(),
        name: category.name || `Category ${index + 1}`,
        description: category.description || '',
        questions: this.validateAndTransformQuestions(category.questions || []),
        completed: false,
        order: index
      }));
    } catch (error) {
      logger.error('Failed to parse categories', { error });
      return [];
    }
  }

  private validateAndTransformQuestions(questions: any[]): RequirementQuestion[] {
    if (!Array.isArray(questions)) return [];

    return questions.map(q => ({
      id: q.id || crypto.randomUUID(),
      question: q.question || 'Invalid question',
      type: this.validateQuestionType(q.type),
      choices: Array.isArray(q.choices) ? q.choices : undefined,
      details: Array.isArray(q.details) ? q.details : [],
      considerations: Array.isArray(q.considerations) ? q.considerations : [],
      required: q.required !== false
    }));
  }

  private validateQuestionType(type: string): 'yesno' | 'choice' | 'text' {
    const validTypes = ['yesno', 'choice', 'text'];
    return validTypes.includes(type) ? type as 'yesno' | 'choice' | 'text' : 'text';
  }

  private parseFollowUps(response: string): RequirementQuestion[] {
    try {
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      logger.error('Failed to parse follow-ups', { error });
      return [];
    }
  }

  private parseSummary(response: string): RequirementSummary[] {
    try {
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      logger.error('Failed to parse summary', { error });
      return [];
    }
  }

  endSession(): void {
    if (this.currentSession) {
      logger.info('Requirements session ended', { 
        sessionId: this.currentSession 
      });
      this.currentSession = null;
    }
    this.contextManager.clear();
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  async endAndDeleteSession(): Promise<void> {
    if (!this.currentSession) {
      logger.warn('No active session to delete');
      return;
    }

    try {
      await this.stateManager.deleteState(this.currentSession);
      this.currentSession = null;
      this.realtimeSubscription = null;
      logger.info('Session ended and deleted successfully');
      this.emit('sessionDeleted');
    } catch (error) {
      logger.error('Failed to delete session', { error });
      throw error;
    }
  }

  // Example method to train the AI model
  async trainAIModel(categories: RequirementCategory[]): Promise<void> {
    try {
      await this.aiModelTrainer.trainModel(categories);
      logger.info('AI model training initiated');
    } catch (error) {
      logger.error('AI model training failed', { error });
      throw error;
    }
  }
}