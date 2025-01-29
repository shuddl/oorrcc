import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIModelTrainer } from '../../services/AIModelTrainer';
import { OpenAIService } from '../../services/OpenAIService';

describe('AIModelTrainer', () => {
  let trainer: AIModelTrainer;
  let mockOpenAI: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    mockOpenAI = {
      generateCompletion: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    } as any;

    trainer = new AIModelTrainer({ batchSize: 10 });
  });

  describe('Data Collection', () => {
    test('collects and stores training data', async () => {
      const input = 'test input';
      const output = 'test output';

      await trainer.collectTrainingData(input, output);
      expect(trainer.getTrainingDataSize()).toBe(1);
    });

    test('triggers training when batch size reached', async () => {
      const trainSpy = vi.spyOn(trainer, 'trainModel');
      
      for (let i = 0; i < 10; i++) {
        await trainer.collectTrainingData('input', 'output');
      }

      expect(trainSpy).toHaveBeenCalled();
    });
  });

  describe('Model Training', () => {
    test('processes training data in batches', async () => {
      mockOpenAI.generateCompletion.mockResolvedValue('test prediction');

      for (let i = 0; i < 5; i++) {
        await trainer.collectTrainingData('input', 'output');
      }

      const metrics = await trainer.trainModel();
      
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('loss');
      expect(metrics.epoch).toBeGreaterThan(0);
    });

    test('handles training errors gracefully', async () => {
      mockOpenAI.generateCompletion.mockRejectedValue(new Error('API Error'));

      await trainer.collectTrainingData('input', 'output');
      await expect(trainer.trainModel()).rejects.toThrow();
    });

    test('prevents concurrent training sessions', async () => {
      const trainingPromise = trainer.trainModel();
      await expect(trainer.trainModel()).rejects.toThrow('Training already in progress');
      await trainingPromise;
    });
  });

  describe('Metrics', () => {
    test('tracks and returns training metrics', async () => {
      mockOpenAI.generateCompletion.mockResolvedValue('test output');

      await trainer.collectTrainingData('input', 'output');
      await trainer.trainModel();

      const metrics = trainer.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toHaveProperty('accuracy');
      expect(metrics[0].accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics[0].accuracy).toBeLessThanOrEqual(1);
    });

    test('calculates similarity correctly', async () => {
      await trainer.collectTrainingData('test input', 'test output');
      const metrics = await trainer.trainModel();
      
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Utility Functions', () => {
    test('clears training data', async () => {
      await trainer.collectTrainingData('input', 'output');
      expect(trainer.getTrainingDataSize()).toBe(1);

      trainer.clearTrainingData();
      expect(trainer.getTrainingDataSize()).toBe(0);
    });

    test('reports training status correctly', async () => {
      expect(trainer.isCurrentlyTraining()).toBe(false);
      
      const trainingPromise = trainer.trainModel();
      expect(trainer.isCurrentlyTraining()).toBe(true);
      
      await trainingPromise;
      expect(trainer.isCurrentlyTraining()).toBe(false);
    });
  });
});