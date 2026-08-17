import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { MarketLocationProvider } from './MarketLocationProvider';
import { ToastProvider } from './ToastProvider';
import { NotificationProvider } from './NotificationProvider';
import { ErrorBoundary } from './ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MarketLocationProvider>
            <ToastProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </ToastProvider>
          </MarketLocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
