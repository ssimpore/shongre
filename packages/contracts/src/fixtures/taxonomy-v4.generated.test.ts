import { describe, expect, it } from "vitest";
import { taxonomyV4PublicBundleSchema } from "../schemas/taxonomy";
import rawBundle from "./generated/taxonomy-v4.public.json?raw";

const bundle = taxonomyV4PublicBundleSchema.parse(JSON.parse(rawBundle));

describe("generated taxonomy v4 public projection", () => {
  it("matches the normalized source coverage", () => {
    expect(bundle.metadata.sourceCounts).toEqual({
      categories: 294,
      listingTypes: 208,
      attributes: 323,
      bindings: 10_751,
    });
    expect(bundle.categories).toHaveLength(294);
    expect(
      bundle.categories.filter((category) => !category.parentId),
    ).toHaveLength(18);
    expect(
      bundle.categories.filter((category) => category.publishable),
    ).toHaveLength(208);
    expect(bundle.listingTypes).toHaveLength(208);
    expect(bundle.attributes).toHaveLength(317);
    expect(bundle.attributeGroups).toHaveLength(56);
    expect(
      bundle.attributeGroups.some((group) => group.id === "G_INTERNAL"),
    ).toBe(false);
    expect(bundle.optionSets).toHaveLength(104);
    expect(bundle.options).toHaveLength(725);
    expect(bundle.optionParentLinks).toHaveLength(75);
    expect(bundle.bindings).toHaveLength(10_751);
    expect(bundle.dependencyRules).toHaveLength(203);
    expect(bundle.validationRules).toHaveLength(499);
    expect(bundle.projections.filters).toHaveLength(2_704);
    expect(bundle.projections.cardFields).toHaveLength(1_402);
    expect(bundle.projections.detailFields).toHaveLength(10_059);
    expect(bundle.projections.publicationFlow).toHaveLength(1_612);
    expect(bundle.projections.search).toHaveLength(208);
    expect(bundle.projections.seo).toHaveLength(294);
    expect(
      bundle.attributes.some(
        (attribute) => attribute.id === "moderation_risk_level",
      ),
    ).toBe(false);
  });

  it("normalizes option identities and explicit parent links", () => {
    expect(new Set(bundle.options.map((option) => option.id)).size).toBe(
      bundle.options.length,
    );
    const optionIds = new Set(bundle.options.map((option) => option.id));
    bundle.optionParentLinks.forEach((link) => {
      expect(optionIds.has(link.optionId), link.optionId).toBe(true);
      expect(optionIds.has(link.parentOptionId), link.parentOptionId).toBe(
        true,
      );
    });
  });

  it("retains every market explicitly without activating coming-soon markets", () => {
    bundle.categories.forEach((category) => {
      expect(
        category.marketAvailability.map((entry) => entry.marketCode),
      ).toEqual(["FR", "BE", "CH", "SN", "BF"]);
      for (const market of category.marketAvailability) {
        if (market.marketCode === "SN" || market.marketCode === "BF") {
          expect(market.status).toBe("coming_soon");
          expect(market.marketplaceEnabled).toBe(false);
          expect(market.indexable).toBe(false);
        }
      }
    });
  });

  it("uses the master workbook category namespace", () => {
    expect(bundle.aliases.some((alias) => alias.alias === "bons-plans")).toBe(
      false,
    );
    expect(
      bundle.categories.find(
        (category) =>
          category.slug === "brocantes-marches-and-evenements-locaux",
      )?.id,
    ).toBe("events_tickets.events.local_events");
  });
});
