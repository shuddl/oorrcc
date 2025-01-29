import { describe, test, expect, beforeEach } from 'vitest';
import { AIModelService } from '../../services/AIModelService';
import { OpenAIService } from '../../services/OpenAIService';

describe('AIService Integration Tests', () => {
  let aiService: AIModelService;

  beforeEach(() => {
    aiService = new AIModelService();
  });

  describe('End-to-end generation', () => {
    test('generates complete project specification', async () => {
      const description = 'Create a React dashboard with authentication and data visualization';
      
      const result = await aiService.generateSpec(description, { stream: false });
      
      expect(result).toHaveProperty('spec');
      expect(result).toHaveProperty('analysis');
      expect(result.spec.version).toBeDefined();
      expect(result.spec.systemDefinition).toBeDefined();
      expect(result.spec.core_features).toBeInstanceOf(Array);
    }, 30000); // Longer timeout for API call

    test('handles streaming responses', async () => {
      const description = 'Simple todo app';
      const chunks: string[] = [];
      
      aiService.on('chunk', (chunk: string) => {
        chunks.push(chunk);
      });

      await aiService.generateSpec(description, { stream: true });
      
      expect(chunks.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error handling', () => {
    test('handles rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(10).fill(0).map(() => 
        aiService.generateCompletion('test')
      );

      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(rejected.length).toBeGreaterThan(0);
    });

    test('handles timeout', async () => {
      const slowPrompt = 'a'.repeat(10000); // Large input to potentially trigger timeout
      await expect(aiService.generateCompletion(slowPrompt)).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    test('handles invalid API key', async () => {
      const invalidService = new OpenAIService();
      // @ts-ignore - Accessing private property for testing
      invalidService.apiKey = 'invalid-key';

      await expect(invalidService.generateCompletion('test'))
        .rejects.toThrow();
    });
  });
});