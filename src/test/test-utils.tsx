import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../lib/auth';
import { ServiceContext } from '../hooks/useServices';
import { ServiceRegistry } from '../services/ServiceRegistry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const registry = ServiceRegistry.getInstance({
  enableRealtime: false,
  enableOfflineSupport: false,
  enableAnalytics: false
});

const mockAuthContext = {
  user: null,
  loading: false,
  initialized: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {}
};

interface ProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <ServiceContext.Provider value={registry}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </ServiceContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };