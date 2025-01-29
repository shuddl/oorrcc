import { describe, test, expect, beforeEach } from 'vitest';
import { AnalysisEngine } from '../AnalysisEngine';

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('performs complete code analysis', async () => {
    const code = `
      function example() {
        return 'test';
      }
    `;

    const result = await engine.analyzeCode(code);

    expect(result).toBeDefined();
    expect(result.semanticAnalysis).toBeDefined();
    expect(result.contextAnalysis).toBeDefined();
    expect(result.dependencyGraph).toBeDefined();
    expect(result.performanceMetrics).toBeDefined();
    expect(result.securityReport).toBeDefined();
  });

  test('caches analysis results', async () => {
    const code = 'const x = 1;';
    const context = { projectType: 'web' };

    // First analysis
    const result1 = await engine.analyzeCode(code, context);
    
    // Second analysis should use cache
    const result2 = await engine.analyzeCode(code, context);

    expect(result1).toEqual(result2);
  });

  test('handles analysis errors gracefully', async () => {
    const invalidCode = '@@invalid@@';

    await expect(engine.analyzeCode(invalidCode)).rejects.toThrow();
  });

  test('emits analysisComplete event', async () => {
    const code = 'console.log("test");';
    let eventFired = false;

    engine.on('analysisComplete', (result) => {
      eventFired = true;
      expect(result).toBeDefined();
    });

    await engine.analyzeCode(code);
    expect(eventFired).toBe(true);
  });
});