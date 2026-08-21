import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { MarketLocationProvider } from "./MarketLocationProvider";
import { ToastProvider } from "./ToastProvider";
import { NotificationProvider } from "./NotificationProvider";
import { FavoritesProvider } from "./FavoritesProvider";
import { ConsentProvider } from "./ConsentProvider";
import { I18nProvider } from "../../i18n/I18nProvider";
import { ErrorBoundary } from "./ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsentProvider>
            <MarketLocationProvider>
              <I18nProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <FavoritesProvider>{children}</FavoritesProvider>
                  </NotificationProvider>
                </ToastProvider>
              </I18nProvider>
            </MarketLocationProvider>
          </ConsentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
