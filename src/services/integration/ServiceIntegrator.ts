import { ServiceBus } from '../communication/ServiceBus';
import { AIService } from '../AIService';
import { SecurityAnalyzer } from '../analysis/SecurityAnalyzer';
import { PerformanceAnalyzer } from '../analysis/PerformanceAnalyzer';
import { QualityMetricsAnalyzer } from '../analysis/QualityMetricsAnalyzer';
import { logger } from '../../utils/logger';

export class ServiceIntegrator {
  private serviceBus: ServiceBus;
  private aiService: AIService;
  private securityAnalyzer: SecurityAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private qualityAnalyzer: QualityMetricsAnalyzer;

  constructor() {
    this.serviceBus = ServiceBus.getInstance();
    this.aiService = new AIService();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.qualityAnalyzer = new QualityMetricsAnalyzer();

    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Handle code generation requests
    this.serviceBus.subscribe('*', 'CODE_GENERATION_REQUEST', async (message) => {
      try {
        const code = await this.aiService.generateCode(message.payload);
        const analysis = await this.analyzeGeneratedCode(code);

        this.serviceBus.publish({
          type: 'CODE_GENERATION_COMPLETE',
          source: 'integrator',
          payload: {
            code,
            analysis
          }
        });
      } catch (error) {
        logger.error('Code generation failed', { error });
        this.serviceBus.publish({
          type: 'CODE_GENERATION_ERROR',
          source: 'integrator',
          payload: { error }
        });
      }
    });

    // Handle analysis requests
    this.serviceBus.subscribe('*', 'ANALYSIS_REQUEST', async (message) => {
      try {
        const analysis = await this.analyzeCode(message.payload.code);
        this.serviceBus.publish({
          type: 'ANALYSIS_COMPLETE',
          source: 'integrator',
          payload: analysis
        });
      } catch (error) {
        logger.error('Analysis failed', { error });
        this.serviceBus.publish({
          type: 'ANALYSIS_ERROR',
          source: 'integrator',
          payload: { error }
        });
      }
    });
  }

  private async analyzeGeneratedCode(code: string) {
    const [security, performance, quality] = await Promise.all([
      this.securityAnalyzer.analyzeSecurity(code),
      this.performanceAnalyzer.analyzePerformance(code),
      this.qualityAnalyzer.analyzeCodeQuality(code)
    ]);

    return {
      security,
      performance,
      quality
    };
  }

  private async analyzeCode(code: string) {
    return this.analyzeGeneratedCode(code);
  }
}
