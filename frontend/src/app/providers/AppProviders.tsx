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
import { DataModeProvider } from "./DataModeProvider";
import { QUERY_CLIENT_CONFIG } from "../../configuration/query.config";
import type { MarketContext } from "@shongre/contracts";
import type { PublicRouteData } from "../../platform/seo/public-route-data";
import { PublicRouteDataProvider } from "./PublicRouteDataProvider";
import { StaffMarketplaceActionGuard } from "../../security/components/StaffMarketplaceActionGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CLIENT_CONFIG.staleTimeMs,
      refetchOnWindowFocus: false,
      retry: QUERY_CLIENT_CONFIG.retryCount,
    },
  },
});

export const AppProviders: React.FC<{
  children: React.ReactNode;
  marketContext?: MarketContext;
  initialPublicRouteData?: PublicRouteData | null;
}> = ({ children, marketContext, initialPublicRouteData }) => {
  return (
    <ErrorBoundary>
      <DataModeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ConsentProvider>
              <PublicRouteDataProvider initialData={initialPublicRouteData}>
                <MarketLocationProvider initialMarketContext={marketContext}>
                  <I18nProvider>
                    <ToastProvider>
                      <StaffMarketplaceActionGuard>
                        <NotificationProvider>
                          <FavoritesProvider>{children}</FavoritesProvider>
                        </NotificationProvider>
                      </StaffMarketplaceActionGuard>
                    </ToastProvider>
                  </I18nProvider>
                </MarketLocationProvider>
              </PublicRouteDataProvider>
            </ConsentProvider>
          </AuthProvider>
        </QueryClientProvider>
      </DataModeProvider>
    </ErrorBoundary>
  );
};
