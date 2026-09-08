import { describe, it, expect, vi } from "vitest";
import React from "react";
import { CategoryFilterRail } from "./CategoryFilterRail";
import { taxonomyV4TestCategories } from "../../testing/taxonomy-v4.test-support";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";

describe("CategoryFilterRail Primitive", () => {
  it("instantiates correctly as a React component element", () => {
    const handleSelectCategory = vi.fn();
    const element = React.createElement(CategoryFilterRail, {
      selectedCategorySlug: "vehicules",
      onSelectCategory: handleSelectCategory,
      showAllOption: true,
      showSubCategories: true,
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(CategoryFilterRail);
    expect(element.props.selectedCategorySlug).toBe("vehicules");
  });

  it("covers major requested marketplace categories in taxonomy", () => {
    const slugs = taxonomyV4TestCategories.map((c) => c.slug);
    // Common requested categories: Automobile/Véhicules, Immobilier, High-Tech/Multimédia
    expect(slugs).toContain("vehicules");
    expect(slugs).toContain("immobilier");
    expect(slugs).toContain("electronique");

    const vehiculesCat = taxonomyV4TestCategories.find(
      (c) => c.slug === "vehicules",
    );
    expect(vehiculesCat).toBeDefined();
    expect(getTaxonomyLabel(vehiculesCat!, "compact")).toBeTruthy();

    const immoCat = taxonomyV4TestCategories.find(
      (c) => c.slug === "immobilier",
    );
    expect(immoCat).toBeDefined();
    expect(getTaxonomyLabel(immoCat!, "compact")).toBeTruthy();

    const techCat = taxonomyV4TestCategories.find(
      (c) => c.slug === "electronique",
    );
    expect(techCat).toBeDefined();
    expect(getTaxonomyLabel(techCat!, "compact")).toBeTruthy();
  });

  it("provides compact labels and icons for all categories in the rail", () => {
    taxonomyV4TestCategories.forEach((cat) => {
      const compactLabel = getTaxonomyLabel(cat, "compact");
      expect(compactLabel).toBeTruthy();
      expect(typeof compactLabel).toBe("string");
      expect(cat.iconName).toBeTruthy();
      expect(cat.slug).toBeTruthy();
    });
    expect(
      getTaxonomyLabel(
        taxonomyV4TestCategories.find(
          (cat) => cat.id === "professional_equipment",
        ),
        "compact",
      ),
    ).toBe("Outils pro");
    expect(
      getTaxonomyLabel(
        taxonomyV4TestCategories.find((cat) => cat.id === "home_garden"),
        "compact",
      ),
    ).toBe("Maison");
  });

  it("supports subcategories rendering for active categories", () => {
    const vehCat = taxonomyV4TestCategories.find((c) => c.slug === "vehicules");
    expect(vehCat?.subCategories.length).toBeGreaterThan(0);

    const sub = vehCat!.subCategories[0];
    expect(sub.name).toBeTruthy();
    expect(sub.slug).toBeTruthy();
  });
});
