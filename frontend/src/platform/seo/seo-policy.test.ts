import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { INITIAL_LISTINGS } from "../../mocks/initialDemoData";
import type { PublicRouteDataResolution } from "./public-route-data";
import { isSeoMarketEnabled, resolveSeoPolicy } from "./seo-policy";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

const context = (hostname: string, pathname: string) =>
  resolveMarketContext({ hostname, pathname, infrastructure });

describe("central SEO policy", () => {
  it.each([
    [
      "shongre.fr",
      "/categories",
      "FR",
      "fr-FR",
      "EUR",
      "https://shongre.fr/categories",
    ],
    [
      "shongre.com",
      "/be/categories",
      "BE",
      "fr-BE",
      "EUR",
      "https://shongre.com/be/categories",
    ],
    [
      "shongre.com",
      "/ch/categories",
      "CH",
      "fr-CH",
      "CHF",
      "https://shongre.com/ch/categories",
    ],
  ])(
    "indexes the active %s market with its registry locale and currency",
    (hostname, pathname, code, locale, currency, canonical) => {
      const market = context(hostname, pathname);
      expect(market).toMatchObject({
        kind: "market",
        countryCode: code,
        locale,
        currency,
      });
      const policy = resolveSeoPolicy({
        pathname: "/categories",
        marketContext: market,
      });
      expect(policy).toMatchObject({
        indexable: true,
        sitemapEligible: true,
        canonicalUrl: canonical,
      });
    },
  );

  it.each([
    ["SN", "/sn"],
    ["BF", "/bf"],
  ])(
    "keeps coming-soon %s launch surfaces out of indexing",
    (_code, pathname) => {
      const market = context("shongre.com", pathname);
      expect(market.kind).toBe("coming_soon");
      expect(isSeoMarketEnabled(market)).toBe(false);
      const policy = resolveSeoPolicy({ pathname: "/", marketContext: market });
      expect(policy).toMatchObject({
        indexable: false,
        sitemapEligible: false,
        exclusionReason: "MARKET_NOT_INDEXABLE",
      });
    },
  );

  it("fails closed for an enabled marketplace whose SEO approval is disabled", () => {
    const luxembourg = context("shongre.com", "/lu/categories");
    expect(luxembourg.kind).toBe("market");
    expect(isSeoMarketEnabled(luxembourg)).toBe(false);
  });

  it("normalizes a legacy active listing into the France market before deciding indexability", () => {
    const listing = INITIAL_LISTINGS.find((entry) => entry.id === "list-102")!;
    const routeData: PublicRouteDataResolution = {
      status: "found",
      data: {
        kind: "listing",
        listing,
        seller: null,
        similarListings: [],
      },
    };
    const policy = resolveSeoPolicy({
      pathname: `/annonce/${listing.id}`,
      marketContext: context("shongre.fr", `/annonce/${listing.id}`),
      routeData,
    });
    expect(policy).toMatchObject({
      indexable: true,
      canonicalUrl: "https://shongre.fr/annonce/list-102",
      resourceType: "listing",
      lifecycle: "available",
    });
  });

  it("redirects a generic vertical projection to its authoritative route and excludes the alias", () => {
    const listing = INITIAL_LISTINGS.find((entry) => entry.id === "list-102")!;
    const projected = {
      ...listing,
      id: "listing_auto_example",
      attributes: {
        ...listing.attributes,
        canonicalPath: "/auto/vehicule/example",
      },
    };
    const policy = resolveSeoPolicy({
      pathname: `/annonce/${projected.id}`,
      marketContext: context("shongre.fr", `/annonce/${projected.id}`),
      routeData: {
        status: "found",
        data: {
          kind: "listing",
          listing: projected,
          seller: null,
          similarListings: [],
        },
      },
    });
    expect(policy).toMatchObject({
      indexable: false,
      sitemapEligible: false,
      structuredDataEligible: false,
      canonicalUrl: "https://shongre.fr/auto/vehicule/example",
      redirectPath: "/auto/vehicule/example",
      exclusionReason: "SERVER_CONTENT_NOT_VALIDATED",
    });
  });

  it("noindexes arbitrary search state but keeps discovery links followable", () => {
    const policy = resolveSeoPolicy({
      pathname: "/recherche",
      query: { query: "vélo", sortBy: "price_asc", page: "3" },
      marketContext: context("shongre.fr", "/recherche"),
    });
    expect(policy).toMatchObject({
      indexable: false,
      follow: true,
      canonicalUrl: "https://shongre.fr/recherche",
      exclusionReason: "ARBITRARY_SEARCH_OR_FACET",
    });
  });

  it("excludes expired jobs from schema and active sitemaps", () => {
    const fixture = {
      status: "found" as const,
      data: {
        kind: "job" as const,
        job: {
          slug: "expired-job",
          expiresAt: "2026-01-01T00:00:00.000Z",
          publishedAt: "2025-12-01T00:00:00.000Z",
          title: "Offre expirée",
          employer: { name: "Exemple" },
          primaryLocation: { label: "Paris" },
          contractTypeLabel: "CDI",
          workingArrangementLabel: "Sur site",
        },
      },
    } as unknown as PublicRouteDataResolution;
    const policy = resolveSeoPolicy({
      pathname: "/emploi/offre/expired-job",
      marketContext: context("shongre.fr", "/emploi/offre/expired-job"),
      routeData: fixture,
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(policy).toMatchObject({
      indexable: false,
      sitemapEligible: false,
      structuredDataEligible: false,
      lifecycle: "expired",
      exclusionReason: "RESOURCE_EXPIRED",
    });
  });
});
