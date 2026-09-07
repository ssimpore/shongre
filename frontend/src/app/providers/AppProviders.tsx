import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { MarketLocationProvider } from "./MarketLocationProvider";
import { ToastProvider } from "./ToastProvider";
import { FavoritesProvider } from "./FavoritesProvider";
import { ConsentProvider } from "./ConsentProvider";
import { I18nProvider } from "../../i18n/I18nProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { DataModeProvider } from "./DataModeProvider";
import { QUERY_CLIENT_CONFIG } from "../../configuration/query.config";
import type { MarketContext } from "@shongre/contracts/market-country";
import type { PublicRouteData } from "../../platform/seo/public-route-data";
import { PublicRouteDataProvider } from "./PublicRouteDataProvider";
import { StaffMarketplaceActionGuard } from "../../security/components/StaffMarketplaceActionGuard";
import { useAuth } from "./AuthProvider";

const AuthenticatedAccountProviders = lazy(() =>
  import("./AuthenticatedAccountProviders").then((module) => ({
    default: module.AuthenticatedAccountProviders,
  })),
);

function AccountDataBoundary({ children }: { children: React.ReactNode }) {
  const { currentUser, isRestoring } = useAuth();
  if (!currentUser || isRestoring) return children;
  return (
    <Suspense fallback={children}>
      <AuthenticatedAccountProviders>{children}</AuthenticatedAccountProviders>
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CLIENT_CONFIG.staleTimeMs,
      gcTime: QUERY_CLIENT_CONFIG.gcTimeMs,
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
                        <AccountDataBoundary>
                          <FavoritesProvider>{children}</FavoritesProvider>
                        </AccountDataBoundary>
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
