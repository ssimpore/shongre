import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAXONOMY_V4_PRIVATE_BUNDLE as bundle } from "../../src/modules/taxonomy/generated/taxonomy-v4.private.js";

const report = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/architecture/generated/taxonomy-v4-import-report.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const unique = (values: readonly string[]) =>
  new Set(values).size === values.length;

describe("generated taxonomy v4 integrity", () => {
  it("matches every authored and normalized source count exactly", () => {
    expect(report.sourceCounts).toEqual({
      verticals: 18,
      categories: 276,
      listingTypes: 208,
      attributeGroups: 56,
      attributes: 323,
      optionRows: 732,
      compactBindings: 1194,
      resolvedBindings: 10751,
      dependencies: 122,
      validations: 505,
      filters: 242,
      sortOptions: 86,
      publicationFlow: 846,
      cardFields: 130,
      detailFields: 790,
      searchFields: 341,
      locationRules: 20,
      sellerRules: 47,
      privateVsPro: 20,
      countryRules: 108,
      regulatoryRules: 30,
      referenceData: 42,
    });
    expect(report.normalizedCounts).toMatchObject({
      verticals: 18,
      workbookCategories: 276,
      taxonomyNodes: 294,
      roots: 18,
      publishableLeaves: 208,
      listingTypes: 208,
      publicationFlows: 20,
      intents: 12,
      attributes: 323,
      attributeGroups: 56,
      optionSets: 105,
      options: 732,
      optionParentLinks: 75,
      compactBindings: 1194,
      bindings: 10751,
      dependencies: 203,
      sourceValidationRules: 505,
      regulatoryValidationRules: 30,
      validationRules: 535,
      filters: 2704,
      cardFields: 1402,
      detailFields: 10059,
      publicationFlow: 1612,
      searchProjections: 208,
      seoProjections: 294,
      aliases: 276,
      referenceData: 42,
    });
  });

  it("has no orphan, cycle, active identity, slug or sibling-order conflict", () => {
    const categoryIds = new Set(
      bundle.categories.map((category) => category.id),
    );
    const active = bundle.categories.filter(
      (category) => category.status === "active",
    );
    expect(unique(active.map((category) => category.id))).toBe(true);
    expect(unique(active.map((category) => category.sourceKey))).toBe(true);
    expect(unique(active.map((category) => category.slug))).toBe(true);
    const siblingOrders = new Map<string, number[]>();
    bundle.categories.forEach((category) => {
      if (category.parentId)
        expect(categoryIds.has(category.parentId)).toBe(true);
      const lineage = new Set<string>();
      let cursor = category;
      while (cursor.parentId) {
        expect(lineage.has(cursor.id)).toBe(false);
        lineage.add(cursor.id);
        cursor = bundle.categories.find(
          (candidate) => candidate.id === cursor.parentId,
        )!;
      }
      const key = category.parentId ?? "ROOT";
      siblingOrders.set(key, [
        ...(siblingOrders.get(key) ?? []),
        category.sortOrder,
      ]);
    });
    siblingOrders.forEach((orders) =>
      expect(unique(orders.map(String))).toBe(true),
    );
  });

  it("provides a concise localized French shortLabel for every category", () => {
    bundle.verticals.forEach((vertical) => {
      expect(vertical.shortLabels["fr-FR"], vertical.id).toBeTruthy();
    });
    const siblingShortLabels = new Set<string>();
    bundle.categories.forEach((category) => {
      const shortLabel = category.shortLabels["fr-FR"];
      expect(shortLabel, category.id).toBeTruthy();
      expect(shortLabel.length, category.id).toBeLessThanOrEqual(28);
      expect(shortLabel.length, category.id).toBeLessThanOrEqual(
        category.labels["fr-FR"].length,
      );
      const siblingKey = `${category.parentId ?? "ROOT"}:${shortLabel.toLocaleLowerCase("fr-FR")}`;
      expect(siblingShortLabels.has(siblingKey), siblingKey).toBe(false);
      siblingShortLabels.add(siblingKey);
    });
    expect(
      bundle.categories.find(
        (category) =>
          category.id === "energy_transition.heating_storage.heat_pumps",
      ),
    ).toMatchObject({
      labels: {
        "fr-FR": "Pompes à chaleur & chauffage performant",
      },
      shortLabels: { "fr-FR": "Pompes à chaleur" },
    });
  });

  it("resolves every listing type, binding, rule, projection and alias", () => {
    const categories = new Map(
      bundle.categories.map((item) => [item.id, item]),
    );
    const listingTypes = new Set(bundle.listingTypes.map((item) => item.id));
    const attributes = new Set(bundle.attributes.map((item) => item.id));
    const groups = new Set(bundle.attributeGroups.map((item) => item.id));
    const optionSets = new Set(bundle.optionSets.map((item) => item.id));
    const options = new Set(bundle.options.map((item) => item.id));

    bundle.listingTypes.forEach((listingType) => {
      const category = categories.get(listingType.categoryId);
      expect(category?.publishable).toBe(true);
      expect(category?.status).toBe("active");
    });
    bundle.attributes.forEach((attribute) => {
      expect(groups.has(attribute.groupId)).toBe(true);
      if (attribute.optionSetId)
        expect(optionSets.has(attribute.optionSetId)).toBe(true);
    });
    bundle.bindings.forEach((binding) => {
      expect(categories.has(binding.categoryId)).toBe(true);
      expect(listingTypes.has(binding.listingTypeId)).toBe(true);
      expect(attributes.has(binding.attributeId)).toBe(true);
      expect(groups.has(binding.groupId)).toBe(true);
    });
    bundle.optionParentLinks.forEach((link) => {
      expect(options.has(link.optionId)).toBe(true);
      expect(options.has(link.parentOptionId)).toBe(true);
    });
    for (const rule of [...bundle.dependencies, ...bundle.validationRules]) {
      const references =
        "targets" in rule ? [rule.trigger, ...rule.targets] : [rule.target];
      references.forEach((reference) => {
        if (reference.kind === "attribute")
          expect(attributes.has(reference.key)).toBe(true);
      });
    }
    for (const projection of [
      ...bundle.projections.filters,
      ...bundle.projections.cardFields,
      ...bundle.projections.detailFields,
      ...bundle.projections.publicationFlow,
    ]) {
      expect(categories.has(projection.categoryId)).toBe(true);
      expect(listingTypes.has(projection.listingTypeId)).toBe(true);
    }
    expect(bundle.projections.seo).toHaveLength(bundle.categories.length);
    expect(
      unique(bundle.projections.seo.map((projection) => projection.urlPattern)),
    ).toBe(true);
    bundle.projections.seo.forEach((projection) => {
      const category = categories.get(projection.categoryId)!;
      expect(projection.urlPattern).toBe(`/categorie/${category.slug}`);
      expect(projection.h1).toEqual(category.labels);
      Object.keys(category.labels).forEach((locale) => {
        expect(projection.titleTemplate[locale]).toBeTruthy();
        expect(projection.descriptionTemplate[locale]).toBeTruthy();
      });
    });
    bundle.aliases.forEach((alias) =>
      expect(categories.has(alias.canonicalCategoryId)).toBe(true),
    );
  });

  it("resolves flow templates without duplicate bindings and quarantines draft policy", () => {
    expect(report.templateResolution).toEqual({
      compactMappingRows: 1194,
      flowTemplateRows: 811,
      addOverrides: 375,
      excludeOverrides: 8,
      resolvedRelationships: 10751,
      duplicateEffectiveBindings: 0,
      sourceFilterRows: 242,
      canonicalFilterTemplates: 208,
      eliminatedDuplicateFilterTemplates: 34,
    });
    expect(report.quarantine.unknownMarketCodes).toEqual(["FUTURE"]);
    expect(report.quarantine.countryPolicyDraftIds).toHaveLength(108);
    expect(report.quarantine.disabledValidationRuleIds).toHaveLength(30);
    expect(report.quarantine.disabledSellerRuleIds).toHaveLength(47);
    expect(report.quarantine.unresolvedAttributeValues).toEqual([]);
  });
});
