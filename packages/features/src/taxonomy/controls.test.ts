import { describe, expect, it } from "vitest";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import {
  resolveMarketContext,
  TaxonomyV4PublicResolver,
} from "@shongre/contracts";
import {
  resolveTaxonomyControl,
  resolveTaxonomyFieldState,
  TAXONOMY_CONTROL_REGISTRY,
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

describe("taxonomy v4 shared controls", () => {
  it("maps every compiler-accepted UI component", () => {
    const bundle = getTaxonomyV4PublicBundle();
    const components = new Set(
      bundle.attributes.map((attribute) => attribute.uiComponent),
    );
    expect(Object.keys(TAXONOMY_CONTROL_REGISTRY)).toHaveLength(50);
    expect(components.size).toBe(35);
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
    const schema = new TaxonomyV4PublicResolver(
      getTaxonomyV4PublicBundle(),
    ).resolve({
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
});
