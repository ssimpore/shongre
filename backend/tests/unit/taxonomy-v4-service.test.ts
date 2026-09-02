import { resolveMarketContext } from "@shongre/contracts";
import { describe, expect, it } from "vitest";
import {
  TaxonomyV4Error,
  TaxonomyV4Service,
} from "../../src/modules/taxonomy/taxonomy.v4.service.js";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

function market(hostname: string, pathname = "/") {
  return resolveMarketContext({ hostname, pathname, infrastructure });
}

describe("TaxonomyV4Service", () => {
  const service = new TaxonomyV4Service();

  it.each([
    ["shongre.fr", "/", "FR"],
    ["shongre.com", "/be", "BE"],
    ["shongre.com", "/ch", "CH"],
  ])(
    "lists market-enabled listing types for %s%s",
    (hostname, pathname, code) => {
      const listingTypes = service.listListingTypes(market(hostname, pathname));
      expect(listingTypes).toHaveLength(212);
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
      ).toThrowError(TaxonomyV4Error);
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
    ).toBe(true);
    expect(
      individual.attributes.every(
        ({ definition }) => definition.privacy !== "G_INTERNAL",
      ),
    ).toBe(true);
  });

  it("bounds option lookup and returns cascade children", () => {
    expect(() =>
      service.lookupOptions({ optionSetId: "brand", limit: 201 }),
    ).toThrowError(TaxonomyV4Error);
    const page = service.lookupOptions({
      optionSetId: "brand",
      limit: 5,
    });
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.total).toBeGreaterThan(0);
  });
});
