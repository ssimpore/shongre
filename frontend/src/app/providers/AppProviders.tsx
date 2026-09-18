import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { AuthenticatedAccountProviders } from "./AuthenticatedAccountProviders";
import { MarketLocationProvider } from "./MarketLocationProvider";
import { ToastProvider } from "./ToastProvider";
import { FavoritesProvider } from "./FavoritesProvider";
import { ConsentProvider } from "./ConsentProvider";
import { I18nProvider } from "../../i18n/I18nProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { QUERY_CLIENT_CONFIG } from "../../configuration/query.config";
import type { MarketContext } from "@shongre/contracts/market-country";
import type { PublicRouteData } from "../../platform/seo/public-route-data";
import { PublicRouteDataProvider } from "./PublicRouteDataProvider";
import { StaffMarketplaceActionGuard } from "../../security/components/StaffMarketplaceActionGuard";

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

/**
 * Marks the document once the application has hydrated. The server document
 * is complete and readable before that, but a controlled input or a button
 * handled before React attaches loses what the reader did; the browser
 * suites wait for this mark before interacting, and nothing else reads it.
 */
const HydrationMark: React.FC = () => {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-hydrated", "true");
    return () => {
      document.documentElement.removeAttribute("data-app-hydrated");
    };
  }, []);
  return null;
};

export const AppProviders: React.FC<{
  children: React.ReactNode;
  marketContext?: MarketContext;
  initialPublicRouteData?: PublicRouteData | null;
}> = ({ children, marketContext, initialPublicRouteData }) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsentProvider>
            <PublicRouteDataProvider initialData={initialPublicRouteData}>
              <MarketLocationProvider initialMarketContext={marketContext}>
                <I18nProvider>
                  <ToastProvider>
                    <StaffMarketplaceActionGuard>
                      {/* Always mounted, and idle for a guest. These used to
                          be inserted lazily once a session was restored, which
                          changed the tree above the whole application and
                          remounted it — every page re-rendered from scratch
                          a few hundred milliseconds in, and anything a
                          signed-in reader had already typed was gone. */}
                      <AuthenticatedAccountProviders>
                        <FavoritesProvider>
                          <HydrationMark />
                          {children}
                        </FavoritesProvider>
                      </AuthenticatedAccountProviders>
                    </StaffMarketplaceActionGuard>
                  </ToastProvider>
                </I18nProvider>
              </MarketLocationProvider>
            </PublicRouteDataProvider>
          </ConsentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
