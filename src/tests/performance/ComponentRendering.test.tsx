// src/tests/performance/ComponentRendering.test.tsx
import React from 'react';
import { describe, test, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { PerformanceMonitor } from '../../services/PerformanceMonitor';

describe('Component Rendering Performance', () => {
  let perfMonitor: PerformanceMonitor;

  beforeEach(() => {
    perfMonitor = new PerformanceMonitor();
    perfMonitor.startTracking();
  });

  test('LoadingOverlay renders efficiently', () => {
    const start = performance.now();
    const { rerender } = render(<LoadingOverlay message="Testing" />);
    const initialRender = performance.now() - start;

    const rerenderStart = performance.now();
    rerender(<LoadingOverlay message="Updated" />);
    const rerenderTime = performance.now() - rerenderStart;

    // Example thresholds for quick feedback
    expect(initialRender).toBeLessThan(100); 
    expect(rerenderTime).toBeLessThan(50);
  });

  test('Component memory usage stays within bounds', () => {
    // Node memory usage calls can cause reference issues in a pure browser environment,
    // but let's assume we have it accessible for test. If not, mock it or skip this test in the browser.
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 100; i++) {
      render(<LoadingOverlay message={`Test ${i}`} />);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

    // Arbitrary example threshold of 50MB for 100 test renders
    expect(memoryIncreaseMB).toBeLessThan(50);
  });

  test('Batch rendering performance', () => {
    const components = Array.from({ length: 10 }, () => null);
    const renderTimes: number[] = [];

    components.forEach(() => {
      const start = performance.now();
      render(<LoadingOverlay message="Batch Test" />);
      renderTimes.push(performance.now() - start);
    });

    const averageRenderTime =
      renderTimes.reduce((acc, val) => acc + val, 0) / renderTimes.length;

    expect(averageRenderTime).toBeLessThan(50);
  });
});