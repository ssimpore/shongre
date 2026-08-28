import "server-only";
import {
  createEnvironmentConfig,
  isProduction,
} from "@shongre/contracts/environment";
import type { PublicRuntimeConfig } from "./public-runtime-config";
import { createApplicationRegistry } from "../applications/application-registry";

function enabled(name: string): boolean {
  return process.env[name] === "true";
}

function sampleRate(name: string): number {
  const parsed = Number(process.env[name] ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`[Web Config] ${name} must be between 0 and 1.`);
  }
  return parsed;
}

function apiBaseUrl(apiOrigin: URL): string {
  return new URL("/api/v1", apiOrigin).toString().replace(/\/$/, "");
}

export function createPublicRuntimeConfig(): PublicRuntimeConfig {
  const environment = createEnvironmentConfig({
    appEnvironment: process.env.APP_ENV,
    environmentId: process.env.ENVIRONMENT_ID,
    publicFranceUrl: process.env.PUBLIC_FR_URL,
    publicInternationalUrl: process.env.PUBLIC_INTL_URL,
    apiUrl: process.env.API_URL,
  });
  const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? "demo";
  if (dataMode !== "demo" && dataMode !== "api") {
    throw new Error(
      `[Web Config] NEXT_PUBLIC_DATA_MODE must be demo or api, received "${dataMode}".`,
    );
  }

  const mockStorageEnabled =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_STORAGE !== "false";
  const stripePublishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const analyticsMode = (process.env.ANALYTICS_MODE ?? "off") as
    "off" | "test" | "development" | "staging" | "production";
  if (
    !["off", "test", "development", "staging", "production"].includes(
      analyticsMode,
    )
  ) {
    throw new Error(`[Web Config] Invalid ANALYTICS_MODE "${analyticsMode}".`);
  }
  if (!isProduction(environment.environment)) {
    if (stripePublishableKey.startsWith("pk_live_")) {
      throw new Error(
        `[Web Config] ${environment.environment} cannot load a live Stripe publishable key.`,
      );
    }
  } else {
    const errors: string[] = [];
    if (dataMode !== "api") errors.push("NEXT_PUBLIC_DATA_MODE=api");
    if (mockStorageEnabled)
      errors.push("NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false");
    if (!/^pk_live_[A-Za-z0-9]+$/.test(stripePublishableKey))
      errors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…");
    if (errors.length > 0) {
      throw new Error(
        `[Web Config] Production runtime configuration is unsafe: ${errors.join(", ")}.`,
      );
    }
  }

  const applications = createApplicationRegistry({
    environment: environment.environment,
    marketplaceOrigin:
      process.env.SHONGRE_MARKETPLACE_ORIGIN ||
      environment.urls.franceApp.origin,
    origins: {
      solutions: process.env.SHONGRE_SOLUTIONS_ORIGIN,
      prospects: process.env.SHONGRE_PROSPECTS_ORIGIN,
      facturation: process.env.SHONGRE_FACTURATION_ORIGIN,
    },
  });

  return {
    appEnvironment: environment.environment,
    environmentId: environment.environmentId,
    franceUrl: environment.urls.franceApp.toString(),
    internationalUrl: environment.urls.internationalApp.toString(),
    apiBaseUrl: apiBaseUrl(environment.urls.api),
    dataMode,
    mockStorageEnabled,
    stripePublishableKey,
    release:
      process.env.RELEASE_SHA ||
      process.env.GIT_SHA ||
      process.env.IMAGE_DIGEST ||
      "unreleased",
    applications,
    analytics: {
      mode: analyticsMode,
      internalEnabled: enabled("NEXT_PUBLIC_INTERNAL_ANALYTICS_ENABLED"),
      posthog: {
        enabled: enabled("NEXT_PUBLIC_POSTHOG_ENABLED"),
        key: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
        host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        sessionReplayEnabled: enabled(
          "NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED",
        ),
      },
      ga4: {
        enabled: enabled("NEXT_PUBLIC_GA4_ENABLED"),
        measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "",
      },
      matomo: {
        enabled: enabled("NEXT_PUBLIC_MATOMO_ENABLED"),
        url: process.env.NEXT_PUBLIC_MATOMO_URL ?? "",
        siteId: process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "",
      },
      cloudflare: {
        enabled: enabled("NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_ENABLED"),
        token: process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_SITE_TAG ?? "",
      },
      sentry: {
        enabled: enabled("NEXT_PUBLIC_SENTRY_ENABLED"),
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
        tracesSampleRate: sampleRate("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"),
      },
    },
    externalLinks: {
      appStore: process.env.NEXT_PUBLIC_APP_STORE_URL ?? "",
      googlePlay: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "",
      instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL ?? "",
      facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL ?? "",
      linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL ?? "",
      youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL ?? "",
    },
  };
}

export function serializePublicRuntimeConfig(
  config: PublicRuntimeConfig,
): string {
  return JSON.stringify(config)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
