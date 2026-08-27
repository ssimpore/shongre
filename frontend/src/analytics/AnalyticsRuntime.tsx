import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useConsent } from "../app/providers/ConsentProvider";
import { useMarketLocation } from "../app/providers/MarketLocationProvider";
import { getPublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";
import { analyticsClient } from "./analytics.client";
import { configureCloudflareWebAnalytics } from "./cloudflare-web-analytics";
import { sentryClient } from "./sentry.client";
import { startWebVitals } from "./web-vitals";
import { AnalyticsDebugPanel } from "./AnalyticsDebugPanel";

export function AnalyticsRuntime() {
  const { categories } = useConsent();
  const { activeMarket, currentLocale, currentCurrency, effectiveConfig } =
    useMarketLocation();
  const { currentUser, accountType, isRestoring } = useAuth();
  const location = useLocation();
  const previousUserId = useRef<string | null>(null);
  const sessionTracked = useRef(false);
  const lastPageViewPath = useRef<string | null>(null);

  useEffect(() => {
    const config = getPublicRuntimeConfig();
    void analyticsClient.applyConsent(categories).then(() => {
      if (categories.analytics && !sessionTracked.current) {
        sessionTracked.current = true;
        analyticsClient.track("session_started");
      }
    });
    if (!categories.analytics) sessionTracked.current = false;
    void sentryClient.configure(config, categories.analytics);
    configureCloudflareWebAnalytics(config, categories.analytics);
    if (categories.analytics) startWebVitals();
  }, [categories]);

  useEffect(() => {
    analyticsClient.setMarketContext({
      country: activeMarket.code,
      market: activeMarket.code,
      locale: currentLocale,
      currency: currentCurrency,
      domain: window.location.hostname,
      timezone: effectiveConfig.localization.timezone,
    });
  }, [
    activeMarket.code,
    currentCurrency,
    currentLocale,
    effectiveConfig.localization.timezone,
  ]);

  useEffect(() => {
    if (isRestoring) return;
    const nextUserId = currentUser?.id ?? null;
    if (nextUserId) analyticsClient.identify(nextUserId, accountType);
    else if (previousUserId.current) analyticsClient.resetIdentity();
    previousUserId.current = nextUserId;
  }, [accountType, currentUser?.id, isRestoring]);

  useEffect(() => {
    analyticsClient.setRoute(location.pathname);
    if (lastPageViewPath.current === location.pathname) return;
    lastPageViewPath.current = location.pathname;
    analyticsClient.track("page_viewed", {
      path: location.pathname,
      title: document.title,
      referrerHost: (() => {
        try {
          return document.referrer
            ? new URL(document.referrer).hostname
            : undefined;
        } catch {
          return undefined;
        }
      })(),
    });
  }, [location.pathname]);

  return <AnalyticsDebugPanel categories={categories} />;
}
