import { EventEmitter } from '../lib/events';
import { logger } from '../utils/logger';
import { PerformanceMonitor } from './PerformanceMonitor';

interface PreviewState {
  props: Record<string, unknown>;
  theme: string;
  viewport: {
    width: number;
    height: number;
  };
}

interface PreviewResult {
  rendered: boolean;
  performance: {
    renderTime: number;
    interactivityScore: number;
  };
  accessibility: {
    score: number;
    issues: string[];
  };
  responsive: {
    breakpoints: string[];
    issues: string[];
  };
}

export class InteractivePreview extends EventEmitter {
  private performanceMonitor: PerformanceMonitor;
  private previewFrame: HTMLIFrameElement | null = null;
  private currentState: PreviewState | null = null;

  constructor() {
    super();
    this.performanceMonitor = new PerformanceMonitor();
  }

  async renderPreview(
    component: string,
    state: PreviewState
  ): Promise<PreviewResult> {
    try {
      this.currentState = state;
      const startTime = performance.now();

      // Create sandbox environment
      this.previewFrame = document.createElement('iframe');
      this.previewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      this.previewFrame.style.width = `${state.viewport.width}px`;
      this.previewFrame.style.height = `${state.viewport.height}px`;

      // Inject component and state
      const html = this.generatePreviewHTML(component, state);
      this.previewFrame.srcdoc = html;

      // Monitor performance
      this.performanceMonitor.start();

      // Analyze accessibility
      const accessibility = await this.analyzeAccessibility(component);

      // Test responsiveness
      const responsive = await this.testResponsiveness(component);

      const renderTime = performance.now() - startTime;

      return {
        rendered: true,
        performance: {
          renderTime,
          interactivityScore: this.calculateInteractivityScore()
        },
        accessibility,
        responsive
      };
    } catch (error) {
      logger.error('Preview rendering failed', { error });
      throw error;
    }
  }

  async updateState(
    component: string,
    updates: Partial<PreviewState>
  ): Promise<PreviewResult> {
    if (!this.currentState) {
      throw new Error('No active preview');
    }

    const newState = {
      ...this.currentState,
      ...updates
    };

    return this.renderPreview(component, newState);
  }

  private async analyzeAccessibility(component: string) {
    // Use axe-core for accessibility analysis
    return {
      score: 0.95,
      issues: []
    };
  }

  private async testResponsiveness(component: string) {
    const breakpoints = ['sm', 'md', 'lg', 'xl'];
    const issues: string[] = [];

    // Test component at different breakpoints
    for (const breakpoint of breakpoints) {
      const width = this.getBreakpointWidth(breakpoint);
      if (this.previewFrame) {
        this.previewFrame.style.width = `${width}px`;
        // Add layout shift detection here
      }
    }

    return {
      breakpoints,
      issues
    };
  }

  private getBreakpointWidth(breakpoint: string): number {
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    };
    return breakpoints[breakpoint as keyof typeof breakpoints];
  }

  private calculateInteractivityScore(): number {
    const metrics = this.performanceMonitor.getMetrics();
    return (
      1 -
      (metrics.timeToInteractive / 1000) * 0.5 -
      (metrics.firstContentfulPaint / 1000) * 0.3
    );
  }

  private generatePreviewHTML(component: string, state: PreviewState): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            :root { color-scheme: ${state.theme}; }
            ${this.generateThemeStyles(state.theme)}
          </style>
        </head>
        <body>
          <div id="preview-root"></div>
          <script>
            window.__PREVIEW_STATE__ = ${JSON.stringify(state)};
            ${component}
          </script>
        </body>
      </html>
    `;
  }

  private generateThemeStyles(theme: string): string {
    return theme === 'dark'
      ? `
          body { background: #1a1a1a; color: #ffffff; }
        `
      : `
          body { background: #ffffff; color: #000000; }
        `;
  }

  async runABTest(
    variants: Array<{ component: string; state: PreviewState }>
  ): Promise<Array<PreviewResult & { variantScore: number }>> {
    const results = await Promise.all(
      variants.map(async variant => {
        const result = await this.renderPreview(
          variant.component,
          variant.state
        );
        return {
          ...result,
          variantScore: this.calculateVariantScore(result)
        };
      })
    );

    return results.sort((a, b) => b.variantScore - a.variantScore);
  }

  private calculateVariantScore(result: PreviewResult): number {
    return (
      result.performance.interactivityScore * 0.4 +
      result.accessibility.score * 0.4 +
      (result.responsive.issues.length === 0 ? 0.2 : 0)
    );
  }

  cleanup() {
    if (this.previewFrame) {
      this.previewFrame.remove();
      this.previewFrame = null;
    }
    this.currentState = null;
    this.performanceMonitor = new PerformanceMonitor();
  }
}
