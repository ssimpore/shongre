import { describe, expect, it } from "vitest";
import type { TaxonomyV1TreeResponse } from "@shongre/contracts/taxonomy";
import {
  projectTaxonomyForRoute,
  resolveTaxonomySeoRecord,
} from "./taxonomy.seo";

/**
 * The full taxonomy snapshot was serialised into the server-rendered HTML of
 * `/recherche` and `/categorie/:slug` — 79% of a 1.14 MB document — although
 * its only consumer resolves a single node by slug. These tests pin that the
 * narrowed payload answers that lookup identically, so the saving cannot come
 * at the cost of the SEO policy losing its category.
 */

const node = (id: string, slug: string) => ({
  id,
  slug,
  parentId: null,
  level: 0,
  labels: { "fr-FR": slug },
  shortLabels: { "fr-FR": slug },
  description: "",
  status: "active",
  seo: { indexable: true },
  marketAvailability: [
    {
      marketCode: "FR",
      status: "active",
      marketplaceEnabled: true,
      indexable: true,
    },
  ],
});

const tree = {
  taxonomyVersion: "v1",
  revision: 105,
  marketCode: "FR",
  locale: "fr-FR",
  items: [node("vehicles", "vehicules"), node("mode", "mode")],
  aliases: [
    { alias: "voitures", canonicalCategoryId: "vehicles" },
    { alias: "vetements", canonicalCategoryId: "mode" },
  ],
  seo: [
    {
      categoryId: "vehicles",
      indexable: true,
      urlPattern: "/categorie/vehicules",
    },
    { categoryId: "mode", indexable: true, urlPattern: "/categorie/mode" },
  ],
  listingTypes: Array.from({ length: 213 }, (_, index) => ({
    id: `type-${index}`,
    marketAvailability: [{ marketCode: "FR", status: "active" }],
  })),
} as unknown as TaxonomyV1TreeResponse;

describe("route-scoped taxonomy projection", () => {
  it("resolves the same record from the narrowed payload as from the whole tree", () => {
    for (const identifier of ["vehicules", "vehicles", "voitures"]) {
      const full = resolveTaxonomySeoRecord(identifier, tree);
      const narrowed = resolveTaxonomySeoRecord(
        identifier,
        projectTaxonomyForRoute(tree, identifier),
      );
      expect(full, identifier).toBeTruthy();
      expect(narrowed, identifier).toEqual(full);
    }
  });

  it("carries only the route's own category", () => {
    const projected = projectTaxonomyForRoute(tree, "vehicules");
    expect(projected.items.map((item) => item.id)).toEqual(["vehicles"]);
    expect(projected.seo?.map((row) => row.categoryId)).toEqual(["vehicles"]);
    expect(projected.aliases?.map((row) => row.alias)).toEqual(["voitures"]);
    // Publication metadata for the wizard, never read by the SEO policy.
    expect(projected.listingTypes).toEqual([]);
  });

  it("keeps the publication identity the payload is bound to", () => {
    const projected = projectTaxonomyForRoute(tree, "vehicules");
    expect(projected.revision).toBe(tree.revision);
    expect(projected.taxonomyVersion).toBe(tree.taxonomyVersion);
    expect(projected.marketCode).toBe(tree.marketCode);
    expect(projected.locale).toBe(tree.locale);
  });

  it("empties the payload when the route resolves no category", () => {
    for (const identifier of [null, undefined, "", "aucune-categorie"]) {
      const projected = projectTaxonomyForRoute(tree, identifier);
      expect(projected.items).toEqual([]);
      expect(projected.seo).toEqual([]);
      expect(projected.listingTypes).toEqual([]);
      // And still resolves to nothing, exactly as the full tree would.
      expect(resolveTaxonomySeoRecord(identifier, projected)).toBeNull();
      expect(resolveTaxonomySeoRecord(identifier, tree)).toBeNull();
    }
  });

  it("is materially smaller than the snapshot it replaces", () => {
    const full = JSON.stringify(tree).length;
    const projected = JSON.stringify(
      projectTaxonomyForRoute(tree, "vehicules"),
    ).length;
    expect(projected).toBeLessThan(full * 0.2);
  });
});
