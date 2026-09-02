import { describe, expect, it } from "vitest";
import {
  resolveMarketContext,
  TaxonomyV4PublicResolver,
  type TaxonomyV4TreeResponse,
} from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import {
  buildListingOnboardingModel,
  groupTaxonomyPublicationFields,
  restoreTaxonomyPath,
  searchListingOnboardingCategories,
  selectTaxonomyPathNode,
} from "./publication.onboarding";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};
const market = (hostname: string, pathname = "/") =>
  resolveMarketContext({ hostname, pathname, infrastructure });
const resolver = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle());

describe("listing onboarding taxonomy controller", () => {
  it.each([
    ["shongre.fr", "/", "FR"],
    ["shongre.com", "/be", "BE"],
    ["shongre.com", "/ch", "CH"],
  ])("builds only the %s%s market projection", (hostname, pathname, code) => {
    const tree = resolver.tree(market(hostname, pathname), `fr-${code}`);
    const model = buildListingOnboardingModel({
      tree,
      intent: "SELL",
      sellerType: "individual",
    });
    expect(tree.marketCode).toBe(code);
    expect(model.levels[0]?.items.length).toBeGreaterThan(0);
    expect(
      model.eligibleListingTypes.every((type) => type.intent === "SELL"),
    ).toBe(true);
  });

  it("walks a variable-depth hierarchy without auto-selecting descendants", () => {
    const canonical = resolver.tree(market("shongre.fr"), "fr-FR");
    const categories = canonical.items.filter((item) =>
      [
        "electronics",
        "electronics.computers",
        "electronics.computers.laptops",
      ].includes(item.id),
    );
    const deepTree: TaxonomyV4TreeResponse = {
      ...canonical,
      items: categories,
      listingTypes: canonical.listingTypes.filter(
        (type) => type.categoryId === "electronics.computers.laptops",
      ),
    };
    const root = buildListingOnboardingModel({
      tree: deepTree,
      intent: "SELL",
      sellerType: "individual",
    });
    expect(root.levels).toHaveLength(1);
    expect(root.isComplete).toBe(false);
    const rootPath = selectTaxonomyPathNode({
      model: root,
      depth: 0,
      nodeId: "electronics",
    });
    const middle = buildListingOnboardingModel({
      tree: deepTree,
      intent: "SELL",
      sellerType: "individual",
      selectedPath: rootPath,
    });
    expect(middle.levels).toHaveLength(2);
    expect(middle.isComplete).toBe(false);
    const complete = buildListingOnboardingModel({
      tree: deepTree,
      intent: "SELL",
      sellerType: "individual",
      selectedPath: [
        "electronics",
        "electronics.computers",
        "electronics.computers.laptops",
      ],
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.selectedListingType?.id).toBe(
      "electronics.computers.laptops.listing",
    );

    const shallowTree: TaxonomyV4TreeResponse = {
      ...canonical,
      items: [{ ...categories[0], publishable: true }],
      listingTypes: canonical.listingTypes
        .filter((type) => type.categoryId === "electronics.computers.laptops")
        .map((type) => ({ ...type, categoryId: "electronics" })),
    };
    expect(
      buildListingOnboardingModel({
        tree: shallowTree,
        intent: "SELL",
        sellerType: "individual",
        selectedPath: ["electronics"],
      }).isComplete,
    ).toBe(true);
  });

  it("recomputes descendants when a parent changes and restores canonical paths", () => {
    const tree = resolver.tree(market("shongre.fr"), "fr-FR");
    const current = buildListingOnboardingModel({
      tree,
      intent: "SELL",
      sellerType: "individual",
      selectedCategoryId: "electronics.computers.laptops",
    });
    expect(current.path.map((item) => item.id)).toEqual([
      "electronics",
      "electronics.computers",
      "electronics.computers.laptops",
    ]);
    const switchedPath = selectTaxonomyPathNode({
      model: current,
      depth: 0,
      nodeId: "home_garden",
    });
    expect(switchedPath).toEqual(["home_garden"]);
    expect(
      restoreTaxonomyPath(tree.items, "home_garden.furniture.sofas"),
    ).toEqual([
      "home_garden",
      "home_garden.furniture",
      "home_garden.furniture.sofas",
    ]);
  });

  it("filters listing types for individual and professional accounts", () => {
    const tree = resolver.tree(market("shongre.fr"), "fr-FR");
    const individual = buildListingOnboardingModel({
      tree,
      intent: "JOB_OFFER",
      sellerType: "individual",
    });
    const professional = buildListingOnboardingModel({
      tree,
      intent: "JOB_OFFER",
      sellerType: "professional",
    });
    expect(individual.eligibleListingTypes).toHaveLength(0);
    expect(professional.eligibleListingTypes.length).toBeGreaterThan(0);
    expect(
      professional.levels[0]?.items.some((item) => item.id === "jobs"),
    ).toBe(true);
  });

  it("searches only eligible publishable leaves and groups fields by FLOW_TEMPLATE projection", () => {
    const tree = resolver.tree(market("shongre.fr"), "fr-FR");
    const model = buildListingOnboardingModel({
      tree,
      intent: "SELL",
      sellerType: "individual",
    });
    const results = searchListingOnboardingCategories({
      tree,
      model,
      query: "portable",
      locale: "fr-FR",
    });
    expect(
      results.some((item) => item.id === "electronics.computers.laptops"),
    ).toBe(true);
    expect(results.every((item) => item.publishable)).toBe(true);

    const schema = resolver.resolve({
      marketContext: market("shongre.fr"),
      categoryIdentity: "electronics.computers.laptops",
      listingTypeId: "electronics.computers.laptops.listing",
      sellerType: "individual",
      locale: "fr-FR",
    });
    const groups = groupTaxonomyPublicationFields({ schema, locale: "fr-FR" });
    expect(groups.some((group) => group.id === "grp.electronics_specs")).toBe(
      true,
    );
    expect(groups.every((group) => group.label.length > 0)).toBe(true);
  });

  it("uses compiled listing-type overrides without rebuilding ADD bindings", () => {
    const schema = resolver.resolve({
      marketContext: market("shongre.fr"),
      categoryIdentity: "vehicles.nautical.motorboats",
      listingTypeId: "vehicles.nautical.motorboats.listing",
      sellerType: "individual",
      locale: "fr-FR",
    });
    const boatLength = schema.attributes.find(
      ({ definition }) => definition.id === "boat_length",
    );
    expect(boatLength?.binding.scope).toBe("LISTING_TYPE_OVERRIDE");
  });
});
