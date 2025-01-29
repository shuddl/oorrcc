import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AIService from '../../lib/ai/AIService'; // Import AI service module

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setInitialized(true);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!initialized) {
        setInitialized(true);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && session?.access_token) {
          setAuth(session.user, session.access_token);
          api.defaults.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
          clearAuth();
          delete api.defaults.headers.Authorization;
        }
      }
    );
    return () => {
      subscription.unsubscribe(); // Cleanup subscription on unmount
    };
  }, [setAuth, clearAuth]);

  useEffect(() => {
    // Initialize AI Service after authentication
    if (user && token) {
      AIService.initialize(user, token);
    }
  }, [user, token]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (signUpError) throw signUpError;
      return data;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;    }  };  const resetPassword = async (email: string) => {    try {      const { error } = await supabase.auth.resetPasswordForEmail(email);      if (error) throw error;      toast.success('Password reset email sent');    } catch (error) {      setError(error as Error);      throw error;    }  };  const updateProfile = async (data: { name?: string; email?: string }) => {    try {      const { error } = await supabase.auth.updateUser({        data: { name: data.name },        email: data.email      });      if (error) throw error;      toast.success('Profile updated successfully');    } catch (error) {      setError(error as Error);      throw error;    }  };  if (loading) {    return (      <div className="min-h-screen flex items-center justify-center bg-dark-800/50 backdrop-blur">        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />      </div>    );  }
  return (
    <ErrorBoundary FallbackComponent={AuthErrorFallback}>
      <AuthContext.Provider value={{
        user,
        loading,
        initialized,
        error,
        signIn,
        signUp,
        signOut,
        refreshSession,
        resetPassword,
        updateProfile
      }}>
        {children}
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}