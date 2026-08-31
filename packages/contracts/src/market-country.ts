import { z } from "zod";

export const MARKET_CONFIGURATION_REASON_MIN_LENGTH = 8;
export const MARKET_CONFIGURATION_REASON_MAX_LENGTH = 500;

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Le pays doit être un code ISO 3166-1 alpha-2.");

export const marketLaunchStatusSchema = z.enum([
  "disabled",
  "unsupported",
  "coming_soon",
  "private_beta",
  "beta",
  "active",
  "paused",
]);

export type MarketLaunchStatus = z.infer<typeof marketLaunchStatusSchema>;

export const marketReadinessSchema = z
  .object({
    routing: z.boolean(),
    localization: z.boolean(),
    legal: z.boolean(),
    compliance: z.boolean(),
    providers: z.boolean(),
    payments: z.boolean(),
    operations: z.boolean(),
  })
  .strict();

export type MarketReadiness = z.infer<typeof marketReadinessSchema>;

export const geographicBoundsSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .strict()
  .refine((bounds) => bounds.north > bounds.south, {
    message: "La limite nord doit être supérieure à la limite sud.",
  });

export type GeographicBounds = z.infer<typeof geographicBoundsSchema>;

export interface MarketCapabilities {
  discovery: boolean;
  publication: boolean;
  multiMarketPublication: boolean;
  payments: boolean;
  payouts: boolean;
  delivery: boolean;
  verification: boolean;
  subscriptions: boolean;
  promotions: boolean;
}

export interface CountryConfig {
  code: string;
  marketId: string;
  marketCode: string;
  countryCode: string;
  isDefault: boolean;
  slug: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
  launchStatus: MarketLaunchStatus;
  canonicalDomainMode: "france" | "international";
  basePath: string;
  defaultLocale: string;
  supportedLocales: readonly string[];
  currency: string;
  supportedCurrencies: readonly string[];
  currencySymbol?: string;
  timezone: string;
  measurementSystem: "metric" | "imperial";
  phoneCountryCode: string;
  addressFormat?: string;
  locationHierarchy: readonly string[];
  capabilities: MarketCapabilities;
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
  detection: {
    enabled: boolean;
    coordinateBounds: readonly GeographicBounds[];
  };
  readiness: MarketReadiness;
  gatewayVisible: boolean;
  displayOrder: number;
}

export const countryConfigSchema: z.ZodType<CountryConfig> = z
  .object({
    code: countryCodeSchema,
    marketId: z.string().trim().min(3).max(120),
    marketCode: countryCodeSchema,
    countryCode: countryCodeSchema,
    isDefault: z.boolean(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(2).max(100),
    nativeName: z.string().trim().min(2).max(120),
    flag: z.string().trim().min(1).max(16),
    enabled: z.boolean(),
    launchStatus: marketLaunchStatusSchema,
    canonicalDomainMode: z.enum(["france", "international"]),
    basePath: z.string().regex(/^\/$|^\/[a-z0-9-]+$/),
    defaultLocale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    supportedLocales: z
      .array(z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/))
      .min(1),
    currency: z.string().regex(/^[A-Z]{3}$/),
    supportedCurrencies: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1),
    currencySymbol: z.string().trim().min(1).max(10).optional(),
    timezone: z.string().trim().min(3).max(80),
    measurementSystem: z.enum(["metric", "imperial"]),
    phoneCountryCode: z.string().regex(/^\+[1-9]\d{0,3}$/),
    addressFormat: z.string().trim().min(3).max(200).optional(),
    locationHierarchy: z.array(z.string().trim().min(1)).min(1),
    capabilities: z
      .object({
        discovery: z.boolean(),
        publication: z.boolean(),
        multiMarketPublication: z.boolean(),
        payments: z.boolean(),
        payouts: z.boolean(),
        delivery: z.boolean(),
        verification: z.boolean(),
        subscriptions: z.boolean(),
        promotions: z.boolean(),
      })
      .strict(),
    legalEntity: z.string().trim().min(2).max(160).optional(),
    seo: z
      .object({
        indexable: z.boolean(),
        hreflang: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
      })
      .strict(),
    marketplace: z
      .object({ enabled: z.boolean(), crossBorderSearch: z.boolean() })
      .strict(),
    payments: z
      .object({
        enabled: z.boolean(),
        providerIds: z.array(z.string().regex(/^[a-z0-9._-]+$/)),
      })
      .strict(),
    taxes: z
      .object({
        mode: z.enum(["configured", "legal_review_required"]),
        pricingIncludesTax: z.boolean(),
        defaultVatRateBps: z.number().int().min(0).max(10_000).nullable(),
      })
      .strict(),
    monetization: z
      .object({ enabled: z.boolean(), catalogMarketCode: countryCodeSchema })
      .strict(),
    compliance: z
      .object({
        legalReviewRequired: z.boolean(),
        legalReviewStatus: z.enum(["approved", "pending"]),
        minimumAge: z.number().int().min(13).max(21),
        kycPolicy: z.enum(["progressive", "restricted"]),
      })
      .strict(),
    launchContent: z
      .object({
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().min(10).max(500),
        earlyAccessEnabled: z.boolean(),
      })
      .strict(),
    detection: z
      .object({
        enabled: z.boolean(),
        coordinateBounds: z.array(geographicBoundsSchema),
      })
      .strict()
      .refine(
        (value) => !value.enabled || value.coordinateBounds.length > 0,
        "Un marché détectable doit déclarer au moins une zone géographique.",
      ),
    readiness: marketReadinessSchema,
    gatewayVisible: z.boolean(),
    displayOrder: z.number().int().min(0).max(10_000),
  })
  .strict();

const ACTIVATABLE_MARKET_STATES: readonly MarketLaunchStatus[] = [
  "active",
  "beta",
];

export function marketActivationIssues(config: CountryConfig): string[] {
  if (!ACTIVATABLE_MARKET_STATES.includes(config.launchStatus)) return [];

  const issues: string[] = [];
  if (!config.enabled) issues.push("enabled");
  if (!config.marketplace.enabled) issues.push("marketplace.enabled");
  if (!config.capabilities.discovery) issues.push("capabilities.discovery");
  if (!config.capabilities.publication) issues.push("capabilities.publication");
  if (!config.supportedLocales.includes(config.defaultLocale)) {
    issues.push("supportedLocales");
  }
  if (!config.supportedCurrencies.includes(config.currency)) {
    issues.push("supportedCurrencies");
  }
  if (
    !config.detection.enabled ||
    config.detection.coordinateBounds.length === 0
  ) {
    issues.push("detection");
  }
  for (const [key, ready] of Object.entries(config.readiness)) {
    if (!ready) issues.push(`readiness.${key}`);
  }
  if (
    config.compliance.legalReviewRequired &&
    config.compliance.legalReviewStatus !== "approved"
  ) {
    issues.push("compliance.legalReviewStatus");
  }
  if (
    config.capabilities.payments !== config.payments.enabled ||
    (config.payments.enabled && config.payments.providerIds.length === 0)
  ) {
    issues.push("payments.providerIds");
  }
  if (config.capabilities.subscriptions !== config.monetization.enabled) {
    issues.push("monetization.enabled");
  }
  return issues;
}

export function validateCountryConfiguration(input: unknown): CountryConfig {
  const config = countryConfigSchema.parse(input);
  const issues = marketActivationIssues(config);
  if (issues.length > 0) {
    throw new Error(
      `Market ${config.code} cannot be activated; incomplete configuration: ${issues.join(", ")}`,
    );
  }
  return config;
}

type CountryConfigInput = Omit<
  CountryConfig,
  | "marketId"
  | "marketCode"
  | "countryCode"
  | "isDefault"
  | "supportedCurrencies"
  | "measurementSystem"
  | "locationHierarchy"
  | "capabilities"
> &
  Partial<
    Pick<
      CountryConfig,
      | "marketId"
      | "marketCode"
      | "countryCode"
      | "isDefault"
      | "supportedCurrencies"
      | "measurementSystem"
      | "locationHierarchy"
      | "capabilities"
    >
  >;

const country = (input: CountryConfigInput): CountryConfig => {
  const config: CountryConfig = {
    marketId: input.marketId || `market-${input.slug}`,
    marketCode: input.marketCode || input.code,
    countryCode: input.countryCode || input.code,
    isDefault: input.isDefault === true,
    supportedCurrencies: input.supportedCurrencies || [input.currency],
    measurementSystem: input.measurementSystem || "metric",
    locationHierarchy: input.locationHierarchy || [
      "country",
      "region",
      "municipality",
      "postal_code",
    ],
    capabilities: input.capabilities || {
      discovery: input.marketplace.enabled,
      publication: input.marketplace.enabled,
      multiMarketPublication: input.marketplace.enabled,
      payments: input.payments.enabled,
      payouts: input.payments.enabled,
      delivery: input.marketplace.enabled,
      verification: input.marketplace.enabled,
      subscriptions: input.monetization.enabled,
      promotions: input.monetization.enabled,
    },
    ...input,
  };
  validateCountryConfiguration(config);
  return Object.freeze({
    ...config,
    supportedLocales: Object.freeze([...config.supportedLocales]),
    supportedCurrencies: Object.freeze([...config.supportedCurrencies]),
    locationHierarchy: Object.freeze([...config.locationHierarchy]),
    capabilities: Object.freeze({ ...config.capabilities }),
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
    detection: Object.freeze({
      ...config.detection,
      coordinateBounds: Object.freeze(
        config.detection.coordinateBounds.map((bounds) =>
          Object.freeze({ ...bounds }),
        ),
      ),
    }),
    readiness: Object.freeze({ ...config.readiness }),
  });
};

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
    isDefault: true,
    slug: "fr",
    name: "France",
    nativeName: "France",
    flag: "🇫🇷",
    enabled: true,
    launchStatus: "active",
    canonicalDomainMode: "france",
    basePath: "/",
    defaultLocale: "fr-FR",
    supportedLocales: ["fr-FR", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    phoneCountryCode: "+33",
    addressFormat: "street, postalCode city",
    locationHierarchy: [
      "country",
      "region",
      "department",
      "municipality",
      "postal_code",
    ],
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
    detection: {
      enabled: true,
      coordinateBounds: [{ north: 51.6, south: 41, east: 9.8, west: -5.6 }],
    },
    readiness: {
      routing: true,
      localization: true,
      legal: true,
      compliance: true,
      providers: true,
      payments: true,
      operations: true,
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
    canonicalDomainMode: "international",
    basePath: "/be",
    defaultLocale: "fr-BE",
    supportedLocales: ["fr-BE", "nl-BE", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Brussels",
    phoneCountryCode: "+32",
    addressFormat: "street, postalCode municipality",
    locationHierarchy: [
      "country",
      "region",
      "province",
      "municipality",
      "postal_code",
    ],
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
    detection: {
      enabled: true,
      coordinateBounds: [{ north: 51.6, south: 49.4, east: 6.5, west: 2.4 }],
    },
    readiness: {
      routing: true,
      localization: true,
      legal: true,
      compliance: true,
      providers: true,
      payments: true,
      operations: true,
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
    canonicalDomainMode: "international",
    basePath: "/ch",
    defaultLocale: "fr-CH",
    supportedLocales: ["fr-CH", "de-CH", "it-CH", "en-US"],
    currency: "CHF",
    currencySymbol: "CHF",
    timezone: "Europe/Zurich",
    phoneCountryCode: "+41",
    addressFormat: "street, postalCode municipality",
    locationHierarchy: ["country", "canton", "municipality", "postal_code"],
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
    detection: {
      enabled: true,
      coordinateBounds: [{ north: 48, south: 45.7, east: 10.7, west: 5.8 }],
    },
    readiness: {
      routing: true,
      localization: true,
      legal: true,
      compliance: true,
      providers: true,
      payments: true,
      operations: true,
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
    canonicalDomainMode: "international",
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
    detection: {
      enabled: true,
      coordinateBounds: [
        { north: 16.7, south: 12.2, east: -11.3, west: -17.7 },
      ],
    },
    readiness: {
      routing: true,
      localization: true,
      legal: false,
      compliance: false,
      providers: false,
      payments: false,
      operations: false,
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
    canonicalDomainMode: "international",
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
    detection: {
      enabled: true,
      coordinateBounds: [{ north: 15.1, south: 9.4, east: 2.5, west: -5.6 }],
    },
    readiness: {
      routing: true,
      localization: true,
      legal: false,
      compliance: false,
      providers: false,
      payments: false,
      operations: false,
    },
    gatewayVisible: true,
    displayOrder: 50,
  }),
  ...(
    [
      {
        code: "LU",
        slug: "lu",
        name: "Luxembourg",
        flag: "🇱🇺",
        locale: "fr-LU",
        currency: "EUR",
        currencySymbol: "€",
        timezone: "Europe/Luxembourg",
        phoneCountryCode: "+352",
        launchStatus: "active",
        marketplaceEnabled: true,
        paymentProviderIds: ["stripe"],
        legalReviewStatus: "approved",
        legalEntity: undefined,
        seoIndexable: false,
        gatewayVisible: true,
        bounds: { north: 50.3, south: 49.3, east: 6.7, west: 5.6 },
        readiness: {
          routing: true,
          localization: true,
          legal: true,
          compliance: true,
          providers: true,
          payments: true,
          operations: true,
        },
      },
      {
        code: "ES",
        slug: "es",
        name: "Espagne",
        flag: "🇪🇸",
        locale: "es-ES",
        currency: "EUR",
        currencySymbol: "€",
        timezone: "Europe/Madrid",
        phoneCountryCode: "+34",
        launchStatus: "coming_soon",
        marketplaceEnabled: false,
        paymentProviderIds: [],
        legalReviewStatus: "pending",
        legalEntity: undefined,
        seoIndexable: false,
        gatewayVisible: false,
        bounds: { north: 44.1, south: 35.6, east: 4.5, west: -9.6 },
        readiness: {
          routing: true,
          localization: false,
          legal: false,
          compliance: false,
          providers: false,
          payments: false,
          operations: false,
        },
      },
      {
        code: "DE",
        slug: "de",
        name: "Allemagne",
        flag: "🇩🇪",
        locale: "de-DE",
        currency: "EUR",
        currencySymbol: "€",
        timezone: "Europe/Berlin",
        phoneCountryCode: "+49",
        launchStatus: "coming_soon",
        marketplaceEnabled: false,
        paymentProviderIds: [],
        legalReviewStatus: "pending",
        legalEntity: undefined,
        seoIndexable: false,
        gatewayVisible: false,
        bounds: { north: 55.2, south: 47.2, east: 15.1, west: 5.8 },
        readiness: {
          routing: true,
          localization: false,
          legal: false,
          compliance: false,
          providers: false,
          payments: false,
          operations: false,
        },
      },
    ] as const
  ).map((definition, index) =>
    country({
      code: definition.code,
      slug: definition.slug,
      name: definition.name,
      nativeName: definition.name,
      flag: definition.flag,
      enabled: true,
      launchStatus: definition.launchStatus,
      canonicalDomainMode: "international",
      basePath: `/${definition.slug}`,
      defaultLocale: definition.locale,
      supportedLocales: [definition.locale],
      currency: definition.currency,
      currencySymbol: definition.currencySymbol,
      timezone: definition.timezone,
      phoneCountryCode: definition.phoneCountryCode,
      legalEntity: definition.legalEntity,
      seo: {
        indexable: definition.seoIndexable,
        hreflang: definition.locale,
      },
      marketplace: {
        enabled: definition.marketplaceEnabled,
        crossBorderSearch: false,
      },
      payments: {
        enabled: definition.marketplaceEnabled,
        providerIds: definition.paymentProviderIds,
      },
      taxes: {
        mode: "legal_review_required",
        pricingIncludesTax: true,
        defaultVatRateBps: null,
      },
      monetization: {
        enabled: definition.marketplaceEnabled,
        catalogMarketCode: definition.code,
      },
      compliance: {
        legalReviewRequired: true,
        legalReviewStatus: definition.legalReviewStatus,
        minimumAge: 18,
        kycPolicy: "restricted",
      },
      launchContent: {
        title: definition.marketplaceEnabled
          ? `Shongre ${definition.name}`
          : `Shongre arrive bientôt en ${definition.name}`,
        description: definition.marketplaceEnabled
          ? `Le marché local ${definition.name.toLocaleLowerCase()} de Shongre.`
          : "Ce marché est en cours de préparation.",
        earlyAccessEnabled: false,
      },
      detection: {
        enabled: true,
        coordinateBounds: [definition.bounds],
      },
      readiness: definition.readiness,
      gatewayVisible: definition.gatewayVisible,
      displayOrder: 100 + index,
    }),
  ),
]);

export function validateCountryRegistry(
  entries: readonly CountryConfig[],
): readonly CountryConfig[] {
  const validated = entries.map((entry) => validateCountryConfiguration(entry));
  const defaultEntries = validated.filter((entry) => entry.isDefault);
  if (defaultEntries.length !== 1) {
    throw new Error("COUNTRY_REGISTRY must define exactly one default market.");
  }

  const uniqueFields: Array<
    keyof Pick<
      CountryConfig,
      "code" | "marketId" | "marketCode" | "slug" | "basePath"
    >
  > = ["code", "marketId", "marketCode", "slug", "basePath"];
  for (const field of uniqueFields) {
    const values = new Set<string>();
    for (const entry of validated) {
      const value = entry[field];
      if (values.has(value)) {
        throw new Error(
          `COUNTRY_REGISTRY contains duplicate ${field}: ${value}`,
        );
      }
      values.add(value);
    }
  }

  const rootEntry = validated.find((entry) => entry.basePath === "/");
  if (!rootEntry?.isDefault) {
    throw new Error("Only the default market may own the canonical root path.");
  }
  for (const entry of validated) {
    if (entry.isDefault !== (entry.basePath === "/")) {
      throw new Error(
        `Market ${entry.code} has an invalid default-market routing configuration.`,
      );
    }
    if (entry.code !== entry.countryCode || entry.code !== entry.marketCode) {
      throw new Error(
        `Market ${entry.code} must keep its canonical country and market identifiers aligned.`,
      );
    }
  }
  return validated;
}

validateCountryRegistry(COUNTRY_REGISTRY);

function checkedRegistry(
  registry: readonly CountryConfig[],
): readonly CountryConfig[] {
  return registry === COUNTRY_REGISTRY
    ? COUNTRY_REGISTRY
    : validateCountryRegistry(registry);
}

export type PublicCountryConfig = Pick<
  CountryConfig,
  | "code"
  | "marketId"
  | "marketCode"
  | "countryCode"
  | "isDefault"
  | "slug"
  | "name"
  | "nativeName"
  | "flag"
  | "enabled"
  | "launchStatus"
  | "canonicalDomainMode"
  | "basePath"
  | "defaultLocale"
  | "supportedLocales"
  | "currency"
  | "supportedCurrencies"
  | "currencySymbol"
  | "timezone"
  | "measurementSystem"
  | "locationHierarchy"
  | "capabilities"
  | "seo"
  | "marketplace"
  | "monetization"
  | "launchContent"
  | "gatewayVisible"
  | "displayOrder"
> & {
  payments: { enabled: boolean };
};

export type PublicMarketExperience = "active" | "coming_soon" | "unavailable";

export function publicMarketExperience(
  country: Pick<CountryConfig, "enabled" | "launchStatus" | "marketplace">,
): PublicMarketExperience {
  if (
    country.enabled &&
    country.marketplace.enabled &&
    ACTIVATABLE_MARKET_STATES.includes(country.launchStatus)
  ) {
    return "active";
  }
  if (country.enabled && country.launchStatus === "coming_soon") {
    return "coming_soon";
  }
  return "unavailable";
}

export function toPublicCountryConfig(
  country: CountryConfig,
): PublicCountryConfig {
  return Object.freeze({
    code: country.code,
    marketId: country.marketId,
    marketCode: country.marketCode,
    countryCode: country.countryCode,
    isDefault: country.isDefault,
    slug: country.slug,
    name: country.name,
    nativeName: country.nativeName,
    flag: country.flag,
    enabled: country.enabled,
    launchStatus: country.launchStatus,
    canonicalDomainMode: country.canonicalDomainMode,
    basePath: country.basePath,
    defaultLocale: country.defaultLocale,
    supportedLocales: country.supportedLocales,
    currency: country.currency,
    supportedCurrencies: country.supportedCurrencies,
    currencySymbol: country.currencySymbol,
    timezone: country.timezone,
    measurementSystem: country.measurementSystem,
    locationHierarchy: country.locationHierarchy,
    capabilities: country.capabilities,
    seo: country.seo,
    marketplace: country.marketplace,
    payments: Object.freeze({ enabled: country.payments.enabled }),
    monetization: country.monetization,
    launchContent: country.launchContent,
    gatewayVisible: country.gatewayVisible,
    displayOrder: country.displayOrder,
  });
}

export function listPublicCountries(
  registry: readonly CountryConfig[] = COUNTRY_REGISTRY,
): PublicCountryConfig[] {
  return checkedRegistry(registry)
    .filter((entry) => entry.enabled && entry.gatewayVisible)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toPublicCountryConfig);
}

export type MarketDetectionSource = "ip" | "coordinates" | "demo";
export type MarketDetectionConfidence = "high" | "medium" | "low";

export interface MarketDetectionRecommendation {
  status: "resolved" | "unknown" | "uncertain";
  source: MarketDetectionSource;
  confidence: MarketDetectionConfidence;
  proxyOrVpnLikely: boolean;
  country: PublicCountryConfig | null;
  experience: PublicMarketExperience | "global_gateway";
}

export function resolveCountryRecommendation(input: {
  countryCode?: string | null;
  source: MarketDetectionSource;
  confidence?: MarketDetectionConfidence;
  proxyOrVpnLikely?: boolean;
  registry?: readonly CountryConfig[];
}): MarketDetectionRecommendation {
  const registry = input.registry ?? COUNTRY_REGISTRY;
  checkedRegistry(registry);
  const normalizedCode = String(input.countryCode || "")
    .trim()
    .toUpperCase();
  const country = registry.find((entry) => entry.code === normalizedCode);
  if (!country) {
    return {
      status: input.proxyOrVpnLikely ? "uncertain" : "unknown",
      source: input.source,
      confidence: "low",
      proxyOrVpnLikely: input.proxyOrVpnLikely === true,
      country: null,
      experience: "global_gateway",
    };
  }
  const confidence = input.confidence ?? "medium";
  return {
    status:
      input.proxyOrVpnLikely || confidence === "low" ? "uncertain" : "resolved",
    source: input.source,
    confidence,
    proxyOrVpnLikely: input.proxyOrVpnLikely === true,
    country: toPublicCountryConfig(country),
    experience: publicMarketExperience(country),
  };
}

function boundsArea(bounds: GeographicBounds): number {
  return (bounds.north - bounds.south) * (bounds.east - bounds.west);
}

function containsCoordinates(
  bounds: GeographicBounds,
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

export function resolveCountryFromCoordinates(input: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  registry?: readonly CountryConfig[];
}): MarketDetectionRecommendation {
  const latitude = z.number().min(-90).max(90).parse(input.latitude);
  const longitude = z.number().min(-180).max(180).parse(input.longitude);
  const accuracy = z.number().nonnegative().optional().parse(input.accuracy);
  const registry = input.registry ?? COUNTRY_REGISTRY;
  checkedRegistry(registry);

  const candidates = registry
    .filter((entry) => entry.enabled && entry.detection.enabled)
    .flatMap((entry) =>
      entry.detection.coordinateBounds
        .filter((bounds) => containsCoordinates(bounds, latitude, longitude))
        .map((bounds) => ({ entry, area: boundsArea(bounds) })),
    )
    .sort((left, right) => left.area - right.area);
  const match = candidates[0]?.entry;
  return resolveCountryRecommendation({
    countryCode: match?.code,
    source: "coordinates",
    confidence:
      !match || (accuracy !== undefined && accuracy > 50_000) ? "low" : "high",
    registry,
  });
}

const COUNTRY_BY_CODE = new Map(
  COUNTRY_REGISTRY.map((entry) => [entry.code, entry]),
);
const COUNTRY_BY_SLUG = new Map(
  COUNTRY_REGISTRY.map((entry) => [entry.slug, entry]),
);
const DEFAULT_COUNTRIES = COUNTRY_REGISTRY.filter((entry) => entry.isDefault);
if (DEFAULT_COUNTRIES.length !== 1) {
  throw new Error("COUNTRY_REGISTRY must define exactly one default market.");
}
export const DEFAULT_COUNTRY_CONFIG = DEFAULT_COUNTRIES[0];

export function getDefaultCountryConfig(
  registry: readonly CountryConfig[] = COUNTRY_REGISTRY,
): CountryConfig {
  if (registry === COUNTRY_REGISTRY) return DEFAULT_COUNTRY_CONFIG;
  checkedRegistry(registry);
  return registry.find((entry) => entry.isDefault)!;
}

export function getCountryConfig(
  code: string,
  registry: readonly CountryConfig[] = COUNTRY_REGISTRY,
): CountryConfig | undefined {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  return registry === COUNTRY_REGISTRY
    ? COUNTRY_BY_CODE.get(normalized)
    : registry.find((entry) => entry.code === normalized);
}

export function getCountryConfigBySlug(
  slug: string,
  registry: readonly CountryConfig[] = COUNTRY_REGISTRY,
): CountryConfig | undefined {
  const normalized = String(slug || "")
    .trim()
    .toLowerCase();
  return registry === COUNTRY_REGISTRY
    ? COUNTRY_BY_SLUG.get(normalized)
    : registry.find((entry) => entry.slug === normalized);
}

export function listGatewayCountries(): PublicCountryConfig[] {
  return listPublicCountries();
}

export interface MarketInfrastructureConfig {
  globalDomain: string;
  franceDomain: string;
  canonicalProtocol: "https" | "http";
}

export type MarketResolutionKind =
  | "global_gateway"
  | "market"
  | "coming_soon"
  | "unavailable"
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
  timezone: string | null;
  publicPath: string;
  internalPath: string;
  routingBasePath: string;
  canonicalUrl: string;
  infrastructure: MarketInfrastructureConfig;
  redirectUrl?: string;
  redirectStatus?: 308;
  reason?: string;
}

export interface ResolveMarketContextInput {
  hostname: string;
  pathname?: string;
  infrastructure: MarketInfrastructureConfig;
  allowDevelopmentHosts?: boolean;
  registry?: readonly CountryConfig[];
}

function normalizeHostname(value: string): string {
  const clean = String(value || "")
    .trim()
    .toLowerCase();
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
    country?.canonicalDomainMode === "france"
      ? infrastructure.franceDomain
      : infrastructure.globalDomain;
  return `${infrastructure.canonicalProtocol}://${domain}`;
}

function publicPathFor(country: CountryConfig, internalPath: string): string {
  if (normalizePathname(internalPath) === "/") {
    return country.basePath === "/" ? "/" : normalizePathname(country.basePath);
  }
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
  const experience = publicMarketExperience(country);
  return {
    kind:
      experience === "active"
        ? "market"
        : experience === "coming_soon"
          ? "coming_soon"
          : "unavailable",
    hostname,
    country,
    countryCode: country.countryCode,
    market: country.marketCode,
    locale: country.defaultLocale,
    currency: country.currency,
    timezone: country.timezone,
    publicPath,
    internalPath,
    routingBasePath: country.basePath,
    canonicalUrl: `${originFor(country, infrastructure)}${canonicalPath}`,
    infrastructure,
  };
}

export function resolveMarketContext(
  input: ResolveMarketContextInput,
): MarketContext {
  const infrastructure = input.infrastructure;
  const registry = input.registry ?? COUNTRY_REGISTRY;
  checkedRegistry(registry);
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
    timezone: null,
    publicPath: pathname,
    internalPath: pathname,
    routingBasePath: "/",
    canonicalUrl: `${originFor(null, infrastructure)}/`,
    infrastructure,
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

  const [firstSegment = ""] = pathname.slice(1).split("/");
  const pathCountry = getCountryConfigBySlug(firstSegment, registry);
  const usesSharedDevelopmentHost = isLocal && franceHost === globalHost;
  if (usesSharedDevelopmentHost && pathCountry?.isDefault) {
    const suffix = pathname.slice(`/${firstSegment}`.length) || "/";
    const target = `${originFor(pathCountry, infrastructure)}${normalizePathname(suffix)}`;
    return {
      kind: "redirect",
      hostname,
      country: pathCountry,
      countryCode: pathCountry.code,
      market: pathCountry.code,
      locale: pathCountry.defaultLocale,
      currency: pathCountry.currency,
      timezone: pathCountry.timezone,
      publicPath: pathname,
      internalPath: normalizePathname(suffix),
      routingBasePath: pathCountry.basePath,
      canonicalUrl: target,
      infrastructure,
      redirectUrl: target,
      redirectStatus: 308,
      reason: "DEFAULT_MARKET_CANONICAL_DOMAIN",
    };
  }
  if (usesSharedDevelopmentHost && pathCountry && !pathCountry.isDefault) {
    const suffix = pathname.slice(`/${firstSegment}`.length) || "/";
    return resultForCountry(
      pathCountry,
      hostname,
      pathname,
      normalizePathname(suffix),
      infrastructure,
    );
  }

  if (
    pathCountry &&
    !pathCountry.isDefault &&
    (hostname === franceHost || (isLocal && hostname === "fr.localhost"))
  ) {
    return { ...invalid(), reason: "HOST_MARKET_MISMATCH" };
  }

  if (hostname === franceHost || (isLocal && hostname === "fr.localhost")) {
    const france = getDefaultCountryConfig(registry);
    return resultForCountry(
      france,
      hostname,
      pathname,
      pathname,
      infrastructure,
    );
  }

  const localSlug = isLocal ? hostname.split(".")[0] : "";
  const localCountry = getCountryConfigBySlug(localSlug, registry);
  if (localCountry && !localCountry.isDefault) {
    if (pathCountry && pathCountry.code !== localCountry.code) {
      return { ...invalid(), reason: "HOST_MARKET_MISMATCH" };
    }
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
  if (
    !isGlobalHost &&
    !isLocalPathHost &&
    !(isLocal && hostname === "global.localhost")
  ) {
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
      timezone: null,
      publicPath: "/",
      internalPath: "/",
      routingBasePath: "/",
      canonicalUrl: `${originFor(null, infrastructure)}/`,
      infrastructure,
    };
  }

  const country = pathCountry;

  if (country?.isDefault) {
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
      timezone: country.timezone,
      publicPath: pathname,
      internalPath: normalizePathname(suffix),
      routingBasePath: country.basePath,
      canonicalUrl: target,
      infrastructure,
      redirectUrl: target,
      redirectStatus: 308,
      reason: "DEFAULT_MARKET_CANONICAL_DOMAIN",
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
    const france = getDefaultCountryConfig(registry);
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
    timezone: null,
    publicPath: pathname,
    internalPath: pathname,
    routingBasePath: "/",
    canonicalUrl: `${originFor(null, infrastructure)}/`,
    infrastructure,
    reason: /^[a-z]{2}$/i.test(firstSegment)
      ? "UNKNOWN_COUNTRY"
      : "GLOBAL_ROUTE_REQUIRES_COUNTRY",
  };
}

export interface BuildPublicUrlInput {
  country: string;
  route?: string;
  query?:
    URLSearchParams | Record<string, string | number | boolean | undefined>;
  hash?: string;
  infrastructure: MarketInfrastructureConfig;
  registry?: readonly CountryConfig[];
}

export function buildPublicUrl(input: BuildPublicUrlInput): string {
  const countryConfig = getCountryConfig(
    input.country,
    input.registry ?? COUNTRY_REGISTRY,
  );
  if (!countryConfig)
    throw new Error(`Unknown Shongre country: ${input.country}`);
  const infrastructure = input.infrastructure;
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
  if (input.hash)
    url.hash = input.hash.startsWith("#") ? input.hash : `#${input.hash}`;
  return url.toString();
}

export function buildMarketSwitchUrl(input: {
  targetCountry: string;
  internalPath?: string;
  query?: URLSearchParams;
  routeExists?: boolean;
  infrastructure: MarketInfrastructureConfig;
  registry?: readonly CountryConfig[];
}): string {
  return buildPublicUrl({
    country: input.targetCountry,
    route: input.routeExists === false ? "/" : input.internalPath || "/",
    query: input.query,
    infrastructure: input.infrastructure,
    registry: input.registry,
  });
}

const UNSAFE_MARKET_SWITCH_QUERY_KEYS = new Set([
  "access_token",
  "authorization",
  "code",
  "email",
  "handoff",
  "id_token",
  "nonce",
  "phone",
  "refresh_token",
  "session",
  "state",
  "token",
]);

export function sanitizeMarketSwitchQuery(
  input: URLSearchParams,
): URLSearchParams {
  const safe = new URLSearchParams();
  for (const [rawKey, rawValue] of input) {
    const key = rawKey.trim();
    const normalized = key.toLowerCase();
    const value = rawValue.trim();
    if (
      !key ||
      key.length > 80 ||
      value.length > 500 ||
      UNSAFE_MARKET_SWITCH_QUERY_KEYS.has(normalized) ||
      normalized.startsWith("utm_") ||
      normalized === "fbclid" ||
      normalized === "gclid"
    ) {
      continue;
    }
    safe.append(key, value);
  }
  return safe;
}

export const marketContextSchema = z.object({
  country: countryCodeSchema,
  locale: z.string().min(2).max(35),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type MarketContextInput = z.infer<typeof marketContextSchema>;
