import { describe, expect, it } from "vitest";
import {
  getTaxonomyV4CardBrandLabel,
  getTaxonomyV4CardRootLabel,
} from "./taxonomy-v4-card";

describe("compact listing-card taxonomy projection", () => {
  it("resolves canonical roots, descendants, slugs, and legacy aliases", () => {
    expect(
      getTaxonomyV4CardRootLabel("home_garden.furniture.sofas", "fr-FR"),
    ).toBe("Maison");
    expect(getTaxonomyV4CardRootLabel("maison-jardin", "fr-CH")).toBe("Maison");
    expect(getTaxonomyV4CardRootLabel("real-estate", "en-US")).toBe(
      "Real Estate",
    );
    expect(
      getTaxonomyV4CardRootLabel(
        "professional_btp.machinery.heavy_machinery",
        "fr-FR",
      ),
    ).toBe("Outils pro");
    expect(getTaxonomyV4CardRootLabel("baby_kids.strollers", "fr-FR")).toBe(
      "Bébé & Famille",
    );
    expect(getTaxonomyV4CardRootLabel("unknown.branch")).toBeUndefined();
  });

  it("returns only canonical brand labels and preserves missing data", () => {
    expect(getTaxonomyV4CardBrandLabel("citroen", "fr-FR")).toBe("Citroën");
    expect(getTaxonomyV4CardBrandLabel("BMW", "en-US")).toBe("BMW");
    expect(getTaxonomyV4CardBrandLabel("custom-brand")).toBeUndefined();
    expect(getTaxonomyV4CardBrandLabel(undefined)).toBeUndefined();
  });
});
