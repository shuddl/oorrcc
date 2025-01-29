import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@fullstack/shared';
import api from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      refreshSession: async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          if (data.session) {
            set({ user: data.session.user, token: data.session.access_token, isAuthenticated: true });
            api.defaults.headers.Authorization = `Bearer ${data.session.access_token}`;
          }
        } catch (error) {
          clearAuth();
          throw error;
        }
      }
    }),
    {
      name: 'auth-storage',
      // Add a listener to synchronize Zustand store with AuthProvider
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          // Ensure axios headers are updated when Zustand store is rehydrated
          api.defaults.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    }
  )
);