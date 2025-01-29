import { describe, test, expect, beforeEach } from 'vitest';
import { SecurityScanner } from '../../services/SecurityScanner';

describe('SecurityScanner', () => {
  let scanner: SecurityScanner;

  beforeEach(() => {
    scanner = new SecurityScanner();
  });

  test('detects security vulnerabilities in code', async () => {
    const code = `
      function riskyFunction() {
        eval(userInput);
        document.innerHTML = data;
      }
    `;

    const result = await scanner.scanCode(code);
    
    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].severity).toBe('high');
    expect(result.score).toBeLessThan(1);
  });

  test('validates secure code', async () => {
    const code = `
      function safeFunction() {
        const sanitizedInput = sanitize(userInput);
        element.textContent = sanitizedInput;
      }
    `;

    const result = await scanner.scanCode(code);
    
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.score).toBe(1);
  });

  test('scans dependencies for vulnerabilities', async () => {
    const dependencies = {
      'react': '^18.0.0',
      'lodash': '^4.17.21'
    };

    const result = await scanner.scanDependencies(dependencies);
    
    expect(result.passed).toBeDefined();
    expect(result.recommendations).toHaveLength(3);
  });
});
