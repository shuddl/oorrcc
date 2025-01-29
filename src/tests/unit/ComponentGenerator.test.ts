import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIComponentGenerator } from '../../services/AIComponentGenerator';
import { OpenAIService } from '../../services/OpenAIService';
import { AnalysisEngine } from '../../services/AnalysisEngine';
import { ComponentGenerationRequest } from '../../types/ai.types';

describe('AIComponentGenerator', () => {
  let generator: AIComponentGenerator;
  let mockOpenAI: jest.Mocked<OpenAIService>;
  let mockAnalysisEngine: jest.Mocked<AnalysisEngine>;

  beforeEach(() => {
    mockOpenAI = {
      generateCompletion: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    } as any;

    mockAnalysisEngine = {
      analyzeCode: vi.fn()
    } as any;

    generator = new AIComponentGenerator();
  });

  describe('generateComponent', () => {
    test('generates component with all files', async () => {
      const request: ComponentGenerationRequest = {
        name: 'TestButton',
        type: 'functional',
        description: 'A reusable button component',
        features: ['loading', 'disabled'],
        styling: {
          framework: 'tailwind'
        }
      };

      mockOpenAI.generateCompletion.mockResolvedValue(
        'const TestButton = () => <button>Test</button>;'
      );

      mockAnalysisEngine.analyzeCode.mockResolvedValue({
        performance: { score: 0.95 }
      });

      const result = await generator.generateComponent(request);
      
      expect(result.code).toContain('TestButton');
      expect(result.analysis).toBeDefined();
      expect(mockOpenAI.generateCompletion).toHaveBeenCalled();
    });

    test('returns cached result for identical requests', async () => {
      const request: ComponentGenerationRequest = {
        name: 'CachedComponent',
        type: 'functional',
        description: 'Test caching'
      };

      mockOpenAI.generateCompletion.mockResolvedValue(
        'const CachedComponent = () => <div>Cached</div>;'
      );

      const result1 = await generator.generateComponent(request);
      const result2 = await generator.generateComponent(request);

      expect(result1).toEqual(result2);
      expect(mockOpenAI.generateCompletion).toHaveBeenCalledTimes(1);
    });

    test('handles generation errors gracefully', async () => {
      const request: ComponentGenerationRequest = {
        name: 'ErrorComponent',
        type: 'functional',
        description: 'Test error handling'
      };

      mockOpenAI.generateCompletion.mockRejectedValue(new Error('API Error'));

      await expect(generator.generateComponent(request)).rejects.toThrow();
    });
  });

  describe('optimizeComponent', () => {
    test('optimizes component when performance is low', async () => {
      const code = 'const SlowComponent = () => <div>Slow</div>;';
      
      mockAnalysisEngine.analyzeCode.mockResolvedValueOnce({
        performance: { score: 0.7 }
      });

      mockOpenAI.generateCompletion.mockResolvedValue(
        'const OptimizedComponent = () => <div>Fast</div>;'
      );

      const result = await generator.optimizeComponent(code, 'SlowComponent');
      
      expect(result.code).toContain('OptimizedComponent');
      expect(mockOpenAI.generateCompletion).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('terminates properly', () => {
      const removeListenersSpy = vi.spyOn(generator, 'removeAllListeners');
      generator.terminate();
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});