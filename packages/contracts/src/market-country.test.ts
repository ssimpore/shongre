import { describe, expect, it } from "vitest";
import {
  COUNTRY_REGISTRY,
  buildMarketSwitchUrl,
  buildPublicUrl,
  getDefaultCountryConfig,
  getCountryConfig,
  listPublicCountries,
  marketActivationIssues,
  publicMarketExperience,
  resolveCountryFromCoordinates,
  resolveCountryRecommendation,
  resolveMarketContext,
  validateCountryConfiguration,
  validateCountryRegistry,
  type CountryConfig,
} from "./market-country";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

describe("canonical Shongre country routing", () => {
  it("exposes one explicit default and complete market bootstrap metadata", () => {
    expect(
      COUNTRY_REGISTRY.filter((country) => country.isDefault),
    ).toHaveLength(1);
    expect(getDefaultCountryConfig().isDefault).toBe(true);
    for (const country of COUNTRY_REGISTRY) {
      expect(country.marketCode).toMatch(/^[A-Z]{2}$/);
      expect(country.countryCode).toMatch(/^[A-Z]{2}$/);
      expect(country.supportedCurrencies).toContain(country.currency);
      expect(country.locationHierarchy[0]).toBe("country");
      expect(country.capabilities.payments).toBe(country.payments.enabled);
    }
  });

  it.each(COUNTRY_REGISTRY)(
    "resolves registered market $code from its configured host and path",
    (country) => {
      const context = resolveMarketContext({
        hostname: country.isDefault
          ? infrastructure.franceDomain
          : infrastructure.globalDomain,
        pathname: country.isDefault ? "/" : country.basePath,
        infrastructure,
      });
      expect(context.countryCode).toBe(country.code);
      expect(context.locale).toBe(country.defaultLocale);
      expect(context.currency).toBe(country.currency);
      expect(context.timezone).toBe(country.timezone);
      expect(context.kind).toBe(
        publicMarketExperience(country) === "active"
          ? "market"
          : publicMarketExperience(country),
      );
    },
  );

  it.each(
    COUNTRY_REGISTRY.filter(
      (country) =>
        country.gatewayVisible && publicMarketExperience(country) !== "active",
    ),
  )("keeps non-active market $code fail closed", (country) => {
    expect(country.marketplace.enabled).toBe(false);
    expect(country.seo.indexable).toBe(false);
    expect(
      resolveCountryRecommendation({
        countryCode: country.code,
        source: "ip",
      }).experience,
    ).toBe(publicMarketExperience(country));
  });

  it.each([
    ["shongre.fr", "/immobilier", "FR", "/immobilier", "EUR"],
    ["shongre.com", "/be/immobilier", "BE", "/immobilier", "EUR"],
    ["shongre.com", "/ch/vehicules", "CH", "/vehicules", "CHF"],
    ["shongre.com", "/sn/emploi", "SN", "/emploi", "XOF"],
    ["shongre.com", "/bf/services", "BF", "/services", "XOF"],
  ])(
    "resolves %s%s",
    (hostname, pathname, countryCode, internalPath, currency) => {
      const context = resolveMarketContext({
        hostname,
        pathname,
        infrastructure,
      });
      expect(context.countryCode).toBe(countryCode);
      expect(context.internalPath).toBe(internalPath);
      expect(context.currency).toBe(currency);
      expect(context.timezone).toBeTruthy();
    },
  );

  it("keeps the .com root as the global gateway", () => {
    expect(
      resolveMarketContext({
        hostname: "shongre.com",
        pathname: "/",
        infrastructure,
      }).kind,
    ).toBe("global_gateway");
  });

  it("redirects France on .com permanently without losing the path", () => {
    const context = resolveMarketContext({
      hostname: "shongre.com",
      pathname: "/fr/immobilier/paris",
      infrastructure,
    });
    expect(context.kind).toBe("redirect");
    expect(context.redirectStatus).toBe(308);
    expect(context.redirectUrl).toBe("https://shongre.fr/immobilier/paris");
  });

  it("canonicalizes www and rejects unknown hosts", () => {
    expect(
      resolveMarketContext({
        hostname: "www.shongre.com",
        pathname: "/be/annonce/123",
        infrastructure,
      }).redirectUrl,
    ).toBe("https://shongre.com/be/annonce/123");
    expect(
      resolveMarketContext({
        hostname: "attacker.example",
        pathname: "/be",
        infrastructure,
        allowDevelopmentHosts: false,
      }).kind,
    ).toBe("invalid_host");
  });

  it.each(COUNTRY_REGISTRY.filter((country) => !country.isDefault))(
    "rejects host-and-market mismatch for $code",
    (country) => {
      expect(
        resolveMarketContext({
          hostname: infrastructure.franceDomain,
          pathname: country.basePath,
          infrastructure,
          allowDevelopmentHosts: false,
        }),
      ).toMatchObject({
        kind: "invalid_host",
        reason: "HOST_MARKET_MISMATCH",
      });
    },
  );

  it("supports subpath and subdomain development without changing production canonicals", () => {
    expect(
      resolveMarketContext({
        hostname: "localhost:3000",
        pathname: "/be/vehicules",
        infrastructure,
      }).countryCode,
    ).toBe("BE");
    expect(
      resolveMarketContext({
        hostname: "ch.localhost:3000",
        pathname: "/vehicules",
        infrastructure,
      }).canonicalUrl,
    ).toBe("https://shongre.com/ch/vehicules");
  });

  it("redirects the France path alias on a shared local origin", () => {
    const context = resolveMarketContext({
      hostname: "127.0.0.1:3000",
      pathname: "/fr/recherche",
      infrastructure: {
        globalDomain: "127.0.0.1:3000",
        franceDomain: "127.0.0.1:3000",
        canonicalProtocol: "http",
      },
    });
    expect(context.kind).toBe("redirect");
    expect(context.redirectStatus).toBe(308);
    expect(context.redirectUrl).toBe("http://127.0.0.1:3000/recherche");
  });

  it("builds every public link from the registry", () => {
    expect(
      buildPublicUrl({
        country: "FR",
        route: "/annonce/123",
        infrastructure,
      }),
    ).toBe("https://shongre.fr/annonce/123");
    expect(
      buildPublicUrl({
        country: "BE",
        route: "/",
        infrastructure,
      }),
    ).toBe("https://shongre.com/be");
    expect(
      buildPublicUrl({
        country: "BE",
        route: "/annonce/123",
        infrastructure,
      }),
    ).toBe("https://shongre.com/be/annonce/123");
    expect(
      buildMarketSwitchUrl({
        targetCountry: "CH",
        internalPath: "/vehicules",
        query: new URLSearchParams("sort=recent"),
        infrastructure,
      }),
    ).toBe("https://shongre.com/ch/vehicules?sort=recent");
  });

  it("keeps legal-review markets fail closed", () => {
    expect(getCountryConfig("SN")?.marketplace.enabled).toBe(false);
    expect(getCountryConfig("BF")?.seo.indexable).toBe(false);
  });

  it("returns the gateway for an unknown country and marks proxy signals uncertain", () => {
    expect(
      resolveCountryRecommendation({ countryCode: "ZZ", source: "ip" }),
    ).toMatchObject({
      status: "unknown",
      country: null,
      experience: "global_gateway",
    });
    expect(
      resolveCountryRecommendation({
        countryCode: getDefaultCountryConfig().code,
        source: "ip",
        confidence: "low",
        proxyOrVpnLikely: true,
      }),
    ).toMatchObject({ status: "uncertain", proxyOrVpnLikely: true });
  });

  it.each(["disabled", "unsupported", "paused"] as const)(
    "renders registry status %s as unavailable without status-specific UI logic",
    (launchStatus) => {
      const template = COUNTRY_REGISTRY.find((country) => !country.isDefault)!;
      expect(
        publicMarketExperience({
          ...template,
          launchStatus,
          marketplace: { ...template.marketplace, enabled: false },
        }),
      ).toBe("unavailable");
    },
  );

  it.each(
    COUNTRY_REGISTRY.filter(
      (country) => country.detection.enabled && country.gatewayVisible,
    ),
  )(
    "resolves configured coordinates for $code without country-specific logic",
    (country) => {
      const bounds = country.detection.coordinateBounds[0];
      const result = resolveCountryFromCoordinates({
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
      });
      expect(result.country?.code).toBe(country.code);
      expect(result.source).toBe("coordinates");
    },
  );

  it("does not expose hidden or disabled registry entries as recommendations", () => {
    const visible = COUNTRY_REGISTRY.find(
      (country) => !country.isDefault && country.gatewayVisible,
    )!;
    const hiddenRegistry = COUNTRY_REGISTRY.map((country) =>
      country.code === visible.code
        ? { ...country, gatewayVisible: false }
        : country,
    );
    expect(
      resolveCountryRecommendation({
        countryCode: visible.code,
        source: "ip",
        registry: hiddenRegistry,
      }),
    ).toMatchObject({
      status: "unknown",
      country: null,
      experience: "global_gateway",
    });

    const inactive = COUNTRY_REGISTRY.find(
      (country) => country.launchStatus === "coming_soon",
    )!;
    const disabledRegistry = COUNTRY_REGISTRY.map((country) =>
      country.code === inactive.code
        ? {
            ...country,
            enabled: false,
            launchStatus: "disabled" as const,
            gatewayVisible: false,
          }
        : country,
    );
    expect(
      resolveCountryRecommendation({
        countryCode: inactive.code,
        source: "ip",
        registry: disabledRegistry,
      }).country,
    ).toBeNull();
  });

  it("rejects activation when any readiness dimension is incomplete", () => {
    const active = COUNTRY_REGISTRY.find(
      (country) => publicMarketExperience(country) === "active",
    )!;
    const invalid = {
      ...active,
      readiness: { ...active.readiness, operations: false },
    };
    expect(marketActivationIssues(invalid)).toContain("readiness.operations");
    expect(() => validateCountryConfiguration(invalid)).toThrow(
      /cannot be activated/,
    );
  });

  it("fails safely on missing fields and duplicate registry routing", () => {
    const configured = COUNTRY_REGISTRY[0];
    const missingTimezone = { ...configured } as Record<string, unknown>;
    delete missingTimezone.timezone;
    expect(() => validateCountryConfiguration(missingTimezone)).toThrow();
    const duplicate = COUNTRY_REGISTRY.find((country) => !country.isDefault)!;
    expect(() =>
      validateCountryRegistry([...COUNTRY_REGISTRY, duplicate]),
    ).toThrow(/duplicate/);
  });

  it("recognizes a newly configured market in selection, detection, routing, and status rendering", () => {
    const template = COUNTRY_REGISTRY.find(
      (country) =>
        !country.isDefault && publicMarketExperience(country) === "active",
    )!;
    const futureMarket: CountryConfig = {
      ...template,
      code: "NL",
      countryCode: "NL",
      marketCode: "NL",
      marketId: "market-nl",
      slug: "nl",
      name: "Nederland",
      nativeName: "Nederland",
      flag: "🇳🇱",
      basePath: "/nl",
      defaultLocale: "nl-NL",
      supportedLocales: ["nl-NL"],
      timezone: "Europe/Amsterdam",
      phoneCountryCode: "+31",
      seo: { indexable: true, hreflang: "nl-NL" },
      monetization: { ...template.monetization, catalogMarketCode: "NL" },
      detection: {
        enabled: true,
        coordinateBounds: [{ north: 53.7, south: 50.7, east: 7.3, west: 3.2 }],
      },
      displayOrder: 999,
    };
    const registry = validateCountryRegistry([
      ...COUNTRY_REGISTRY,
      futureMarket,
    ]);

    expect(listPublicCountries(registry).at(-1)?.code).toBe("NL");
    expect(
      resolveCountryRecommendation({
        countryCode: "NL",
        source: "ip",
        registry,
      }).experience,
    ).toBe("active");
    expect(
      resolveMarketContext({
        hostname: infrastructure.globalDomain,
        pathname: "/nl/annonce/123",
        infrastructure,
        registry,
      }),
    ).toMatchObject({
      kind: "market",
      countryCode: "NL",
      internalPath: "/annonce/123",
    });
  });
});
