import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { webBrandAssets } from "@shongre/brand/web";
import { metadataForRoute } from "./route-metadata";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

function contextFor(hostname: string, pathname: string) {
  const context = resolveMarketContext({ hostname, pathname, infrastructure });
  if (context.kind !== "market") {
    throw new Error(`Expected a marketplace context, received ${context.kind}`);
  }
  return context;
}

describe("country-aware route metadata", () => {
  it("keeps France on its canonical root domain", () => {
    const metadata = metadataForRoute({
      pathname: "/categories",
      marketContext: contextFor("shongre.fr", "/categories"),
    });

    expect(String(metadata.alternates?.canonical)).toBe(
      "https://shongre.fr/categories",
    );
    expect(
      metadata.openGraph && "locale" in metadata.openGraph
        ? metadata.openGraph.locale
        : undefined,
    ).toBe("fr_FR");
    expect(metadata.openGraph).toMatchObject({
      siteName: "SHONGRE.",
      images: [
        {
          url: new URL(
            webBrandAssets.social.openGraphLight.src,
            "https://shongre.fr",
          ).href,
          width: 1200,
          height: 630,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [
        new URL(webBrandAssets.social.openGraphLight.src, "https://shongre.fr")
          .href,
      ],
    });
  });

  it("keeps Belgium and Switzerland under their .com country paths", () => {
    const belgium = metadataForRoute({
      pathname: "/categories",
      marketContext: contextFor("shongre.com", "/be/categories"),
    });
    const switzerland = metadataForRoute({
      pathname: "/categories",
      marketContext: contextFor("shongre.com", "/ch/categories"),
    });

    expect(String(belgium.alternates?.canonical)).toBe(
      "https://shongre.com/be/categories",
    );
    expect(String(switzerland.alternates?.canonical)).toBe(
      "https://shongre.com/ch/categories",
    );
  });

  it("emits reciprocal alternates only for active indexable markets", () => {
    const metadata = metadataForRoute({
      pathname: "/categories",
      marketContext: contextFor("shongre.com", "/be/categories"),
    });
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;

    expect(languages).toEqual({
      "fr-FR": "https://shongre.fr/categories",
      "fr-BE": "https://shongre.com/be/categories",
      "fr-CH": "https://shongre.com/ch/categories",
    });
    expect(Object.values(languages || {})).not.toContain(
      "https://shongre.com/sn/categories",
    );
  });

  it("collapses search filters into one canonical and noindexes free text", () => {
    const metadata = metadataForRoute({
      pathname: "/recherche",
      query: { query: "vélo", page: "3" },
      marketContext: contextFor("shongre.com", "/ch/recherche"),
    });

    expect(String(metadata.alternates?.canonical)).toBe(
      "https://shongre.com/ch/recherche",
    );
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("uses the global gateway as x-default only for equivalent market homes", () => {
    const metadata = metadataForRoute({
      pathname: "/",
      marketContext: contextFor("shongre.fr", "/"),
    });
    expect(metadata.alternates?.languages).toMatchObject({
      "fr-FR": "https://shongre.fr/",
      "fr-BE": "https://shongre.com/be",
      "fr-CH": "https://shongre.com/ch",
      "x-default": "https://shongre.com/",
    });
  });
});

describe("storefront canonicals", () => {
  const seller = {
    id: "user_dealer_owner",
    slug: "michel-girard-auto-select-lyon",
    storeSlug: "auto-select-lyon",
    storeName: "Auto Select Lyon",
    name: "Michel Girard",
    accountType: "professional" as const,
    sellerType: "pro" as const,
    country: "FR",
    isVerified: true,
    isBusinessVerified: true,
    rating: 4.8,
    reviewCount: 64,
    responseRatePercent: 94,
  };

  it("addresses a professional storefront by its store slug and names the business", () => {
    const metadata = metadataForRoute({
      pathname: "/boutique/auto-select-lyon",
      marketContext: contextFor("shongre.fr", "/boutique/auto-select-lyon"),
      routeData: {
        status: "found",
        data: { kind: "seller", seller, listings: [], reviews: [] },
      },
    });
    expect(String(metadata.alternates?.canonical)).toBe(
      "https://shongre.fr/boutique/auto-select-lyon",
    );
    expect(String(metadata.title)).toContain("Auto Select Lyon");
    expect(String(metadata.title)).not.toContain("Michel Girard");
  });

  it("keeps a person's profile on their own slug", () => {
    const person = {
      ...seller,
      storeSlug: undefined,
      storeName: undefined,
      accountType: "individual" as const,
      sellerType: "individual" as const,
      slug: "thomas-laurent",
      name: "Thomas Laurent",
    };
    const metadata = metadataForRoute({
      pathname: "/profil/thomas-laurent",
      marketContext: contextFor("shongre.fr", "/profil/thomas-laurent"),
      routeData: {
        status: "found",
        data: { kind: "seller", seller: person, listings: [], reviews: [] },
      },
    });
    expect(String(metadata.alternates?.canonical)).toBe(
      "https://shongre.fr/profil/thomas-laurent",
    );
    expect(String(metadata.title)).toContain("Thomas Laurent");
  });
});
