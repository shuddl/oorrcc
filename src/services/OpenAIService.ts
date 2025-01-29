// src/services/OpenAIService.ts
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { RateLimiter } from '../middleware/RateLimiter';
import { AIRequestConfig } from '../types/ai.types';

/**
 * A robust service that wraps openai usage. Includes concurrency, error handling, etc.
 */
export class OpenAIService {
  private openai: OpenAI;
  private rateLimiter: RateLimiter;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey,
      maxRetries: 3,
      timeout: 30000,
      dangerouslyAllowBrowser: true
    });

    this.rateLimiter = new RateLimiter({
      windowMs: 60000,
      max: 50
    });
  }

  async generateCompletion(
    prompt: string,
    config: AIRequestConfig = {}
  ): Promise<string> {
    await this.checkRateLimit();

    try {
      logger.debug('OpenAI generateCompletion - prompt start', { 
        promptSnippet: prompt.slice(0, 60) 
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature ?? 0.8,
        max_tokens: config.maxTokens ?? 2000,
        stream: config.stream ?? false
      });

      const fullResponse = response.choices[0]?.message?.content || '';
      logger.debug('OpenAI completion result length', { 
        length: fullResponse.length 
      });
      return fullResponse;
    } catch (error) {
      logger.error('OpenAI error in generateCompletion', { error, prompt });
      throw error;
    }
  }

  private async checkRateLimit(): Promise<void> {
    const mockReq = { ip: '127.0.0.1' } as any;
    const mockRes = { status: () => ({ json: () => {} }) } as any;
    return new Promise((resolve, reject) => {
      this.rateLimiter.middleware(mockReq, mockRes, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}