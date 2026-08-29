import { describe, expect, it } from "vitest";
import {
  getCompactTaxonomyLabelBySlug,
  getListingCategoryLabel,
  getListingSubCategoryLabel,
  getRecentSearchTitle,
} from "./taxonomy.display";

describe("taxonomy display labels", () => {
  it("uses the compact alias for category and subcategory presentation", () => {
    expect(getCompactTaxonomyLabelBySlug("vehicles")).toBe("Véhicules");
    expect(getCompactTaxonomyLabelBySlug("vehicles.cars")).toBe("Voitures");
  });

  it("resolves legacy listing slugs and preserves an explicit fallback", () => {
    expect(
      getListingCategoryLabel({
        categorySlug: "vehicules",
        categoryLabel: "Véhicules & Mobilité",
      }),
    ).toBe("Véhicules");
    expect(
      getListingSubCategoryLabel({
        subCategorySlug: "unknown-category",
        subCategoryLabel: "Libellé historique",
      }),
    ).toBe("Libellé historique");
  });

  it("refreshes stored category searches without rewriting free-text titles", () => {
    expect(
      getRecentSearchTitle({
        title: "Maison & Jardin",
        categorySlug: "maison-jardin",
      }),
    ).toBe("Maison");
    expect(
      getRecentSearchTitle({
        title: "Table de jardin",
        query: "table de jardin",
        categorySlug: "maison-jardin",
      }),
    ).toBe("Table de jardin");
  });
});
