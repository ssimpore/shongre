import {
  GEO_LIMITS,
  LOCATION_PRECISIONS,
  isValidCoordinate,
  type GeoCoordinate,
  type LocationPrecision,
  type PublicMapConfig,
} from "@shongre/contracts/geospatial";

/**
 * Everything the platform knows about where maps and geocoding come from.
 *
 * Two audiences, deliberately separated. `publicMapConfig()` is what a browser
 * or a device may hold — a style URL, an attribution string, a default view.
 * Everything else, including the geocoding endpoint and its contact identity,
 * stays on the server: a client that could reach the geocoder directly would
 * bypass the cache, the rate limit and the market restriction in one step, and
 * would put the platform's contact identity in every visitor's network tab.
 *
 * Providers are named in configuration rather than imported, so replacing
 * OpenFreeMap or the geocoder is an environment change and not a code change.
 */

export const MAP_PROVIDERS = ["openfreemap"] as const;
export type MapProviderId = (typeof MAP_PROVIDERS)[number];

export const GEOCODING_PROVIDERS = ["nominatim", "disabled"] as const;
export type GeocodingProviderId = (typeof GEOCODING_PROVIDERS)[number];

export interface GeoMapConfig {
  provider: MapProviderId;
  styleUrl: string;
  attribution: string;
  defaultCenter: GeoCoordinate;
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface GeoGeocodingConfig {
  provider: GeocodingProviderId;
  /** Origin of a Nominatim-compatible service. Validated, never user-supplied. */
  baseUrl: string;
  /**
   * Identity the provider's usage policy requires. Nominatim rejects, and is
   * entitled to block, an anonymous automated client.
   */
  userAgent: string;
  contactEmail: string;
  /** Upstream requests per minute, platform-wide. */
  rateLimitPerMinute: number;
  cacheTtlSeconds: number;
  requestTimeoutMs: number;
  maxRetries: number;
  maxResults: number;
}

export interface GeoPrivacyConfig {
  /** How far an `approximate` public point may sit from the real one. */
  displacementRadiusMeters: number;
  /** The most revealing precision a public payload may carry by default. */
  defaultPublicPrecision: LocationPrecision;
  maxSearchRadiusKm: number;
}

export interface GeoConfig {
  map: GeoMapConfig;
  geocoding: GeoGeocodingConfig;
  privacy: GeoPrivacyConfig;
}

export class GeoConfigurationError extends Error {
  constructor(message: string) {
    super(`[Geo Config Error] ${message}`);
    this.name = "GeoConfigurationError";
  }
}

/**
 * OpenFreeMap's public style. It is free, it is CDN-served, and it does not
 * take a key; the licence still requires the attribution below to stay visible.
 */
const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/** France's approximate centroid: a sane opening view before a market is known. */
const DEFAULT_CENTER: GeoCoordinate = { latitude: 46.6, longitude: 2.4 };

function readString(source: NodeJS.ProcessEnv, name: string): string {
  return (source[name] ?? "").trim();
}

function readNumber(
  source: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  range: { min: number; max: number },
): number {
  const raw = readString(source, name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new GeoConfigurationError(`${name} must be a number.`);
  }
  if (parsed < range.min || parsed > range.max) {
    throw new GeoConfigurationError(
      `${name} must be between ${range.min} and ${range.max}.`,
    );
  }
  return parsed;
}

function readEnum<const T extends readonly string[]>(
  source: NodeJS.ProcessEnv,
  name: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const raw = readString(source, name);
  if (!raw) return fallback;
  if (!allowed.includes(raw as T[number])) {
    throw new GeoConfigurationError(
      `${name} must be one of ${allowed.join(", ")}.`,
    );
  }
  return raw as T[number];
}

/**
 * Accepts an absolute `https:` origin and nothing else.
 *
 * The geocoding base URL is operator-configurable and is used to build outbound
 * requests, which makes it an SSRF surface: without this, an operator — or
 * anything that can write the environment — could point it at a metadata
 * service or a loopback admin port. Plain `http:` is allowed only for a
 * developer's own loopback mock.
 */
export function assertSafeProviderUrl(
  value: string,
  label: string,
  options: { allowLoopbackHttp: boolean },
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GeoConfigurationError(`${label} must be an absolute URL.`);
  }
  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1" ||
    url.hostname.endsWith(".localhost");
  if (url.protocol === "http:") {
    if (!options.allowLoopbackHttp || !isLoopback) {
      throw new GeoConfigurationError(
        `${label} must use https, except for a loopback mock in local and test profiles.`,
      );
    }
  } else if (url.protocol !== "https:") {
    throw new GeoConfigurationError(`${label} must use http or https.`);
  }
  if (url.username || url.password) {
    throw new GeoConfigurationError(
      `${label} must not embed credentials; use a header-based secret.`,
    );
  }
  return url;
}

export interface GeoConfigInput {
  env: NodeJS.ProcessEnv;
  /** `local`, `test`, `dev`, `staging` or `prod`. Governs how strict this is. */
  appEnvironment: string;
}

export function createGeoConfig({
  env,
  appEnvironment,
}: GeoConfigInput): GeoConfig {
  const relaxed = appEnvironment === "local" || appEnvironment === "test";

  const styleUrl = readString(env, "MAP_STYLE_URL") || OPENFREEMAP_STYLE_URL;
  assertSafeProviderUrl(styleUrl, "MAP_STYLE_URL", {
    allowLoopbackHttp: relaxed,
  });

  const minZoom = readNumber(env, "MAP_MIN_ZOOM", 3, GEO_LIMITS.zoom);
  const maxZoom = readNumber(env, "MAP_MAX_ZOOM", 19, GEO_LIMITS.zoom);
  if (minZoom > maxZoom) {
    throw new GeoConfigurationError(
      "MAP_MIN_ZOOM must not exceed MAP_MAX_ZOOM.",
    );
  }
  const defaultZoom = readNumber(env, "MAP_DEFAULT_ZOOM", 6, GEO_LIMITS.zoom);
  if (defaultZoom < minZoom || defaultZoom > maxZoom) {
    throw new GeoConfigurationError(
      "MAP_DEFAULT_ZOOM must sit between MAP_MIN_ZOOM and MAP_MAX_ZOOM.",
    );
  }

  const defaultCenter: GeoCoordinate = {
    latitude: readNumber(
      env,
      "MAP_DEFAULT_LATITUDE",
      DEFAULT_CENTER.latitude,
      GEO_LIMITS.latitude,
    ),
    longitude: readNumber(
      env,
      "MAP_DEFAULT_LONGITUDE",
      DEFAULT_CENTER.longitude,
      GEO_LIMITS.longitude,
    ),
  };
  if (!isValidCoordinate(defaultCenter)) {
    throw new GeoConfigurationError(
      "MAP_DEFAULT_LATITUDE and MAP_DEFAULT_LONGITUDE must name a real place.",
    );
  }

  const geocodingProvider = readEnum(
    env,
    "GEOCODING_PROVIDER",
    GEOCODING_PROVIDERS,
    relaxed ? "nominatim" : "disabled",
  );
  const baseUrl =
    readString(env, "GEOCODING_BASE_URL") ||
    (relaxed ? "https://nominatim.openstreetmap.org" : "");
  if (geocodingProvider !== "disabled") {
    if (!baseUrl) {
      throw new GeoConfigurationError(
        "GEOCODING_BASE_URL is required when a geocoding provider is enabled.",
      );
    }
    assertSafeProviderUrl(baseUrl, "GEOCODING_BASE_URL", {
      allowLoopbackHttp: relaxed,
    });
  }

  const contactEmail = readString(env, "GEOCODING_CONTACT_EMAIL");
  if (geocodingProvider !== "disabled" && !relaxed && !contactEmail) {
    throw new GeoConfigurationError(
      "GEOCODING_CONTACT_EMAIL is required outside local and test: the provider's usage policy identifies the operator through it.",
    );
  }

  const defaultPublicPrecision = readEnum(
    env,
    "LOCATION_DEFAULT_PUBLIC_PRECISION",
    LOCATION_PRECISIONS,
    "approximate",
  );
  if (defaultPublicPrecision === "exact") {
    throw new GeoConfigurationError(
      "LOCATION_DEFAULT_PUBLIC_PRECISION must never default to exact; a private seller's doorstep is not a public fact.",
    );
  }

  return {
    map: {
      provider: readEnum(env, "MAP_PROVIDER", MAP_PROVIDERS, "openfreemap"),
      styleUrl,
      attribution:
        readString(env, "MAP_ATTRIBUTION") || OPENFREEMAP_ATTRIBUTION,
      defaultCenter,
      defaultZoom,
      minZoom,
      maxZoom,
    },
    geocoding: {
      provider: geocodingProvider,
      baseUrl,
      userAgent:
        readString(env, "GEOCODING_USER_AGENT") ||
        "Shongre/1.0 (marketplace geocoding)",
      contactEmail,
      rateLimitPerMinute: readNumber(env, "GEOCODING_RATE_LIMIT", 60, {
        min: 1,
        max: 10_000,
      }),
      cacheTtlSeconds: readNumber(
        env,
        "GEOCODING_CACHE_TTL",
        60 * 60 * 24 * 30,
        { min: 60, max: 60 * 60 * 24 * 365 },
      ),
      requestTimeoutMs: readNumber(env, "GEOCODING_TIMEOUT_MS", 5_000, {
        min: 500,
        max: 30_000,
      }),
      maxRetries: readNumber(env, "GEOCODING_MAX_RETRIES", 2, {
        min: 0,
        max: 5,
      }),
      maxResults: readNumber(env, "GEOCODING_MAX_RESULTS", 8, {
        min: 1,
        max: 20,
      }),
    },
    privacy: {
      displacementRadiusMeters: readNumber(
        env,
        "LOCATION_PRIVACY_RADIUS_METERS",
        1_000,
        GEO_LIMITS.privacyRadiusMeters,
      ),
      defaultPublicPrecision,
      maxSearchRadiusKm: readNumber(
        env,
        "LOCATION_SEARCH_MAX_RADIUS_KM",
        GEO_LIMITS.searchRadiusKm.max,
        GEO_LIMITS.searchRadiusKm,
      ),
    },
  };
}

/** The subset a browser or device may hold. Nothing server-only crosses this. */
export function publicMapConfig(config: GeoConfig): PublicMapConfig {
  return {
    provider: config.map.provider,
    styleUrl: config.map.styleUrl,
    attribution: config.map.attribution,
    defaultCenter: config.map.defaultCenter,
    defaultZoom: config.map.defaultZoom,
    minZoom: config.map.minZoom,
    maxZoom: config.map.maxZoom,
    maxSearchRadiusKm: config.privacy.maxSearchRadiusKm,
  };
}
