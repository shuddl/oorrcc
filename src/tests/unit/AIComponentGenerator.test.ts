import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIComponentGenerator } from '../../services/AIComponentGenerator';
import { OpenAIService } from '../../services/OpenAIService';
import { AnalysisEngine } from '../../services/AnalysisEngine';
import { ComponentTemplate, GenerationContext } from '../../types/generation.types';

// Mock dependencies
vi.mock('../../services/OpenAIService');
vi.mock('../../services/AnalysisEngine');

describe('AIComponentGenerator', () => {
  let generator: AIComponentGenerator;
  let mockOpenAI: jest.Mocked<OpenAIService>;
  let mockAnalysisEngine: jest.Mocked<AnalysisEngine>;

  beforeEach(() => {
    mockOpenAI = new OpenAIService() as jest.Mocked<OpenAIService>;
    mockAnalysisEngine = new AnalysisEngine() as jest.Mocked<AnalysisEngine>;
    generator = new AIComponentGenerator();
  });

  describe('generateProjectStructure', () => {
    test('generates valid project structure from description', async () => {
      const description = 'A React dashboard with authentication';
      const mockResponse = JSON.stringify({
        modules: [
          {
            id: 'auth',
            name: 'Authentication',
            description: 'User authentication module',
            dependencies: [],
            files: [
              {
                path: 'src/auth/AuthProvider.tsx',
                type: 'component',
                description: 'Authentication context provider'
              }
            ],
            order: 1
          }
        ]
      });

      mockOpenAI.generateCompletion.mockResolvedValue(mockResponse);

      const result = await generator.generateProjectStructure(description);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Authentication');
      expect(mockOpenAI.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining(description)
      );
    });

    test('handles empty description', async () => {
      await expect(generator.generateProjectStructure('')).rejects.toThrow();
    });

    test('handles invalid AI response', async () => {
      mockOpenAI.generateCompletion.mockResolvedValue('invalid json');
      await expect(generator.generateProjectStructure('test')).rejects.toThrow();
    });
  });

  describe('generateNextModule', () => {
    test('generates module files and analysis', async () => {
      const mockModule = {
        id: 'test',
        name: 'Test Module',
        description: 'Test description',
        dependencies: [],
        files: [
          {
            path: 'src/test/Test.tsx',
            type: 'component',
            description: 'Test component'
          }
        ],
        order: 1
      };

      mockOpenAI.generateCompletion.mockResolvedValue('const Test = () => <div>Test</div>;');
      mockAnalysisEngine.analyzeCode.mockResolvedValue({
        semanticAnalysis: {
          complexityMetrics: { cyclomaticComplexity: 1 },
          qualityIndicators: { coverage: 0.9, quality: 0.95 }
        },
        performanceMetrics: { optimizationPotential: 0.8 }
      });

      const result = await generator.generateNextModule();
      expect(result).toBeDefined();
      if (result) {
        expect(result.files.size).toBeGreaterThan(0);
        expect(result.analysis).toBeDefined();
      }
    });

    test('handles no more modules to generate', async () => {
      const result = await generator.generateNextModule();
      expect(result).toBeNull();
    });
  });

  describe('generateComponentWithContext', () => {
    const template: ComponentTemplate = {
      name: 'TestComponent',
      type: 'component',
      description: 'A test component',
      props: [{ name: 'test', type: 'string', required: true, description: 'Test prop' }],
      state: [],
      methods: []
    };

    const context: GenerationContext = {
      projectName: 'test',
      description: 'test project',
      architecture: {
        framework: 'react',
        styling: 'tailwind',
        stateManagement: 'zustand',
        testing: 'vitest'
      },
      requirements: {
        performance: true,
        accessibility: true,
        i18n: false,
        seo: false,
        testing: true,
        documentation: true
      },
      dependencies: {
        required: [],
        optional: []
      }
    };

    test('generates valid component code', async () => {
      mockOpenAI.generateCompletion.mockResolvedValue('const TestComponent = () => <div>Test</div>;');
      mockAnalysisEngine.analyzeCode.mockResolvedValue({
        performance: { score: 0.95 }
      });

      const result = await (generator as any).generateComponentWithContext(template, context);
      expect(result).toContain('TestComponent');
      expect(mockOpenAI.generateCompletion).toHaveBeenCalled();
    });

    test('optimizes component when performance score is low', async () => {
      mockOpenAI.generateCompletion.mockResolvedValueOnce('const Test = () => <div>Test</div>;');
      mockAnalysisEngine.analyzeCode.mockResolvedValueOnce({
        performance: { score: 0.8 }
      });
      mockAnalysisEngine.analyzeCode.mockResolvedValueOnce({
        performance: { score: 0.95 }
      });

      const result = await (generator as any).generateComponentWithContext(template, context);
      expect(mockOpenAI.generateCompletion).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    test('handles validation errors', async () => {
      const invalidTemplate = { ...template, name: '' };
      await expect((generator as any).generateComponentWithContext(invalidTemplate, context))
        .rejects.toThrow();
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