import { recordedTaxonomyResponses } from "@shongre/contracts/testing/taxonomy-responses";
import { describe, expect, it } from "vitest";
import { getTaxonomyV1PublicBundle } from "@shongre/contracts/testing/taxonomy";
import { resolveMarketContext } from "@shongre/contracts";
import {
  resolveTaxonomyControl,
  resolveTaxonomyFieldState,
  reconcileTaxonomyValues,
  TAXONOMY_CONTROL_REGISTRY,
  validateTaxonomyValues,
  buildTaxonomyOptionRequests,
  mergeTaxonomyOptionPages,
} from "./controls";

const marketContext = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});

describe("taxonomy v1 shared controls", () => {
  it("intersects independent parent responses while retaining alternatives and empty-parent constraints", () => {
    const schema = recordedTaxonomyResponses.resolve({
      marketContext,
      categoryIdentity: "vehicles.cars.city_cars",
      listingTypeId: "vehicles.cars.city_cars.listing",
      sellerType: "individual",
      locale: "fr-FR",
    });
    const request = buildTaxonomyOptionRequests(schema, {
      brand: "renault",
    }).find((row) => row.attributeId === "model")!;
    expect(request).toMatchObject({
      parentAttributeId: "brand",
      parentOptionId: "brand:renault",
    });
    const missing = buildTaxonomyOptionRequests(schema, {}).find(
      (row) => row.attributeId === "model",
    )!;
    expect(missing.parentOptionId).toBeUndefined();
    const options = recordedTaxonomyResponses.lookupOptions({
      optionSetId: "model",
      parentOptionId: "brand:renault",
    }).items;
    const selected = options[0];
    const unrelated = { ...selected, id: "model:other", key: "other" };
    const pages = [
      { request, items: [selected] },
      {
        request: { ...request, parentOptionId: "brand:alternative" },
        items: [unrelated],
      },
      {
        request: { ...request, parentAttributeId: "second_parent" },
        items: [selected],
      },
    ];
    const merged = mergeTaxonomyOptionPages(pages);
    expect(merged.model).toEqual([selected]);
    expect(
      mergeTaxonomyOptionPages([
        ...pages,
        {
          request: {
            ...request,
            parentAttributeId: "missing_parent",
            parentOptionId: undefined,
          },
          items: [],
        },
      ]).model,
    ).toEqual([]);
    expect(
      reconcileTaxonomyValues({
        schema,
        sellerType: "individual",
        values: { brand: "renault", model: selected.key },
        optionsByAttribute: merged,
      }).values.model,
    ).toBe(selected.key);
    expect(
      reconcileTaxonomyValues({
        schema,
        sellerType: "individual",
        values: { brand: "renault", model: unrelated.key },
        optionsByAttribute: merged,
      }).removed,
    ).toContainEqual({ attributeId: "model", reason: "invalid_option" });
    expect(
      buildTaxonomyOptionRequests(schema, {
        brand: ["renault", "volkswagen"],
      }).filter((row) => row.attributeId === "model"),
    ).toHaveLength(2);
  });
  it("maps every compiler-accepted UI component", () => {
    const bundle = getTaxonomyV1PublicBundle();
    const components = new Set(
      bundle.attributes.map((attribute) => attribute.uiComponent),
    );
    expect(Object.keys(TAXONOMY_CONTROL_REGISTRY)).toHaveLength(51);
    expect(components.size).toBeGreaterThan(0);
    expect(components.has("business_id_input")).toBe(false);
    expect(components.has("hidden")).toBe(false);
    expect(TAXONOMY_CONTROL_REGISTRY.hidden.kind).toBe("hidden");
    components.forEach((component) => {
      expect(TAXONOMY_CONTROL_REGISTRY[component]).toBeDefined();
      expect(
        resolveTaxonomyControl({ uiComponent: component }).kind,
      ).toBeTruthy();
    });
  });

  it("computes conditional visibility and required state deterministically", () => {
    const schema = recordedTaxonomyResponses.resolve({
      marketContext,
      categoryIdentity: "real_estate.rentals.apartments",
      listingTypeId: "real_estate.rentals.apartments.listing",
      sellerType: "professional",
      locale: "fr-FR",
    });
    expect(
      resolveTaxonomyFieldState({
        schema,
        attributeId: "floor",
        values: {},
        sellerType: "professional",
      }).visible,
    ).toBe(false);
    expect(
      resolveTaxonomyFieldState({
        schema,
        attributeId: "floor",
        values: { property_type: "apartment" },
        sellerType: "professional",
      }).visible,
    ).toBe(true);
    expect(
      resolveTaxonomyFieldState({
        schema,
        attributeId: "monthly_rent",
        values: { property_transaction: "long_term_rental" },
        sellerType: "professional",
      }).required,
    ).toBe(true);
  });

  it("preserves compatible values and removes hidden or invalid dependent values", () => {
    const schema = recordedTaxonomyResponses.resolve({
      marketContext,
      categoryIdentity: "real_estate.rentals.apartments",
      listingTypeId: "real_estate.rentals.apartments.listing",
      sellerType: "professional",
      locale: "fr-FR",
    });
    const result = reconcileTaxonomyValues({
      schema,
      sellerType: "professional",
      values: {
        property_type: "house",
        floor: 4,
        living_area: 62,
        stale_field: "never submit",
      },
    });
    expect(result.values.living_area).toBe(62);
    expect(result.values).not.toHaveProperty("floor");
    expect(result.values).not.toHaveProperty("stale_field");
    expect(result.removed).toEqual(
      expect.arrayContaining([
        { attributeId: "floor", reason: "hidden" },
        { attributeId: "stale_field", reason: "not_in_schema" },
      ]),
    );
  });

  it("clears a cascade value that is incompatible with the selected parent", () => {
    const resolver = recordedTaxonomyResponses;
    const schema = resolver.resolve({
      marketContext,
      categoryIdentity: "vehicles.cars.city_cars",
      listingTypeId: "vehicles.cars.city_cars.listing",
      sellerType: "individual",
      locale: "fr-FR",
    });
    const clio = resolver.lookupOptions({
      optionSetId: "model",
      parentOptionId: "brand:renault",
    }).items;
    const result = reconcileTaxonomyValues({
      schema,
      sellerType: "individual",
      values: { brand: "renault", model: "golf" },
      optionsByAttribute: { model: clio },
    });
    expect(result.values.brand).toBe("renault");
    expect(result.values).not.toHaveProperty("model");
    expect(result.removed).toContainEqual({
      attributeId: "model",
      reason: "invalid_option",
    });
  });

  it("validates required fields from bindings and dependency rules", () => {
    const schema = recordedTaxonomyResponses.resolve({
      marketContext,
      categoryIdentity: "real_estate.rentals.apartments",
      listingTypeId: "real_estate.rentals.apartments.listing",
      sellerType: "professional",
      locale: "fr-FR",
    });
    const issues = validateTaxonomyValues({
      schema,
      sellerType: "professional",
      values: { property_transaction: "long_term_rental" },
    });
    expect(issues).toContainEqual({
      attributeId: "monthly_rent",
      code: "required",
    });
  });
});
