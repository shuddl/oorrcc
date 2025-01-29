// AIModelTrainer.ts
import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { OpenAIService } from './OpenAIService';
import { TrainingConfig, TrainingMetrics } from '../types/ai.types';
import { AIModelService } from './AIModelService';
import { RequirementCategory, RequirementQuestion } from '../types/requirements.types';

export class AIModelTrainer extends EventEmitter {
  private openai: OpenAIService;
  private aiModel: AIModelService;
  private trainingData: Array<{
    input: string;
    output: string;
    timestamp: number;
    metrics?: TrainingMetrics;
  }> = [];
  private metrics: TrainingMetrics[] = [];
  private isTraining = false;
  private batchSize = 100;
  private readonly MAX_RETRIES = 3;
  private concurrency = 2; // number of parallel items to train?

  constructor(config?: Partial<TrainingConfig>) {
    super();
    this.openai = new OpenAIService();
    this.aiModel = new AIModelService();
    if (config?.batchSize) {
      this.batchSize = config.batchSize;
    }
  }

  async collectTrainingData(input: string, output: string): Promise<void> {
    this.trainingData.push({
      input,
      output,
      timestamp: Date.now()
    });
    logger.info('Training data collected', {
      dataPoints: this.trainingData.length,
      batchSize: this.batchSize
    });

    if (this.trainingData.length >= this.batchSize) {
      await this.trainModel();
    }
  }

  /**
   * Train the model in batches. This is a simplified approach,
   * but can be extended for real fine-tuning if we had an actual
   * OpenAI or local model fine-tuning endpoint.
   */
  async trainModel(config?: Partial<TrainingConfig>): Promise<TrainingMetrics> {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }
    this.isTraining = true;
    try {
      const localBatchSize = config?.batchSize || this.batchSize;
      let retries = 0;

      const batches = this.chunkArray(this.trainingData, localBatchSize);
      const batchMetrics: TrainingMetrics[] = [];

      for (const batch of batches) {
        try {
          const metrics = await this.processBatch(batch);
          batchMetrics.push(metrics);
          this.emit('batchCompleted', { metrics, remaining: batches.length });
        } catch (error) {
          if (retries < this.MAX_RETRIES) {
            retries++;
            logger.warn('Retrying batch processing', { retries, error });
            continue;
          }
          throw error;
        }
      }

      const finalMetrics = this.calculateAggregateMetrics(batchMetrics);
      this.metrics.push(finalMetrics);
      this.trainingData = []; // Clear data after training
      logger.info('Model training completed', { finalMetrics });
      this.emit('trainingCompleted', finalMetrics);

      return finalMetrics;
    } catch (error) {
      logger.error('Model training failed', { error });
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  private async processBatch(batch: typeof this.trainingData): Promise<TrainingMetrics> {
    // The real approach might do actual fine-tuning or calls to the OpenAIService
    // For demonstration, we compute a mock “accuracy” by comparing outputs
    const startTime = Date.now();
    let correctPredictions = 0;
    let totalLoss = 0;

    // Potential concurrency approach:
    const chunkPromises: Array<Promise<void>> = [];
    const chunkSize = Math.ceil(batch.length / this.concurrency);

    for (let i = 0; i < batch.length; i += chunkSize) {
      const slice = batch.slice(i, i + chunkSize);

      const promise = (async () => {
        for (const sample of slice) {
          // Simulate some call
          const prediction = await this.openai.generateCompletion(sample.input, {
            maxTokens: 100
          });
          const accuracy = this.calculateSimilarity(prediction, sample.output);
          totalLoss += 1 - accuracy;
          if (accuracy >= 0.9) correctPredictions++;
        }
      })();
      chunkPromises.push(promise);
    }

    await Promise.all(chunkPromises);

    const metrics: TrainingMetrics = {
      accuracy: correctPredictions / batch.length,
      loss: totalLoss / batch.length,
      epoch: this.metrics.length + 1,
      validationAccuracy: this.validateModel(batch),
      validationLoss: totalLoss / batch.length
    };

    logger.info('Batch processed', { size: batch.length, metrics, duration: Date.now() - startTime });
    return metrics;
  }

  private calculateSimilarity(prediction: string, actual: string): number {
    if (!prediction || !actual) return 0;
    const dist = this.levenshteinDistance(prediction, actual);
    const maxLength = Math.max(prediction.length, actual.length) || 1;
    return 1 - dist / maxLength;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  }

  private validateModel(batch: typeof this.trainingData): number {
    // Minimal simulation. Real usage might test on a hold-out set
    let sum = 0;
    for (const sample of batch) {
      const accuracy = this.calculateSimilarity(sample.input, sample.output);
      sum += accuracy;
    }
    return sum / batch.length;
  }

  private calculateAggregateMetrics(batchMetrics: TrainingMetrics[]): TrainingMetrics {
    const sum = batchMetrics.reduce((acc, m) => ({
      accuracy: acc.accuracy + m.accuracy,
      loss: acc.loss + m.loss,
      validationAccuracy: acc.validationAccuracy + (m.validationAccuracy || 0),
      validationLoss: acc.validationLoss + (m.validationLoss || 0),
      epoch: Math.max(acc.epoch, m.epoch)
    }), {
      accuracy: 0, loss: 0, validationAccuracy: 0, validationLoss: 0, epoch: 0
    });

    const count = batchMetrics.length;
    return {
      accuracy: sum.accuracy / count,
      loss: sum.loss / count,
      validationAccuracy: sum.validationAccuracy / count,
      validationLoss: sum.validationLoss / count,
      epoch: sum.epoch
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  getMetrics(): TrainingMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): TrainingMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  clearTrainingData(): void {
    this.trainingData = [];
    logger.info('Training data cleared');
  }

  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }

  getTrainingDataSize(): number {
    return this.trainingData.length;
  }

  /**
   * Trains the AI model with provided requirement categories and questions.
   * @param categories Array of RequirementCategory to train the model.
   */
  async trainModelWithRequirements(categories: RequirementCategory[]): Promise<void> {
    try {
      const trainingData = this.prepareTrainingData(categories);
      await this.aiModel.train(trainingData);
      logger.info('AI model trained successfully');
    } catch (error) {
      logger.error('Failed to train AI model', { error });
      throw new Error('AI model training failed');
    }
  }

  /**
   * Prepares training data from requirement categories.
   * @param categories Array of RequirementCategory
   * @returns Formatted training data for the AI model.
   */
  private prepareTrainingData(categories: RequirementCategory[]): any {
    // Implement data preparation logic
    return categories.map(category => ({
      category: category.name,
      questions: category.questions.map(q => ({
        question: q.question,
        type: q.type,
        choices: q.choices || [],
        details: q.details || [],
        considerations: q.considerations || []
      }))
    }));
  }
}