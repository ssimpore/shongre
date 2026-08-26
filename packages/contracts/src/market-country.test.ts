import { describe, expect, it } from "vitest";
import {
  COUNTRY_REGISTRY,
  buildMarketSwitchUrl,
  buildPublicUrl,
  getDefaultCountryConfig,
  getCountryConfig,
  resolveMarketContext,
} from "./market-country";

describe("canonical Shongre country routing", () => {
  it("exposes one explicit default and complete market bootstrap metadata", () => {
    expect(COUNTRY_REGISTRY.filter((country) => country.isDefault)).toHaveLength(
      1,
    );
    expect(getDefaultCountryConfig().code).toBe("FR");
    for (const country of COUNTRY_REGISTRY) {
      expect(country.marketCode).toMatch(/^[A-Z]{2}$/);
      expect(country.countryCode).toMatch(/^[A-Z]{2}$/);
      expect(country.supportedCurrencies).toContain(country.currency);
      expect(country.locationHierarchy[0]).toBe("country");
      expect(country.capabilities.payments).toBe(country.payments.enabled);
    }
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
      const context = resolveMarketContext({ hostname, pathname });
      expect(context.countryCode).toBe(countryCode);
      expect(context.internalPath).toBe(internalPath);
      expect(context.currency).toBe(currency);
      expect(context.timezone).toBeTruthy();
    },
  );

  it("keeps the .com root as the global gateway", () => {
    expect(
      resolveMarketContext({ hostname: "shongre.com", pathname: "/" }).kind,
    ).toBe("global_gateway");
  });

  it("redirects France on .com permanently without losing the path", () => {
    const context = resolveMarketContext({
      hostname: "shongre.com",
      pathname: "/fr/immobilier/paris",
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
      }).redirectUrl,
    ).toBe("https://shongre.com/be/annonce/123");
    expect(
      resolveMarketContext({
        hostname: "attacker.example",
        pathname: "/be",
        allowDevelopmentHosts: false,
      }).kind,
    ).toBe("invalid_host");
  });

  it("supports subpath and subdomain development without changing production canonicals", () => {
    expect(
      resolveMarketContext({
        hostname: "localhost:3000",
        pathname: "/be/vehicules",
      }).countryCode,
    ).toBe("BE");
    expect(
      resolveMarketContext({
        hostname: "ch.localhost:3000",
        pathname: "/vehicules",
      }).canonicalUrl,
    ).toBe("https://shongre.com/ch/vehicules");
  });

  it("builds every public link from the registry", () => {
    expect(buildPublicUrl({ country: "FR", route: "/annonce/123" })).toBe(
      "https://shongre.fr/annonce/123",
    );
    expect(buildPublicUrl({ country: "BE", route: "/annonce/123" })).toBe(
      "https://shongre.com/be/annonce/123",
    );
    expect(
      buildMarketSwitchUrl({
        targetCountry: "CH",
        internalPath: "/vehicules",
        query: new URLSearchParams("sort=recent"),
      }),
    ).toBe("https://shongre.com/ch/vehicules?sort=recent");
  });

  it("keeps legal-review markets fail closed", () => {
    expect(getCountryConfig("SN")?.marketplace.enabled).toBe(false);
    expect(getCountryConfig("BF")?.seo.indexable).toBe(false);
  });
});
