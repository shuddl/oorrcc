import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './components/auth/AuthProvider';
import { ServiceProvider } from './components/ServiceProvider';
import { ErrorBoundary } from './middleware/ErrorBoundary';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { Toaster } from 'react-hot-toast';
import { LoadingOverlay } from './components/common/LoadingOverlay';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <div className="fixed inset-0 overflow-hidden bg-dark-800">
        <AuthProvider>
          <ServiceProvider>
            {/* Background canvas layer */}
            <div className="fixed inset-0 z-0">
              <InfiniteCanvas />
            </div>

            <React.Suspense
              fallback={
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur">
                  <LoadingOverlay message="Loading application..." />
                </div>
              }
            >
              {/* Main content layer */}
              <div className="relative z-10 min-h-screen">
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    className: 'bg-dark-700 text-white',
                    duration: 3000
                  }}
                />
                <AppRoutes />
              </div>
            </React.Suspense>
          </ServiceProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App