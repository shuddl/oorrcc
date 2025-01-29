import { describe, test, expect } from 'vitest';
import { supabase } from '../../lib/supabase';
import { createTestUser, deleteTestUser } from '../helpers/auth';

describe('API Integration Tests', () => {
  let testUser: { id: string; email: string; };

  beforeAll(async () => {
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await deleteTestUser(testUser.id);
  });

  test('User authentication flow', async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'test-password';

    // Sign up
    const signUpResult = await supabase.auth.signUp({
      email,
      password
    });
    expect(signUpResult.error).toBeNull();
    expect(signUpResult.data.user).toBeDefined();

    // Sign in
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password
    });
    expect(signInResult.error).toBeNull();
    expect(signInResult.data.session).toBeDefined();

    // Sign out
    const signOutResult = await supabase.auth.signOut();
    expect(signOutResult.error).toBeNull();
  });

  test('Project CRUD operations', async () => {
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project',
        description: 'Integration test project',
        owner_id: testUser.id
      })
      .select()
      .single();

    expect(createError).toBeNull();
    expect(project).toBeDefined();
    expect(project.name).toBe('Test Project');

    // Update
    const { error: updateError } = await supabase
      .from('projects')
      .update({ name: 'Updated Project' })
      .eq('id', project.id);

    expect(updateError).toBeNull();

    // Delete
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    expect(deleteError).toBeNull();
  });
});