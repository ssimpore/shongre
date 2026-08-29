import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { INITIAL_LISTINGS } from "../../mocks/initialDemoData";
import { listTaxonomySeoRecords } from "../../domains/taxonomy/taxonomy.seo";
import type { PublicRouteDataResolution } from "./public-route-data";
import {
  isSeoMarketEnabled,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "./seo-policy";
import { collectionService } from "../../domains/collection/collection.service";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

const context = (hostname: string, pathname: string) =>
  resolveMarketContext({ hostname, pathname, infrastructure });

const categoryRouteData = (
  pathname: string,
  availableCountryCodes = ["FR"],
): PublicRouteDataResolution => ({
  status: "found",
  data: {
    kind: "listing_search",
    pathname,
    items: [INITIAL_LISTINGS[0]],
    total: 1,
    page: 1,
    totalPages: 1,
    availableCountryCodes,
  },
});

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
    ["shongre.fr", "/bons-plans", "https://shongre.fr/offres-prix-reduit"],
    [
      "shongre.com",
      "/be/bons-plans",
      "https://shongre.com/be/offres-prix-reduit",
    ],
    [
      "shongre.com",
      "/ch/bons-plans",
      "https://shongre.com/ch/offres-prix-reduit",
    ],
  ])(
    "redirects the legacy reduced-price route in the active %s market",
    (hostname, publicPath, canonicalUrl) => {
      const policy = resolveSeoPolicy({
        pathname: "/bons-plans",
        marketContext: context(hostname, publicPath),
      });
      expect(policy).toMatchObject({
        indexable: false,
        sitemapEligible: false,
        redirectPath: "/offres-prix-reduit",
        canonicalUrl,
      });
    },
  );

  it.each([
    [
      "/categorie/jet-skis-and-scooters-des-mers",
      "/categorie/scooters-des-mers-et-motos-nautiques",
    ],
    ["/categorie/dons-solidarite-bons-plans", "/categorie/don-d-objet"],
  ])("redirects the retired taxonomy URL %s", (pathname, redirectPath) => {
    const policy = resolveSeoPolicy({
      pathname,
      marketContext: context("shongre.fr", pathname),
    });
    expect(policy).toMatchObject({
      knownRoute: true,
      indexable: false,
      sitemapEligible: false,
      redirectPath,
      canonicalUrl: `https://shongre.fr${redirectPath}`,
    });
  });

  it("redirects a stable collection ID to the collection's canonical slug", () => {
    const collection = collectionService.getCollection("bons-plans")!;
    const policy = resolveSeoPolicy({
      pathname: "/collections/bons-plans",
      marketContext: context("shongre.fr", "/collections/bons-plans"),
      routeData: {
        status: "found",
        data: {
          kind: "collection",
          collection,
          listings: INITIAL_LISTINGS.slice(0, 2),
          availableCountryCodes: ["FR"],
        },
      },
    });
    expect(policy).toMatchObject({
      redirectPath: "/collections/offres-prix-reduit",
      canonicalUrl: "https://shongre.fr/collections/offres-prix-reduit",
    });
  });

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

  it("applies the generated localized SEO projection to every taxonomy node", () => {
    const market = context("shongre.fr", "/categories");
    listTaxonomySeoRecords().forEach(({ node, projection }) => {
      const pathname = projection.urlPattern;
      const policy = resolveSeoPolicy({
        pathname,
        marketContext: market,
        routeData: categoryRouteData(pathname),
      });
      expect(policy.knownRoute, node.id).toBe(true);
      expect(policy.indexable, node.id).toBe(true);
      expect(policy.canonicalPath, node.id).toBe(projection.urlPattern);
      expect(policy.canonicalUrl, node.id).toBe(
        `https://shongre.fr${projection.urlPattern}`,
      );
      expect(policy.title, node.id).toBe(projection.titleTemplate["fr-FR"]);
      expect(policy.description, node.id).toBe(
        projection.descriptionTemplate["fr-FR"],
      );
      expect(policy.taxonomyHeading, node.id).toBe(projection.h1["fr-FR"]);
      expect(policy.sitemapEligible, node.id).toBe(projection.sitemap.eligible);
    });
  });

  it("uses canonical full category names instead of compact navigation labels", () => {
    const pathname = "/categorie/maison-jardin";
    const policy = resolveSeoPolicy({
      pathname,
      marketContext: context("shongre.fr", pathname),
      routeData: categoryRouteData(pathname),
    });
    expect(policy).toMatchObject({
      title: "Maison & Jardin | Shongre",
      taxonomyHeading: "Maison & Jardin",
      canonicalUrl: "https://shongre.fr/categorie/maison-jardin",
    });
    expect(policy.title).not.toBe("Maison | Shongre");
  });

  it.each([
    ["shongre.fr", "/categorie/maison-jardin", "FR", "https://shongre.fr"],
    [
      "shongre.com",
      "/be/categorie/maison-jardin",
      "BE",
      "https://shongre.com/be",
    ],
    [
      "shongre.com",
      "/ch/categorie/maison-jardin",
      "CH",
      "https://shongre.com/ch",
    ],
  ])(
    "keeps taxonomy SEO localized and canonical in the %s active market",
    (hostname, publicPath, countryCode, expectedOrigin) => {
      const pathname = "/categorie/maison-jardin";
      const policy = resolveSeoPolicy({
        pathname,
        marketContext: context(hostname, publicPath),
        routeData: categoryRouteData(pathname, [countryCode]),
      });
      expect(policy).toMatchObject({
        indexable: true,
        title: "Maison & Jardin | Shongre",
        canonicalUrl: `${expectedOrigin}${pathname}`,
      });
    },
  );

  it("redirects stable IDs and generated aliases to the canonical taxonomy slug", () => {
    expect(
      resolveSeoPolicy({
        pathname: "/categorie/home_garden",
        marketContext: context("shongre.fr", "/categorie/home_garden"),
        routeData: categoryRouteData("/categorie/home_garden"),
      }),
    ).toMatchObject({
      indexable: false,
      canonicalPath: "/categorie/maison-jardin",
      redirectPath: "/categorie/maison-jardin",
      exclusionReason: "NON_CANONICAL_TAXONOMY_ROUTE",
    });
    expect(
      resolveSeoPolicy({
        pathname: "/categorie/professional_btp",
        marketContext: context("shongre.fr", "/categorie/professional_btp"),
        routeData: categoryRouteData("/categorie/professional_btp"),
      }),
    ).toMatchObject({
      canonicalPath: "/categorie/materiel-professionnel",
      redirectPath: "/categorie/materiel-professionnel",
    });
  });

  it("noindexes taxonomy facets while preserving the canonical category URL", () => {
    const pathname = "/categorie/maison-jardin";
    const policy = resolveSeoPolicy({
      pathname,
      query: { sortBy: "price_asc" },
      marketContext: context("shongre.fr", pathname),
      routeData: categoryRouteData(pathname),
    });
    expect(policy).toMatchObject({
      indexable: false,
      follow: true,
      canonicalUrl: "https://shongre.fr/categorie/maison-jardin",
      exclusionReason: "ARBITRARY_SEARCH_OR_FACET",
    });
  });

  it("emits the generated category schema types", () => {
    const rootPath = "/categorie/maison-jardin";
    const rootData = categoryRouteData(rootPath);
    const market = context("shongre.fr", rootPath);
    const rootPolicy = resolveSeoPolicy({
      pathname: rootPath,
      marketContext: market,
      routeData: rootData,
    });
    expect(
      structuredDataForPolicy(rootPolicy, market, rootData).map(
        (entry) => entry["@type"],
      ),
    ).toEqual(["CollectionPage", "BreadcrumbList"]);

    const leafPath = "/categorie/canapes-and-fauteuils";
    const leafData = categoryRouteData(leafPath);
    const leafPolicy = resolveSeoPolicy({
      pathname: leafPath,
      marketContext: market,
      routeData: leafData,
    });
    expect(
      structuredDataForPolicy(leafPolicy, market, leafData).map(
        (entry) => entry["@type"],
      ),
    ).toEqual(["CollectionPage", "ItemList", "BreadcrumbList"]);
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
