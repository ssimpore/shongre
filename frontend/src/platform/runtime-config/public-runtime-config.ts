import type { AppEnvironment } from "@shongre/contracts/environment";
import type { AnalyticsEnvironmentMode } from "@shongre/contracts/environment";

export type PublicDataMode = "demo" | "api";

export interface PublicRuntimeConfig {
  appEnvironment: AppEnvironment;
  environmentId: string;
  franceUrl: string;
  internationalUrl: string;
  apiBaseUrl: string;
  dataMode: PublicDataMode;
  mockStorageEnabled: boolean;
  stripePublishableKey: string;
  release: string;
  analytics: {
    mode: AnalyticsEnvironmentMode;
    internalEnabled: boolean;
    posthog: {
      enabled: boolean;
      key: string;
      host: string;
      sessionReplayEnabled: boolean;
    };
    ga4: { enabled: boolean; measurementId: string };
    matomo: { enabled: boolean; url: string; siteId: string };
    cloudflare: { enabled: boolean; token: string };
    sentry: { enabled: boolean; dsn: string; tracesSampleRate: number };
  };
  externalLinks: {
    appStore: string;
    googlePlay: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    youtube: string;
  };
}

declare global {
  interface Window {
    __SHONGRE_RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

function nodeEnvironmentValue(name: string): string {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

function nodeBoolean(name: string): boolean {
  return nodeEnvironmentValue(name) === "true";
}

function nodeRate(name: string): number {
  const parsed = Number(nodeEnvironmentValue(name));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

function nodeFallback(): PublicRuntimeConfig {
  const appEnvironment =
    nodeEnvironmentValue("NEXT_PUBLIC_APP_ENV") ||
    nodeEnvironmentValue("APP_ENV") ||
    (nodeEnvironmentValue("NODE_ENV") === "test" ? "test" : "local");
  const dataMode = nodeEnvironmentValue("NEXT_PUBLIC_DATA_MODE") || "demo";
  if (dataMode !== "demo" && dataMode !== "api") {
    throw new Error(
      `[Runtime Config] Invalid data mode "${dataMode}". Expected demo or api.`,
    );
  }

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    environmentId: nodeEnvironmentValue("NEXT_PUBLIC_ENVIRONMENT_ID"),
    franceUrl: nodeEnvironmentValue("NEXT_PUBLIC_FR_URL"),
    internationalUrl: nodeEnvironmentValue("NEXT_PUBLIC_INTL_URL"),
    apiBaseUrl: nodeEnvironmentValue("NEXT_PUBLIC_API_URL"),
    dataMode,
    mockStorageEnabled:
      nodeEnvironmentValue("NEXT_PUBLIC_ENABLE_MOCK_STORAGE") !== "false",
    stripePublishableKey: nodeEnvironmentValue(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ),
    release: nodeEnvironmentValue("RELEASE_SHA") || "unreleased",
    analytics: {
      mode: (nodeEnvironmentValue("ANALYTICS_MODE") ||
        (appEnvironment === "test"
          ? "test"
          : "off")) as AnalyticsEnvironmentMode,
      internalEnabled: nodeBoolean("NEXT_PUBLIC_INTERNAL_ANALYTICS_ENABLED"),
      posthog: {
        enabled: nodeBoolean("NEXT_PUBLIC_POSTHOG_ENABLED"),
        key: nodeEnvironmentValue("NEXT_PUBLIC_POSTHOG_KEY"),
        host:
          nodeEnvironmentValue("NEXT_PUBLIC_POSTHOG_HOST") ||
          "https://eu.i.posthog.com",
        sessionReplayEnabled: nodeBoolean(
          "NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED",
        ),
      },
      ga4: {
        enabled: nodeBoolean("NEXT_PUBLIC_GA4_ENABLED"),
        measurementId: nodeEnvironmentValue("NEXT_PUBLIC_GA4_MEASUREMENT_ID"),
      },
      matomo: {
        enabled: nodeBoolean("NEXT_PUBLIC_MATOMO_ENABLED"),
        url: nodeEnvironmentValue("NEXT_PUBLIC_MATOMO_URL"),
        siteId: nodeEnvironmentValue("NEXT_PUBLIC_MATOMO_SITE_ID"),
      },
      cloudflare: {
        enabled: nodeBoolean("NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_ENABLED"),
        token: nodeEnvironmentValue(
          "NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_SITE_TAG",
        ),
      },
      sentry: {
        enabled: nodeBoolean("NEXT_PUBLIC_SENTRY_ENABLED"),
        dsn: nodeEnvironmentValue("NEXT_PUBLIC_SENTRY_DSN"),
        tracesSampleRate: nodeRate("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"),
      },
    },
    externalLinks: {
      appStore: nodeEnvironmentValue("NEXT_PUBLIC_APP_STORE_URL"),
      googlePlay: nodeEnvironmentValue("NEXT_PUBLIC_GOOGLE_PLAY_URL"),
      instagram: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL"),
      facebook: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_FACEBOOK_URL"),
      linkedin: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_LINKEDIN_URL"),
      youtube: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_YOUTUBE_URL"),
    },
  };
}

/**
 * Browser configuration is injected into the initial HTML by the server. The
 * Node fallback exists only for unit tests and server-side module evaluation;
 * deployed browser bundles never own environment-specific values.
 */
export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined") {
    const config = window.__SHONGRE_RUNTIME_CONFIG__;
    if (!config) {
      throw new Error(
        "[Runtime Config] window.__SHONGRE_RUNTIME_CONFIG__ was not injected.",
      );
    }
    return config;
  }
  return nodeFallback();
}
