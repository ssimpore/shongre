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
      getGenericListingBrandLabel({
        attributes: { brand: "citroen" },
        taxonomy: {
          revision: 7,
          categoryId: "vehicles.cars",
          categorySlug: "voitures",
          categoryLabels: { "fr-FR": "Voitures" },
          rootId: "vehicles",
          rootSlug: "vehicules",
          rootLabels: { "fr-FR": "Véhicules" },
          path: [],
          brandLabels: { "fr-FR": "Citroën" },
        },
      }),
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

  it("uses published ordering and localized values without a static attribute fallback", () => {
    const listing = {
      attributes: { fuel: "diesel", mileage: 999 },
      taxonomy: {
        revision: 12,
        categoryId: "vehicles.cars",
        categorySlug: "voitures",
        categoryLabels: { "fr-FR": "Voitures" },
        rootId: "vehicles",
        rootSlug: "vehicules",
        rootLabels: { "fr-FR": "Véhicules" },
        path: [],
        cardCharacteristics: [
          {
            code: "fuel",
            labels: { "fr-FR": "Énergie" },
            values: { "fr-FR": "Électrique", "en-US": "Electric" },
          },
          {
            code: "mileage",
            labels: { "fr-FR": "Distance" },
            values: { "fr-FR": "10 km", "en-US": "10 km" },
          },
        ],
      },
    };
    expect(
      getGenericListingCardCharacteristicPresentation(listing, "en-GB"),
    ).toEqual([
      { icon: "tag", label: "Electric" },
      { icon: "tag", label: "10 km" },
    ]);
    expect(
      getGenericListingCardCharacteristicPresentation(
        { ...listing, taxonomy: undefined },
        "fr-FR",
      ),
    ).toEqual([]);
  });
});
