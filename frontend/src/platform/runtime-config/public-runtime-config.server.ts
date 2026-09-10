import "server-only";
import {
  createEnvironmentConfig,
  isProduction,
} from "@shongre/contracts/environment";
import type { PublicRuntimeConfig } from "./public-runtime-config";
import {
  OPENSTREETMAP_ATTRIBUTION,
  OPENFREEMAP_STYLE_URL,
} from "./public-runtime-config";
import { createApplicationRegistry } from "../applications/application-registry";
import { normalizeImageTransformMode } from "@shongre/shared/responsive-image";

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

/** A configured number, or the documented default when it is absent or unusable. */
function numberOr(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && (value ?? "").trim() !== ""
    ? parsed
    : fallback;
}

export function createPublicRuntimeConfig(): PublicRuntimeConfig {
  const environment = createEnvironmentConfig({
    appEnvironment: process.env.APP_ENV,
    environmentId: process.env.ENVIRONMENT_ID,
    publicFranceUrl: process.env.PUBLIC_FR_URL,
    publicInternationalUrl: process.env.PUBLIC_INTL_URL,
    apiUrl: process.env.API_URL,
  });
  const publicMediaAssetBaseUrl = process.env.PUBLIC_MEDIA_ASSET_BASE_URL ?? "";
  const publicCategoryMediaBaseUrl =
    process.env.PUBLIC_CATEGORY_MEDIA_BASE_URL ?? "";
  const publicMediaImageTransform = normalizeImageTransformMode(
    process.env.PUBLIC_MEDIA_IMAGE_TRANSFORM,
  );
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
  if (environment.environment !== "test") {
    const errors: string[] = [];
    if (!publicMediaAssetBaseUrl)
      errors.push("PUBLIC_MEDIA_ASSET_BASE_URL is required");
    if (!publicCategoryMediaBaseUrl)
      errors.push("PUBLIC_CATEGORY_MEDIA_BASE_URL is required");
    if (errors.length > 0) {
      throw new Error(
        `[Web Config] ${environment.environment} runtime configuration is unsafe: ${errors.join(", ")}.`,
      );
    }
  }
  if (!isProduction(environment.environment)) {
    if (stripePublishableKey.startsWith("pk_live_")) {
      throw new Error(
        `[Web Config] ${environment.environment} cannot load a live Stripe publishable key.`,
      );
    }
  } else {
    const errors: string[] = [];
    if (!/^pk_live_[A-Za-z0-9]+$/.test(stripePublishableKey)) {
      errors.push(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a live publishable key",
      );
    }
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
    publicMediaAssetBaseUrl,
    publicCategoryMediaBaseUrl,
    publicMediaImageTransform,
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
    map: {
      /*
       * OpenFreeMap needs no key and serves from a CDN, so unlike the raster
       * endpoint this replaced there is a default a hosted environment may
       * actually use. `MAP_STYLE_URL` overrides it wherever a self-hosted or
       * commercial style is preferred; the attribution travels with whichever
       * is chosen, because it is a licence condition and not a setting.
       */
      provider: process.env.MAP_PROVIDER || "openfreemap",
      styleUrl: process.env.MAP_STYLE_URL || OPENFREEMAP_STYLE_URL,
      attribution: process.env.MAP_ATTRIBUTION || OPENSTREETMAP_ATTRIBUTION,
      defaultCenter: {
        latitude: numberOr(process.env.MAP_DEFAULT_LATITUDE, 46.6),
        longitude: numberOr(process.env.MAP_DEFAULT_LONGITUDE, 2.4),
      },
      defaultZoom: numberOr(process.env.MAP_DEFAULT_ZOOM, 6),
      minZoom: numberOr(process.env.MAP_MIN_ZOOM, 3),
      maxZoom: numberOr(process.env.MAP_MAX_ZOOM, 19),
      maxSearchRadiusKm: numberOr(
        process.env.LOCATION_SEARCH_MAX_RADIUS_KM,
        200,
      ),
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
