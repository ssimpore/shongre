import { describe, it, expect } from "vitest";
import React from "react";
import {
  CategoryIcon,
  ICON_NAME_MAP,
  CATEGORY_SLUG_ICON_MAP,
} from "./CategoryIcon";
import {
  CANONICAL_TAXONOMY,
  TAXONOMY,
} from "../../domains/taxonomy/taxonomy.data";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";

describe("CategoryIcon Component & Taxonomy Icon Integrity", () => {
  // 1. Verify every root category in CANONICAL_TAXONOMY has a defined, mapped icon
  it("ensures each canonical root category has a valid iconName registered in ICON_NAME_MAP", () => {
    CANONICAL_TAXONOMY.forEach((root) => {
      expect(root.iconName).toBeDefined();
      expect(typeof root.iconName).toBe("string");
      expect(ICON_NAME_MAP[root.iconName!]).toBeDefined();
    });
  });

  // 2. Verify all categories in legacy TAXONOMY bridge have an icon
  it("ensures each category in TAXONOMY bridge has a non-empty iconName", () => {
    TAXONOMY.forEach((cat) => {
      expect(cat.iconName).toBeDefined();
      expect(cat.iconName.length).toBeGreaterThan(0);
      expect(
        ICON_NAME_MAP[cat.iconName] || CATEGORY_SLUG_ICON_MAP[cat.slug],
      ).toBeDefined();
    });
  });

  // 3. Verify subcategories have valid icon resolution
  it("resolves icons for subcategories across different domains", () => {
    const subCategories = [
      "vehicles.cars",
      "vehicles.motos",
      "real_estate.sales",
      "electronics.smartphones",
      "home_garden.furniture",
    ];

    subCategories.forEach((subId) => {
      const node = taxonomyService.getNode(subId);
      expect(node).toBeDefined();

      const element = CategoryIcon({
        category: node,
      }) as React.ReactElement<any>;
      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
    });
  });

  // 4. Verify slug fallback resolution
  it("resolves icons correctly by string slug", () => {
    const slugs = [
      "vehicules",
      "immobilier",
      "emploi",
      "services-prestations",
      "maison-deco",
      "multimedia",
      "mode-beaute",
      "famille-enfant",
      "culture-musique",
      "loisirs-sport",
      "animaux",
      "materiel-professionnel",
      "agriculture-materiaux",
      "vacances",
      "digital-services",
      "dons-divers",
    ];

    slugs.forEach((slug) => {
      const element = CategoryIcon({ category: slug }) as React.ReactElement;
      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
    });
  });

  // 5. Verify background container structure
  it("renders with background container when withBackground is true", () => {
    const element = CategoryIcon({
      category: "vehicules",
      size: "lg",
      withBackground: true,
      className: "custom-class",
    }) as React.ReactElement<any>;
    expect(element).toBeDefined();
    expect(element.props.className).toContain("custom-class");
    expect(element.props.style.backgroundColor).toBeDefined();
  });
});
