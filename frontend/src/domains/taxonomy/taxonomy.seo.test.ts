import { describe, expect, it } from "vitest";
import {
  listTaxonomySeoRecords,
  resolveLocalizedTaxonomySeoText,
  resolveTaxonomySeoRecord,
  taxonomyBranchSlugs,
  taxonomyNodeIsIndexableInMarket,
  taxonomySlugsForListing,
} from "./taxonomy.seo";

describe("generated taxonomy SEO projection", () => {
  it("covers every current taxonomy node with a unique canonical route", () => {
    const records = listTaxonomySeoRecords();
    expect(records).toHaveLength(301);
    expect(new Set(records.map(({ node }) => node.id)).size).toBe(301);
    expect(
      new Set(records.map(({ projection }) => projection.urlPattern)).size,
    ).toBe(301);

    records.forEach(({ node, projection }) => {
      expect(projection.categoryId).toBe(node.id);
      expect(projection.urlPattern).toBe(`/categorie/${node.slug}`);
      Object.entries(node.labels).forEach(([locale, canonicalLabel]) => {
        expect(projection.h1[locale], `${node.id}:${locale}:h1`).toBe(
          canonicalLabel,
        );
        expect(
          projection.titleTemplate[locale],
          `${node.id}:${locale}:title`,
        ).toContain(canonicalLabel);
        expect(
          projection.titleTemplate[locale].length,
          `${node.id}:${locale}:title-length`,
        ).toBeLessThanOrEqual(60);
        expect(
          projection.descriptionTemplate[locale],
          `${node.id}:${locale}:description`,
        ).toBeTruthy();
        expect(
          projection.descriptionTemplate[locale].length,
          `${node.id}:${locale}:description-length`,
        ).toBeLessThanOrEqual(160);
      });
    });
  });

  it("keeps compact UI aliases out of canonical SEO copy", () => {
    const home = resolveTaxonomySeoRecord("maison-jardin")!;
    const professional = resolveTaxonomySeoRecord("materiel-professionnel")!;
    expect(home.node.shortLabels["fr-FR"]).toBe("Maison");
    expect(home.projection.h1["fr-FR"]).toBe("Maison & Jardin");
    expect(home.projection.titleTemplate["fr-FR"]).not.toBe("Maison | Shongre");
    expect(professional.node.shortLabels["fr-FR"]).toBe("Outils pro");
    expect(professional.projection.h1["fr-FR"]).toBe("Matériel professionnel");
  });

  it("resolves locale variants and falls back to readable localized copy", () => {
    const values = { "fr-FR": "Maison", "en-US": "Home" };
    expect(resolveLocalizedTaxonomySeoText(values, "fr-BE")).toBe("Maison");
    expect(resolveLocalizedTaxonomySeoText(values, "en-GB")).toBe("Home");
    expect(resolveLocalizedTaxonomySeoText(values, "de-DE")).toBe("Maison");
  });

  it("honors each taxonomy node's explicit market availability", () => {
    listTaxonomySeoRecords().forEach(({ node }) => {
      expect(taxonomyNodeIsIndexableInMarket(node, "FR"), node.id).toBe(true);
      expect(taxonomyNodeIsIndexableInMarket(node, "BE"), node.id).toBe(true);
      expect(taxonomyNodeIsIndexableInMarket(node, "CH"), node.id).toBe(true);
      expect(taxonomyNodeIsIndexableInMarket(node, "SN"), node.id).toBe(false);
      expect(taxonomyNodeIsIndexableInMarket(node, "BF"), node.id).toBe(false);
    });
  });

  it("expands listing inventory through every canonical taxonomy ancestor", () => {
    expect(taxonomyBranchSlugs("home_garden.furniture.sofas")).toEqual([
      "maison-jardin",
      "ameublement",
      "canapes-and-fauteuils",
    ]);
    expect(
      taxonomySlugsForListing({
        categorySlug: "maison-jardin",
        subCategorySlug: "canapes-and-fauteuils",
      }),
    ).toEqual(["maison-jardin", "ameublement", "canapes-and-fauteuils"]);
  });

  it("resolves generated legacy aliases to their current canonical record", () => {
    expect(resolveTaxonomySeoRecord("professional_btp")?.node.id).toBe(
      "professional_equipment",
    );
  });
});
