import type { AppEnvironment } from "@shongre/contracts/environment";
import type { AnalyticsEnvironmentMode } from "@shongre/contracts/environment";
import {
  createApplicationRegistry,
  type ShongreApplicationRegistry,
} from "../applications/application-registry";

export interface PublicRuntimeConfig {
  appEnvironment: AppEnvironment;
  environmentId: string;
  franceUrl: string;
  internationalUrl: string;
  apiBaseUrl: string;
  publicMediaAssetBaseUrl: string;
  publicCategoryMediaBaseUrl: string;
  stripePublishableKey: string;
  release: string;
  applications: ShongreApplicationRegistry;
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
  /**
   * The vector basemap, as MapLibre consumes it: a style document URL and the
   * attribution its licence requires.
   *
   * These are the same `MAP_*` variables the backend's geospatial module reads,
   * deliberately not a `NEXT_PUBLIC_`-prefixed copy. One set of names means the
   * Web client, the native client and the API cannot drift onto different
   * providers, which is exactly what happened when five components each carried
   * their own tile URL.
   */
  map: {
    provider: string;
    styleUrl: string;
    attribution: string;
    defaultCenter: { latitude: number; longitude: number };
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
    maxSearchRadiusKm: number;
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

/**
 * OpenFreeMap's public style, and the credit its data requires.
 *
 * OpenFreeMap serves vector tiles from a CDN without a key, which is why it is
 * a usable default rather than a placeholder. The attribution is not optional
 * decoration: it is a condition of using OpenStreetMap-derived data, and it
 * travels with the style URL so the two cannot be configured apart.
 */
export const OPENFREEMAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";
export const OPENSTREETMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

function nodeEnvironmentValue(name: string): string {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

/** A configured number, or the documented default when it is absent or unusable. */
function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : fallback;
}

function nodeBoolean(name: string): boolean {
  return nodeEnvironmentValue(name) === "true";
}

function nodeRate(name: string): number {
  const parsed = Number(nodeEnvironmentValue(name));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

function localWebOrigin(): string {
  const host = nodeEnvironmentValue("FRONTEND_HOST");
  const port = nodeEnvironmentValue("FRONTEND_PORT");
  return host && port ? new URL(`http://${host}:${port}`).origin : "";
}

function nodeFallback(): PublicRuntimeConfig {
  const serverAppEnvironment = nodeEnvironmentValue("APP_ENV");
  const publicAppEnvironment = nodeEnvironmentValue("NEXT_PUBLIC_APP_ENV");
  const preferServerRuntime =
    Boolean(serverAppEnvironment) && serverAppEnvironment !== "test";
  const appEnvironment =
    (preferServerRuntime ? serverAppEnvironment : publicAppEnvironment) ||
    serverAppEnvironment ||
    (nodeEnvironmentValue("NODE_ENV") === "test" ? "test" : "local");
  const allowsLocalDefaults =
    appEnvironment === "local" || appEnvironment === "test";
  const configuredLocalOrigin = allowsLocalDefaults ? localWebOrigin() : "";
  const serverFranceUrl = nodeEnvironmentValue("PUBLIC_FR_URL");
  const publicFranceUrl = nodeEnvironmentValue("NEXT_PUBLIC_FR_URL");
  const franceUrl =
    (preferServerRuntime ? serverFranceUrl : publicFranceUrl) ||
    serverFranceUrl ||
    configuredLocalOrigin;
  const serverInternationalUrl = nodeEnvironmentValue("PUBLIC_INTL_URL");
  const publicInternationalUrl = nodeEnvironmentValue("NEXT_PUBLIC_INTL_URL");
  const internationalUrl =
    (preferServerRuntime ? serverInternationalUrl : publicInternationalUrl) ||
    serverInternationalUrl ||
    configuredLocalOrigin;
  const publicApiBaseUrl = nodeEnvironmentValue("NEXT_PUBLIC_API_URL");
  const serverApiOrigin = nodeEnvironmentValue("API_URL");
  const serverApiBaseUrl = serverApiOrigin
    ? new URL("/api/v1", serverApiOrigin).toString().replace(/\/$/, "")
    : "";
  const apiBaseUrl =
    (preferServerRuntime ? serverApiBaseUrl : publicApiBaseUrl) ||
    serverApiBaseUrl;
  const applications = createApplicationRegistry({
    environment: appEnvironment as AppEnvironment,
    marketplaceOrigin:
      nodeEnvironmentValue("SHONGRE_MARKETPLACE_ORIGIN") || franceUrl,
    origins: {
      solutions: nodeEnvironmentValue("SHONGRE_SOLUTIONS_ORIGIN") || undefined,
      prospects: nodeEnvironmentValue("SHONGRE_PROSPECTS_ORIGIN") || undefined,
      facturation:
        nodeEnvironmentValue("SHONGRE_FACTURATION_ORIGIN") || undefined,
    },
  });

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    environmentId:
      (preferServerRuntime
        ? nodeEnvironmentValue("ENVIRONMENT_ID")
        : nodeEnvironmentValue("NEXT_PUBLIC_ENVIRONMENT_ID")) ||
      nodeEnvironmentValue("ENVIRONMENT_ID") ||
      (allowsLocalDefaults ? `shongre-${appEnvironment}` : ""),
    franceUrl,
    internationalUrl,
    apiBaseUrl,
    publicMediaAssetBaseUrl: nodeEnvironmentValue(
      "PUBLIC_MEDIA_ASSET_BASE_URL",
    ),
    publicCategoryMediaBaseUrl: nodeEnvironmentValue(
      "PUBLIC_CATEGORY_MEDIA_BASE_URL",
    ),
    stripePublishableKey: nodeEnvironmentValue(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ),
    release: nodeEnvironmentValue("RELEASE_SHA") || "unreleased",
    applications,
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
    map: {
      provider: nodeEnvironmentValue("MAP_PROVIDER") || "openfreemap",
      styleUrl: nodeEnvironmentValue("MAP_STYLE_URL") || OPENFREEMAP_STYLE_URL,
      attribution:
        nodeEnvironmentValue("MAP_ATTRIBUTION") || OPENSTREETMAP_ATTRIBUTION,
      defaultCenter: {
        latitude: numberOr(nodeEnvironmentValue("MAP_DEFAULT_LATITUDE"), 46.6),
        longitude: numberOr(nodeEnvironmentValue("MAP_DEFAULT_LONGITUDE"), 2.4),
      },
      defaultZoom: numberOr(nodeEnvironmentValue("MAP_DEFAULT_ZOOM"), 6),
      minZoom: numberOr(nodeEnvironmentValue("MAP_MIN_ZOOM"), 3),
      maxZoom: numberOr(nodeEnvironmentValue("MAP_MAX_ZOOM"), 19),
      maxSearchRadiusKm: numberOr(
        nodeEnvironmentValue("LOCATION_SEARCH_MAX_RADIUS_KM"),
        200,
      ),
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

/** Replace legacy external imagery with the environment-owned copy. */
export function resolveOwnedPublicMediaUrl(value: string): string {
  let source: URL;
  try {
    source = new URL(value);
  } catch {
    return value;
  }
  const photoId = source.pathname.slice(1);
  const validPhotoId =
    source.hostname === "images.unsplash.com" &&
    photoId.startsWith("photo-") &&
    [...photoId].every((character) =>
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-".includes(
        character,
      ),
    );
  if (!validPhotoId) return value;
  const runtime = getPublicRuntimeConfig();
  if (!runtime.publicMediaAssetBaseUrl) {
    return value;
  }
  return `${runtime.publicMediaAssetBaseUrl.replace(/\/$/, "")}/${photoId}.jpg`;
}

export function resolveCategoryPublicMediaUrl(slug: string): string {
  const normalizedSlug = slug.trim().toLocaleLowerCase("fr-FR");
  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) return "";
  const runtime = getPublicRuntimeConfig();
  if (!runtime.publicCategoryMediaBaseUrl) return "";
  return `${runtime.publicCategoryMediaBaseUrl.replace(/\/$/, "")}/${normalizedSlug}.jpg`;
}
