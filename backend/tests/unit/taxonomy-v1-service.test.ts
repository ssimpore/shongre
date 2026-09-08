import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { resolveMarketContext } from "@shongre/contracts";
import { describe, expect, it } from "vitest";
import {
  TaxonomyV1Error,
  TaxonomyV1Service,
} from "../../src/modules/taxonomy/taxonomy.v1.service.js";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

function market(hostname: string, pathname = "/") {
  return resolveMarketContext({ hostname, pathname, infrastructure });
}

describe("TaxonomyV1Service", () => {
  const service = new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1);

  it("preserves unchanged historical answers while validating edits to a broad category", () => {
    const previous = {
      model_year: 2022,
      mileage: 100,
      retired_answer: "preserved",
    };
    const base = {
      categoryIdentity: "vehicles.cars",
      marketContext: market("shongre.fr"),
      sellerType: "individual" as const,
      locale: "fr-FR",
      previousAttributes: previous,
    };
    expect(
      service.validateRecordedUpdate({
        ...base,
        attributes: { ...previous, mileage: 200 },
      }),
    ).toEqual({ valid: true, issues: [] });
    expect(
      service.validateRecordedUpdate({
        ...base,
        attributes: { ...previous, mileage: "invalid" },
      }).issues,
    ).toContainEqual(
      expect.objectContaining({
        attributeId: "mileage",
        code: "TAXONOMY_INVALID_ATTRIBUTE_TYPE",
      }),
    );
    expect(
      service.validateRecordedUpdate({
        ...base,
        attributes: { ...previous, injected: "new" },
      }).issues,
    ).toContainEqual(
      expect.objectContaining({
        attributeId: "injected",
        code: "TAXONOMY_UNKNOWN_ATTRIBUTE",
      }),
    );
    expect(service.findCategory("vehicles.cars")?.publishable).toBe(false);
  });

  it("revalidates a recorded model when its brand changes", () => {
    const previous = { brand: "renault", model: "clio" };
    const result = service.validateRecordedUpdate({
      categoryIdentity: "vehicles.cars.city_cars",
      listingTypeId: "vehicles.cars.city_cars.listing",
      marketContext: market("shongre.fr"),
      sellerType: "individual",
      locale: "fr-FR",
      previousAttributes: previous,
      attributes: { ...previous, brand: "peugeot" },
    });
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        attributeId: "model",
        code: "TAXONOMY_INVALID_OPTION_PARENT",
      }),
    );
  });

  it.each([
    ["shongre.fr", "/", "FR"],
    ["shongre.com", "/be", "BE"],
    ["shongre.com", "/ch", "CH"],
  ])(
    "lists market-enabled listing types for %s%s",
    (hostname, pathname, code) => {
      const listingTypes = service.listListingTypes(market(hostname, pathname));
      expect(listingTypes).toHaveLength(213);
      expect(
        listingTypes.every((listingType) =>
          listingType.marketAvailability.some(
            (availability) =>
              availability.marketCode === code &&
              availability.marketplaceEnabled,
          ),
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["shongre.fr", "/", "FR"],
    ["shongre.com", "/be", "BE"],
    ["shongre.com", "/ch", "CH"],
  ])(
    "resolves a v3 body alias in active market %s%s",
    (hostname, pathname, code) => {
      const result = service.resolve({
        marketContext: market(hostname, pathname),
        categoryIdentity: "vehicles.cars.suv",
        listingTypeId: "vehicles.cars.suv.listing",
        sellerType: "individual",
        locale: `fr-${code}`,
      });
      expect(result.category.id).toBe("vehicles.cars.suv");
      expect(result.marketCode).toBe(code);
      expect(result.attributes.length).toBeGreaterThan(0);
      expect(result.projections.cardFields.length).toBeGreaterThan(0);
    },
  );

  it("rejects coming-soon Senegal and unknown market contexts", () => {
    for (const context of [
      market("shongre.com", "/sn"),
      market("shongre.com", "/xx"),
    ]) {
      expect(() =>
        service.resolve({
          marketContext: context,
          categoryIdentity: "vehicles.cars.suv",
          listingTypeId: "vehicles.cars.suv.listing",
          sellerType: "individual",
          locale: "fr-FR",
        }),
      ).toThrowError(TaxonomyV1Error);
    }
  });

  it("rejects unknown payload keys and invalid options", () => {
    const base = {
      marketContext: market("shongre.fr"),
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      sellerType: "individual" as const,
      locale: "fr-FR",
    };
    const unknown = service.validate({
      ...base,
      attributes: { surprise: true },
    });
    expect(unknown.issues).toContainEqual(
      expect.objectContaining({ code: "TAXONOMY_UNKNOWN_ATTRIBUTE" }),
    );
    const invalidOption = service.validate({
      ...base,
      attributes: { body_type: "not_a_real_option" },
    });
    expect(invalidOption.issues).toContainEqual(
      expect.objectContaining({
        attributeId: "body_type",
        code: "TAXONOMY_INVALID_OPTION",
      }),
    );
  });

  it("rejects hidden values that are incompatible with current choices", () => {
    const validation = service.validate({
      marketContext: market("shongre.fr"),
      categoryIdentity: "real_estate.rentals.apartments",
      listingTypeId: "real_estate.rentals.apartments.listing",
      sellerType: "professional",
      locale: "fr-FR",
      attributes: { property_type: "house", floor: 4 },
    });
    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        attributeId: "floor",
        code: "TAXONOMY_ATTRIBUTE_NOT_APPLICABLE",
      }),
    );
  });

  it("filters private and professional-only attributes for individual sellers", () => {
    const individual = service.resolve({
      marketContext: market("shongre.fr"),
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      sellerType: "individual",
      locale: "fr-FR",
    });
    const professional = service.resolve({
      marketContext: market("shongre.fr"),
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      sellerType: "professional",
      locale: "fr-FR",
    });
    expect(
      individual.attributes.some(({ definition }) => definition.id === "siret"),
    ).toBe(false);
    expect(
      professional.attributes.some(
        ({ definition }) => definition.id === "siret",
      ),
    ).toBe(false);
    expect(
      individual.attributes.every(
        ({ definition }) => definition.privacy !== "G_INTERNAL",
      ),
    ).toBe(true);
  });

  it("bounds option lookup and returns cascade children", () => {
    expect(() =>
      service.lookupOptions({ optionSetId: "brand", limit: 201 }),
    ).toThrowError(TaxonomyV1Error);
    const page = service.lookupOptions({
      optionSetId: "brand",
      limit: 5,
    });
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.total).toBeGreaterThan(0);
  });
});
