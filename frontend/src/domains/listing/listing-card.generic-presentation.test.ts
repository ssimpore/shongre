import { describe, expect, it } from "vitest";
import {
  getGenericListingCardCharacteristicPresentation,
  getGenericListingCardCharacteristics,
  getGenericListingConditionLabel,
} from "./listing-card.generic-presentation";

describe("generic listing card presentation", () => {
  it("keeps years ungrouped and formats vehicle decision fields", () => {
    expect(
      getGenericListingCardCharacteristics(
        {
          categorySlug: "vehicles",
          subCategorySlug: "cars",
          attributes: {
            model_year: 2022,
            mileage: 42_000,
            mileage_unit: "km",
            fuel_type: "hybrid",
          },
        },
        "fr-FR",
      ).map((value) => value.replace(/\s/gu, " ")),
    ).toEqual(["2022", "42 000 km", "Hybride"]);

    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "vehicles",
          subCategorySlug: "cars",
          attributes: {
            model_year: 2022,
            mileage: 42_000,
            mileage_unit: "km",
            fuel_type: "hybrid",
          },
        },
        "fr-FR",
      ).map((characteristic) => characteristic.icon),
    ).toEqual(["calendar", "gauge", "fuel"]);
  });

  it("hides non-applicable condition and excludes internal attributes", () => {
    expect(getGenericListingConditionLabel("not_applicable", "fr-FR")).toBe("");
    expect(
      getGenericListingCardCharacteristics(
        {
          categorySlug: "other",
          subCategorySlug: "other",
          attributes: { canonicalPath: "/annonce/test", brand: "apple" },
        },
        "fr-FR",
      ),
    ).toEqual(["Apple"]);
    expect(
      getGenericListingCardCharacteristicPresentation(
        {
          categorySlug: "other",
          subCategorySlug: "other",
          attributes: { material: "wood", unknown_field: "artisan" },
        },
        "fr-FR",
      ),
    ).toEqual([
      { icon: "layers", label: "Wood" },
      { icon: "tag", label: "Artisan" },
    ]);
  });
});
