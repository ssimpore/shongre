import { describe, it, expect } from "vitest";
import React from "react";
import { FileKey } from "lucide-react";
import { CategoryIcon, ICON_NAME_MAP } from "./CategoryIcon";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";

const categories = getTaxonomyV4PublicBundle().categories;

describe("CategoryIcon Component & Taxonomy Icon Integrity", () => {
  it("resolves every canonical v4 icon directly from taxonomy metadata", () => {
    categories.forEach((category) => {
      expect(ICON_NAME_MAP[category.iconName], category.iconName).toBeDefined();
    });

    const rootIcons = categories
      .filter((category) => !category.parentId)
      .map(
        (category) =>
          (
            CategoryIcon({
              iconName: category.iconName,
            }) as React.ReactElement
          ).type,
      );
    expect(new Set(rootIcons).size).toBe(rootIcons.length);
  });

  it("preserves the dedicated digital-products icon from taxonomy metadata", () => {
    const publicDigitalCategory = categories.find(
      (category) => category.id === "digital_products",
    );

    expect(publicDigitalCategory?.iconName).toBe("file-key");
    expect(
      CategoryIcon({
        iconName: publicDigitalCategory?.iconName,
      }) as React.ReactElement,
    ).toHaveProperty("type", FileKey);
  });

  // 1. Verify every API taxonomy root has a defined, mapped icon.
  it("ensures each canonical root category has a valid iconName registered in ICON_NAME_MAP", () => {
    categories
      .filter((category) => !category.parentId)
      .forEach((root) => {
        expect(root.iconName).toBeDefined();
        expect(typeof root.iconName).toBe("string");
        expect(ICON_NAME_MAP[root.iconName]).toBeDefined();
      });
  });

  // 2. Verify subcategories have valid icon resolution.
  it("resolves icons for subcategories across different domains", () => {
    const subCategories = [
      "vehicles.cars",
      "vehicles.motos",
      "real_estate.sales.apartments",
      "electronics.smartphones",
      "home_garden.furniture",
    ];

    subCategories.forEach((subId) => {
      const node = categories.find((category) => category.id === subId);
      expect(node).toBeDefined();

      const element = CategoryIcon({
        category: node?.slug,
        iconName: node?.iconName,
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
    expect(element.props.className).toContain(
      "category-icon-tone-with-background",
    );
    expect(element.props.style["--category-accent"]).toBeDefined();
  });
});
