
import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';

function AuthErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <p>Something went wrong with authentication:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

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
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: data.name },
        email: data.email
      });
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800/50 backdrop-blur">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

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
import { AuthContext } from '../../lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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

  const signIn = async (email: string, password: string) => {

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
        }
      });

    } catch (error) {

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

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
      toast.success('Profile updated successfully');
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800/50 backdrop-blur">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      refreshSession,
      resetPassword,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}
      user,
      loading,
      initialized,
      error,
      signIn,
      signUp,
      signOut,
        data: { name: data.name },
        email: data.email
      });
      if (error) throw error;
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
    } catch (error) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      throw error;
    }
  };
      toast.success('Password reset email sent');
    } catch (error) {
      setError(error as Error);
      if (error) throw error;
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(error as Error);
      setError(error as Error);
      throw error;
    }
  };
      if (signUpError) throw signUpError;
      return data;
          data: { name }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };
      setLoading(false);
    });

    // Listen for auth changes
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
        console.error('Failed to initialize auth', err);
        clearAuth();
      }
    }
    setInitialized(true);
    setLoading(false);
  };

  initializeAuth();
}, [setAuth, clearAuth]);
      user: null,
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
      } catch (err) {
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setAuth(user, storedToken);
        localStorage.setItem('token', token);
        set({ user: null, token: null, isAuthenticated: false });
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
      }
    }),
);

useEffect(() => {
  const initializeAuth = async () => {
    {
      name: 'auth-storage'
    }
  )
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
      setInitialized(true);
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import React, { useEffect, useState } from 'react';
  setAuth: (user: User, token: string) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
  clearAuth: () => void;
  isAuthenticated: boolean;
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
import { User } from '@fullstack/shared';
import api from './api';
import { supabase } from '../lib/supabase';
import { persist } from 'zustand/middleware';