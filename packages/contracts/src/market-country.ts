import { z } from "zod";

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Le pays doit être un code ISO 3166-1 alpha-2.");

export const marketLaunchStatusSchema = z.enum([
  "disabled",
  "coming_soon",
  "private_beta",
  "beta",
  "active",
  "paused",
]);

export type MarketLaunchStatus = z.infer<typeof marketLaunchStatusSchema>;

export interface CountryConfig {
  code: string;
  slug: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
  launchStatus: MarketLaunchStatus;
  primaryDomain: string;
  basePath: string;
  defaultLocale: string;
  supportedLocales: readonly string[];
  currency: string;
  currencySymbol?: string;
  timezone: string;
  phoneCountryCode: string;
  addressFormat?: string;
  legalEntity?: string;
  seo: {
    indexable: boolean;
    hreflang: string;
  };
  marketplace: {
    enabled: boolean;
    crossBorderSearch: boolean;
  };
  payments: {
    enabled: boolean;
    providerIds: readonly string[];
  };
  taxes: {
    mode: "configured" | "legal_review_required";
    pricingIncludesTax: boolean;
    defaultVatRateBps: number | null;
  };
  monetization: {
    enabled: boolean;
    catalogMarketCode: string;
  };
  compliance: {
    legalReviewRequired: boolean;
    legalReviewStatus: "approved" | "pending";
    minimumAge: number;
    kycPolicy: "progressive" | "restricted";
  };
  launchContent: {
    title: string;
    description: string;
    earlyAccessEnabled: boolean;
  };
  gatewayVisible: boolean;
  displayOrder: number;
}

const country = (config: CountryConfig): CountryConfig =>
  Object.freeze({
    ...config,
    supportedLocales: Object.freeze([...config.supportedLocales]),
    payments: Object.freeze({
      ...config.payments,
      providerIds: Object.freeze([...config.payments.providerIds]),
    }),
    taxes: Object.freeze({ ...config.taxes }),
    monetization: Object.freeze({ ...config.monetization }),
    seo: Object.freeze({ ...config.seo }),
    marketplace: Object.freeze({ ...config.marketplace }),
    compliance: Object.freeze({ ...config.compliance }),
    launchContent: Object.freeze({ ...config.launchContent }),
  });

/**
 * Canonical country identity and routing registry.
 *
 * Commercial values, provider credentials and legal copy remain in their
 * dedicated admin-owned stores. This registry deliberately contains only the
 * stable bootstrap information required before a database connection exists:
 * host/path resolution, locale, currency and safe launch behaviour.
 */
export const COUNTRY_REGISTRY: readonly CountryConfig[] = Object.freeze([
  country({
    code: "FR",
    slug: "fr",
    name: "France",
    nativeName: "France",
    flag: "🇫🇷",
    enabled: true,
    launchStatus: "active",
    primaryDomain: "shongre.fr",
    basePath: "/",
    defaultLocale: "fr-FR",
    supportedLocales: ["fr-FR", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    phoneCountryCode: "+33",
    addressFormat: "street, postalCode city",
    legalEntity: "Shongre France",
    seo: { indexable: true, hreflang: "fr-FR" },
    marketplace: { enabled: true, crossBorderSearch: false },
    payments: { enabled: true, providerIds: ["stripe"] },
    taxes: {
      mode: "legal_review_required",
      pricingIncludesTax: true,
      defaultVatRateBps: null,
    },
    monetization: { enabled: true, catalogMarketCode: "FR" },
    compliance: {
      legalReviewRequired: false,
      legalReviewStatus: "approved",
      minimumAge: 18,
      kycPolicy: "progressive",
    },
    launchContent: {
      title: "Shongre France",
      description: "Les annonces et professionnels près de chez vous.",
      earlyAccessEnabled: false,
    },
    gatewayVisible: true,
    displayOrder: 10,
  }),
  country({
    code: "BE",
    slug: "be",
    name: "Belgique",
    nativeName: "België · Belgique",
    flag: "🇧🇪",
    enabled: true,
    launchStatus: "active",
    primaryDomain: "shongre.com",
    basePath: "/be",
    defaultLocale: "fr-BE",
    supportedLocales: ["fr-BE", "nl-BE", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Brussels",
    phoneCountryCode: "+32",
    addressFormat: "street, postalCode municipality",
    legalEntity: "Shongre Europe",
    seo: { indexable: true, hreflang: "fr-BE" },
    marketplace: { enabled: true, crossBorderSearch: false },
    payments: { enabled: true, providerIds: ["stripe"] },
    taxes: {
      mode: "legal_review_required",
      pricingIncludesTax: true,
      defaultVatRateBps: null,
    },
    monetization: { enabled: true, catalogMarketCode: "BE" },
    compliance: {
      legalReviewRequired: true,
      legalReviewStatus: "approved",
      minimumAge: 18,
      kycPolicy: "progressive",
    },
    launchContent: {
      title: "Shongre Belgique",
      description: "Le marché local belge de Shongre.",
      earlyAccessEnabled: false,
    },
    gatewayVisible: true,
    displayOrder: 20,
  }),
  country({
    code: "CH",
    slug: "ch",
    name: "Suisse",
    nativeName: "Schweiz · Suisse · Svizzera",
    flag: "🇨🇭",
    enabled: true,
    launchStatus: "active",
    primaryDomain: "shongre.com",
    basePath: "/ch",
    defaultLocale: "fr-CH",
    supportedLocales: ["fr-CH", "de-CH", "it-CH", "en-US"],
    currency: "CHF",
    currencySymbol: "CHF",
    timezone: "Europe/Zurich",
    phoneCountryCode: "+41",
    addressFormat: "street, postalCode municipality",
    legalEntity: "Shongre Europe",
    seo: { indexable: true, hreflang: "fr-CH" },
    marketplace: { enabled: true, crossBorderSearch: false },
    payments: { enabled: true, providerIds: ["stripe"] },
    taxes: {
      mode: "legal_review_required",
      pricingIncludesTax: true,
      defaultVatRateBps: null,
    },
    monetization: { enabled: true, catalogMarketCode: "CH" },
    compliance: {
      legalReviewRequired: true,
      legalReviewStatus: "approved",
      minimumAge: 18,
      kycPolicy: "progressive",
    },
    launchContent: {
      title: "Shongre Suisse",
      description: "Le marché local suisse de Shongre.",
      earlyAccessEnabled: false,
    },
    gatewayVisible: true,
    displayOrder: 30,
  }),
  country({
    code: "SN",
    slug: "sn",
    name: "Sénégal",
    nativeName: "Sénégal",
    flag: "🇸🇳",
    enabled: true,
    launchStatus: "coming_soon",
    primaryDomain: "shongre.com",
    basePath: "/sn",
    defaultLocale: "fr-SN",
    supportedLocales: ["fr-SN"],
    currency: "XOF",
    currencySymbol: "F CFA",
    timezone: "Africa/Dakar",
    phoneCountryCode: "+221",
    addressFormat: "street, municipality, region",
    seo: { indexable: false, hreflang: "fr-SN" },
    marketplace: { enabled: false, crossBorderSearch: false },
    payments: { enabled: false, providerIds: [] },
    taxes: {
      mode: "legal_review_required",
      pricingIncludesTax: true,
      defaultVatRateBps: null,
    },
    monetization: { enabled: false, catalogMarketCode: "SN" },
    compliance: {
      legalReviewRequired: true,
      legalReviewStatus: "pending",
      minimumAge: 18,
      kycPolicy: "restricted",
    },
    launchContent: {
      title: "Shongre arrive bientôt au Sénégal",
      description:
        "Les inscriptions anticipées seront ouvertes lorsque les vérifications locales seront terminées.",
      earlyAccessEnabled: true,
    },
    gatewayVisible: true,
    displayOrder: 40,
  }),
  country({
    code: "BF",
    slug: "bf",
    name: "Burkina Faso",
    nativeName: "Burkina Faso",
    flag: "🇧🇫",
    enabled: true,
    launchStatus: "coming_soon",
    primaryDomain: "shongre.com",
    basePath: "/bf",
    defaultLocale: "fr-BF",
    supportedLocales: ["fr-BF"],
    currency: "XOF",
    currencySymbol: "F CFA",
    timezone: "Africa/Ouagadougou",
    phoneCountryCode: "+226",
    addressFormat: "street, municipality, region",
    seo: { indexable: false, hreflang: "fr-BF" },
    marketplace: { enabled: false, crossBorderSearch: false },
    payments: { enabled: false, providerIds: [] },
    taxes: {
      mode: "legal_review_required",
      pricingIncludesTax: true,
      defaultVatRateBps: null,
    },
    monetization: { enabled: false, catalogMarketCode: "BF" },
    compliance: {
      legalReviewRequired: true,
      legalReviewStatus: "pending",
      minimumAge: 18,
      kycPolicy: "restricted",
    },
    launchContent: {
      title: "Shongre arrive bientôt au Burkina Faso",
      description:
        "Les inscriptions anticipées seront ouvertes lorsque les vérifications locales seront terminées.",
      earlyAccessEnabled: true,
    },
    gatewayVisible: true,
    displayOrder: 50,
  }),
  ...[
    ["LU", "lu", "Luxembourg", "🇱🇺", "fr-LU", "EUR", "€", "Europe/Luxembourg", "+352"],
    ["ES", "es", "Espagne", "🇪🇸", "es-ES", "EUR", "€", "Europe/Madrid", "+34"],
    ["DE", "de", "Allemagne", "🇩🇪", "de-DE", "EUR", "€", "Europe/Berlin", "+49"],
  ].map(([code, slug, name, flag, locale, currency, currencySymbol, timezone, phoneCountryCode], index) =>
    country({
      code,
      slug,
      name,
      nativeName: name,
      flag,
      enabled: true,
      launchStatus: code === "LU" ? "active" : "coming_soon",
      primaryDomain: "shongre.com",
      basePath: `/${slug}`,
      defaultLocale: locale,
      supportedLocales: [locale],
      currency,
      currencySymbol,
      timezone,
      phoneCountryCode,
      seo: { indexable: false, hreflang: locale },
      marketplace: {
        enabled: code === "LU",
        crossBorderSearch: false,
      },
      payments: {
        enabled: code === "LU",
        providerIds: code === "LU" ? ["stripe"] : [],
      },
      taxes: {
        mode: "legal_review_required",
        pricingIncludesTax: true,
        defaultVatRateBps: null,
      },
      monetization: {
        enabled: code === "LU",
        catalogMarketCode: code,
      },
      compliance: {
        legalReviewRequired: true,
        legalReviewStatus: code === "LU" ? "approved" : "pending",
        minimumAge: 18,
        kycPolicy: "restricted",
      },
      launchContent: {
        title: `Shongre arrive bientôt en ${name}`,
        description: "Ce marché est en cours de préparation.",
        earlyAccessEnabled: false,
      },
      gatewayVisible: false,
      displayOrder: 100 + index,
    }),
  ),
]);

const COUNTRY_BY_CODE = new Map(
  COUNTRY_REGISTRY.map((entry) => [entry.code, entry]),
);
const COUNTRY_BY_SLUG = new Map(
  COUNTRY_REGISTRY.map((entry) => [entry.slug, entry]),
);

export function getCountryConfig(code: string): CountryConfig | undefined {
  return COUNTRY_BY_CODE.get(String(code || "").trim().toUpperCase());
}

export function getCountryConfigBySlug(slug: string): CountryConfig | undefined {
  return COUNTRY_BY_SLUG.get(String(slug || "").trim().toLowerCase());
}

export function listGatewayCountries(): CountryConfig[] {
  return COUNTRY_REGISTRY.filter(
    (entry) => entry.enabled && entry.gatewayVisible,
  ).sort((left, right) => left.displayOrder - right.displayOrder);
}

export interface MarketInfrastructureConfig {
  globalDomain: string;
  franceDomain: string;
  canonicalProtocol: "https" | "http";
}

export const DEFAULT_MARKET_INFRASTRUCTURE: MarketInfrastructureConfig = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https",
};

export type MarketResolutionKind =
  | "global_gateway"
  | "market"
  | "coming_soon"
  | "redirect"
  | "not_found"
  | "invalid_host";

export interface MarketContext {
  kind: MarketResolutionKind;
  hostname: string;
  country: CountryConfig | null;
  countryCode: string | null;
  market: string | null;
  locale: string | null;
  currency: string | null;
  publicPath: string;
  internalPath: string;
  routingBasePath: string;
  canonicalUrl: string;
  redirectUrl?: string;
  redirectStatus?: 308;
  reason?: string;
}

export interface ResolveMarketContextInput {
  hostname: string;
  pathname?: string;
  infrastructure?: Partial<MarketInfrastructureConfig>;
  allowDevelopmentHosts?: boolean;
}

function normalizeHostname(value: string): string {
  const clean = String(value || "").trim().toLowerCase();
  if (clean.startsWith("[")) return clean.replace(/^\[|\](?::\d+)?$/g, "");
  return clean.replace(/:\d+$/, "").replace(/\.$/, "");
}

function normalizePathname(value = "/"): string {
  const withoutQuery = value.split(/[?#]/, 1)[0] || "/";
  const withSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return withSlash.length > 1
    ? withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/, "")
    : "/";
}

function joinBasePath(basePath: string, route: string): string {
  const cleanBase = basePath === "/" ? "" : normalizePathname(basePath);
  const cleanRoute = normalizePathname(route);
  return `${cleanBase}${cleanRoute === "/" ? "/" : cleanRoute}` || "/";
}

function originFor(
  country: CountryConfig | null,
  infrastructure: MarketInfrastructureConfig,
): string {
  const domain =
    country?.code === "FR"
      ? infrastructure.franceDomain
      : infrastructure.globalDomain;
  return `${infrastructure.canonicalProtocol}://${domain}`;
}

function publicPathFor(country: CountryConfig, internalPath: string): string {
  return joinBasePath(country.basePath, internalPath);
}

function resultForCountry(
  country: CountryConfig,
  hostname: string,
  publicPath: string,
  internalPath: string,
  infrastructure: MarketInfrastructureConfig,
): MarketContext {
  const canonicalPath = publicPathFor(country, internalPath);
  const marketplaceAvailable =
    country.enabled &&
    country.marketplace.enabled &&
    ["active", "beta"].includes(country.launchStatus);
  return {
    kind: marketplaceAvailable ? "market" : "coming_soon",
    hostname,
    country,
    countryCode: country.code,
    market: country.code,
    locale: country.defaultLocale,
    currency: country.currency,
    publicPath,
    internalPath,
    routingBasePath: country.basePath,
    canonicalUrl: `${originFor(country, infrastructure)}${canonicalPath}`,
  };
}

export function resolveMarketContext(
  input: ResolveMarketContextInput,
): MarketContext {
  const infrastructure: MarketInfrastructureConfig = {
    ...DEFAULT_MARKET_INFRASTRUCTURE,
    ...input.infrastructure,
  };
  const hostname = normalizeHostname(input.hostname);
  const pathname = normalizePathname(input.pathname);
  const globalHost = normalizeHostname(infrastructure.globalDomain);
  const franceHost = normalizeHostname(infrastructure.franceDomain);
  const isLocal =
    input.allowDevelopmentHosts !== false &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost"));

  const invalid = (): MarketContext => ({
    kind: "invalid_host",
    hostname,
    country: null,
    countryCode: null,
    market: null,
    locale: null,
    currency: null,
    publicPath: pathname,
    internalPath: pathname,
    routingBasePath: "/",
    canonicalUrl: `${originFor(null, infrastructure)}/`,
    reason: "HOST_NOT_ALLOWED",
  });

  if (!hostname) return invalid();

  const isWwwGlobal = hostname === `www.${globalHost}`;
  const isWwwFrance = hostname === `www.${franceHost}`;
  if (isWwwGlobal || isWwwFrance) {
    const targetHost = isWwwFrance ? franceHost : globalHost;
    return {
      ...invalid(),
      kind: "redirect",
      canonicalUrl: `${infrastructure.canonicalProtocol}://${targetHost}${pathname}`,
      redirectUrl: `${infrastructure.canonicalProtocol}://${targetHost}${pathname}`,
      redirectStatus: 308,
      reason: "CANONICAL_HOST",
    };
  }

  if (hostname === franceHost || (isLocal && hostname === "fr.localhost")) {
    const france = getCountryConfig("FR")!;
    return resultForCountry(
      france,
      hostname,
      pathname,
      pathname,
      infrastructure,
    );
  }

  const localSlug = isLocal ? hostname.split(".")[0] : "";
  const localCountry = getCountryConfigBySlug(localSlug);
  if (localCountry && localCountry.code !== "FR") {
    return resultForCountry(
      localCountry,
      hostname,
      pathname,
      pathname,
      infrastructure,
    );
  }

  const isGlobalHost = hostname === globalHost;
  const isLocalPathHost =
    isLocal && (hostname === "localhost" || hostname === "127.0.0.1");
  if (!isGlobalHost && !isLocalPathHost && !(isLocal && hostname === "global.localhost")) {
    return invalid();
  }

  if ((isGlobalHost || hostname === "global.localhost") && pathname === "/") {
    return {
      kind: "global_gateway",
      hostname,
      country: null,
      countryCode: null,
      market: null,
      locale: "fr",
      currency: null,
      publicPath: "/",
      internalPath: "/",
      routingBasePath: "/",
      canonicalUrl: `${originFor(null, infrastructure)}/`,
    };
  }

  const [firstSegment = ""] = pathname.slice(1).split("/");
  const country = getCountryConfigBySlug(firstSegment);

  if (country?.code === "FR") {
    const suffix = pathname.slice(`/${firstSegment}`.length) || "/";
    const target = `${originFor(country, infrastructure)}${normalizePathname(suffix)}`;
    return {
      kind: "redirect",
      hostname,
      country,
      countryCode: country.code,
      market: country.code,
      locale: country.defaultLocale,
      currency: country.currency,
      publicPath: pathname,
      internalPath: normalizePathname(suffix),
      routingBasePath: country.basePath,
      canonicalUrl: target,
      redirectUrl: target,
      redirectStatus: 308,
      reason: "FRANCE_CANONICAL_DOMAIN",
    };
  }

  if (country) {
    const suffix = pathname.slice(`/${firstSegment}`.length) || "/";
    return resultForCountry(
      country,
      hostname,
      pathname,
      normalizePathname(suffix),
      infrastructure,
    );
  }

  // Keep localhost `/` as France for backwards-compatible development. The
  // global gateway is available at `global.localhost`.
  if (isLocalPathHost && pathname === "/") {
    const france = getCountryConfig("FR")!;
    return resultForCountry(
      france,
      hostname,
      pathname,
      pathname,
      infrastructure,
    );
  }

  return {
    kind: "not_found",
    hostname,
    country: null,
    countryCode: null,
    market: null,
    locale: null,
    currency: null,
    publicPath: pathname,
    internalPath: pathname,
    routingBasePath: "/",
    canonicalUrl: `${originFor(null, infrastructure)}/`,
    reason: /^[a-z]{2}$/i.test(firstSegment)
      ? "UNKNOWN_COUNTRY"
      : "GLOBAL_ROUTE_REQUIRES_COUNTRY",
  };
}

export interface BuildPublicUrlInput {
  country: string;
  route?: string;
  query?: URLSearchParams | Record<string, string | number | boolean | undefined>;
  hash?: string;
  infrastructure?: Partial<MarketInfrastructureConfig>;
}

export function buildPublicUrl(input: BuildPublicUrlInput): string {
  const countryConfig = getCountryConfig(input.country);
  if (!countryConfig) throw new Error(`Unknown Shongre country: ${input.country}`);
  const infrastructure = {
    ...DEFAULT_MARKET_INFRASTRUCTURE,
    ...input.infrastructure,
  };
  const url = new URL(
    publicPathFor(countryConfig, input.route || "/"),
    originFor(countryConfig, infrastructure),
  );
  if (input.query instanceof URLSearchParams) {
    url.search = input.query.toString();
  } else if (input.query) {
    for (const [key, value] of Object.entries(input.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  if (input.hash) url.hash = input.hash.startsWith("#") ? input.hash : `#${input.hash}`;
  return url.toString();
}

export function buildMarketSwitchUrl(input: {
  targetCountry: string;
  internalPath?: string;
  query?: URLSearchParams;
  routeExists?: boolean;
  infrastructure?: Partial<MarketInfrastructureConfig>;
}): string {
  return buildPublicUrl({
    country: input.targetCountry,
    route: input.routeExists === false ? "/" : input.internalPath || "/",
    query: input.query,
    infrastructure: input.infrastructure,
  });
}

export const marketContextSchema = z.object({
  country: countryCodeSchema,
  locale: z.string().min(2).max(35),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type MarketContextInput = z.infer<typeof marketContextSchema>;
