import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIOrchestrator } from '../../services/AIOrchestrator';
import { OpenAIService } from '../../services/OpenAIService';
import { CodeAnalyzer } from '../../services/CodeAnalyzer';

describe('AIOrchestrator', () => {
  let orchestrator: AIOrchestrator;
  let mockOpenAI: jest.Mocked<OpenAIService>;
  let mockCodeAnalyzer: jest.Mocked<CodeAnalyzer>;

  beforeEach(() => {
    mockOpenAI = {
      generateCompletion: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    } as any;

    mockCodeAnalyzer = {
      analyzeCode: vi.fn()
    } as any;

    orchestrator = new AIOrchestrator();
  });

  describe('Code Analysis and Optimization', () => {
    test('performs complete analysis workflow', async () => {
      const code = 'function test() { return true; }';
      
      mockCodeAnalyzer.analyzeCode.mockResolvedValue({
        quality: { score: 0.8 },
        security: { score: 0.9 },
        performance: { score: 0.7 }
      });

      mockOpenAI.generateCompletion.mockResolvedValue(
        'function optimizedTest() { return true; }'
      );

      const result = await orchestrator.analyzeAndOptimizeCode(code);
      
      expect(result).toHaveProperty('original', code);
      expect(result).toHaveProperty('optimized');
      expect(result.analysis).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    test('handles analysis errors gracefully', async () => {
      mockCodeAnalyzer.analyzeCode.mockRejectedValue(new Error('Analysis failed'));

      await expect(
        orchestrator.analyzeAndOptimizeCode('invalid code')
      ).rejects.toThrow('Analysis failed');
    });
  });
});