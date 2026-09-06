import { describe, expect, it } from "vitest";
import {
  getGenericListingCardCharacteristicPresentation,
  getGenericListingBrandLabel,
  getGenericListingCardHref,
} from "./listing-card.generic-presentation";

describe("generic listing-card presentation", () => {
  it("uses only a real non-empty brand attribute", () => {
    expect(
      getGenericListingBrandLabel({ attributes: { brand: "  IKEA  " } }),
    ).toBe("IKEA");
    expect(getGenericListingBrandLabel({ attributes: { brand: " " } })).toBe(
      undefined,
    );
    expect(getGenericListingBrandLabel({ attributes: {} })).toBeUndefined();
  });

  it("localizes a canonical brand option key", () => {
    expect(
      getGenericListingBrandLabel({ attributes: { brand: "citroen" } }),
    ).toBe("Citroën");
  });

  it("preserves a vertical canonical path and rejects external-looking paths", () => {
    expect(
      getGenericListingCardHref({
        id: "vehicle-1",
        attributes: { canonicalPath: "/auto/vehicule/peugeot-3008" },
      }),
    ).toBe("/auto/vehicule/peugeot-3008");
    expect(
      getGenericListingCardHref({
        id: "unsafe",
        attributes: { canonicalPath: "//example.test/redirect" },
      }),
    ).toBe("/annonce/unsafe");
    expect(getGenericListingCardHref({ id: "generic" })).toBe(
      "/annonce/generic",
    );
  });

  it("projects real-estate decision fields in hero order from real attributes", () => {
    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "immobilier",
          subCategorySlug: "real_estate.sales.apartments",
          attributes: {
            rooms: 4,
            living_area: 92,
            dpe_class: "B",
          },
        },
        "fr-FR",
      ),
    ).toEqual([
      { icon: "layout-grid", label: "4 pièces" },
      { icon: "ruler", label: "92 m²" },
      { icon: "home", label: "DPE B" },
    ]);
  });

  it("uses category-aware fields and a bounded fallback for other universes", () => {
    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "emploi",
          subCategorySlug: "jobs.offers.it_data",
          attributes: {
            contractType: "CDI",
            workingArrangement: "Télétravail hybride",
            profession: "Développement Web",
          },
        },
        "fr-FR",
      ),
    ).toEqual([
      { icon: "briefcase", label: "CDI" },
      { icon: "laptop", label: "Télétravail hybride" },
      { icon: "briefcase", label: "Développement Web" },
    ]);

    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "education",
          subCategorySlug: "cours-particuliers",
          attributes: {
            subject: "Mathématiques",
            deliveryModes: ["online", "in_person"],
            audience_level: "teenagers",
          },
        },
        "fr-FR",
      ),
    ).toEqual([
      { icon: "book-open", label: "Mathématiques" },
      { icon: "laptop", label: "En ligne, En présentiel" },
      { icon: "book-open", label: "Adolescents" },
    ]);

    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "collection",
          subCategorySlug: "collection.divers",
          attributes: {
            canonicalPath: "/annonce/collection-1",
            material: "wood",
            size: "large",
            year: 1987,
            extra: "ignored-after-three",
          },
        },
        "fr-FR",
      ),
    ).toHaveLength(3);
  });
});
