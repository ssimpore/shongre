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

  it("localizes canonical employment values into compact card labels", () => {
    const characteristics = (
      contractType: string,
      remoteWork: string,
      locale: string,
    ) =>
      getGenericListingCardCharacteristics(
        {
          categorySlug: "jobs",
          subCategorySlug: "jobs.offers",
          attributes: {
            contract_type: contractType,
            remote_work: remoteWork,
          },
        },
        locale,
      );

    expect(characteristics("apprenticeship", "onsite", "fr-FR")).toEqual([
      "Alternance",
      "Sur site",
    ]);
    expect(characteristics("seasonal", "fully_remote", "fr-FR")).toEqual([
      "Saisonnier",
      "Télétravail",
    ]);
    expect(characteristics("temporary", "hybrid", "fr-FR")).toEqual([
      "Intérim",
      "Hybride",
    ]);
    expect(characteristics("internship", "onsite", "en-GB")).toEqual([
      "Internship",
      "On-site",
    ]);
  });
});
