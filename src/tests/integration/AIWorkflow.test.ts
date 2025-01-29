import { describe, test, expect, beforeEach } from 'vitest';
import { AIComponentGenerator } from '../../services/AIComponentGenerator';
import { SecurityScanner } from '../../services/SecurityScanner';
import { TypeValidator } from '../../services/TypeValidator';

describe('AI Workflow Integration', () => {
  let componentGenerator: AIComponentGenerator;
  let securityScanner: SecurityScanner;
  let typeValidator: TypeValidator;

  beforeEach(() => {
    componentGenerator = new AIComponentGenerator();
    securityScanner = new SecurityScanner();
    typeValidator = new TypeValidator();
  });

  test('complete component generation workflow', async () => {
    // Step 1: Generate component
    const request = {
      description: 'A button component with loading state',
      type: 'component',
      name: 'LoadingButton',
      context: {
        themingSystem: 'tailwind',
        requirements: {
          accessibility: true,
          typescript: true
        }
      }
    };

    const result = await componentGenerator.generateComponent(request);
    expect(result).toBeDefined();
    expect(result.code).toContain('LoadingButton');

    // Step 2: Security scan
    const securityResult = await securityScanner.scanCode(result.code);
    expect(securityResult.passed).toBe(true);

    // Step 3: Type validation
    const typeResult = await typeValidator.validateDatabaseTypes();
    expect(typeResult.valid).toBe(true);

    // Step 4: Verify accessibility
    expect(result.accessibility.score).toBeGreaterThan(0.8);
    expect(result.accessibility.wcag.level).toBe('AA');
  });

  test('handles generation errors gracefully', async () => {
    const invalidRequest = {
      description: '',
      type: 'component'
    };

    await expect(componentGenerator.generateComponent(invalidRequest))
      .rejects.toThrow();
  });

  test('optimizes generated component', async () => {
    const request = {
      description: 'Simple text input',
      type: 'component',
      name: 'TextInput'
    };

    const result = await componentGenerator.generateComponent(request);
    const optimized = await componentGenerator.optimizeComponent(result.code, 'TextInput');

    expect(optimized.performance.score).toBeGreaterThan(result.performance.score);
  });
});
