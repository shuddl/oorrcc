import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorBoundaryFallback } from './ErrorBoundaryFallback';
import { LoadingState } from './LoadingState';

interface Props {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function AsyncBoundary({ 
  children, 
  loadingFallback = <LoadingState />,
  errorFallback = ErrorBoundaryFallback 
}: Props) {
  return (
    <ErrorBoundary FallbackComponent={errorFallback as any}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}