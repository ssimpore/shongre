import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { metadataForRoute } from "./route-metadata";

function contextFor(hostname: string, pathname: string) {
  const context = resolveMarketContext({ hostname, pathname });
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

    expect(languages).toMatchObject({
      "fr-FR": "https://shongre.fr/categories",
      "fr-BE": "https://shongre.com/be/categories",
      "fr-CH": "https://shongre.com/ch/categories",
      "x-default": "https://shongre.com/",
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
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
