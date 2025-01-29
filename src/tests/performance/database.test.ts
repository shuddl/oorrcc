import { describe, test, expect } from 'vitest';
import { supabase } from '../../lib/supabase';
import { generateTestData, cleanupTestData } from '../helpers/database';

describe('Database Performance Tests', () => {
  const BATCH_SIZES = [10, 100, 1000];
  const CONCURRENT_USERS = [1, 10, 50];

  beforeAll(async () => {
    await generateTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  test.each(BATCH_SIZES)('Batch insert performance with %i records', async (batchSize) => {
    const startTime = performance.now();
    const records = Array.from({ length: batchSize }, (_, i) => ({
      name: `Test Project ${i}`,
      description: `Performance test project ${i}`
    }));

    const { error } = await supabase
      .from('projects')
      .insert(records);

    const duration = performance.now() - startTime;
    expect(error).toBeNull();
    expect(duration).toBeLessThan(batchSize * 10); // 10ms per record max
  });

  test.each(CONCURRENT_USERS)('Concurrent read performance with %i users', async (userCount) => {
    const startTime = performance.now();
    const promises = Array.from({ length: userCount }, () =>
      supabase.from('projects').select('*').limit(100)
    );

    const results = await Promise.all(promises);
    const duration = performance.now() - startTime;

    results.forEach(({ error }) => expect(error).toBeNull());
    expect(duration).toBeLessThan(userCount * 100); // 100ms per user max
  });

  test('Complex query performance', async () => {
    const startTime = performance.now();
    const { error } = await supabase
      .from('projects')
      .select(`
        *,
        components (
          id,
          name,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    const duration = performance.now() - startTime;
    expect(error).toBeNull();
    expect(duration).toBeLessThan(500); // 500ms max
  });
});