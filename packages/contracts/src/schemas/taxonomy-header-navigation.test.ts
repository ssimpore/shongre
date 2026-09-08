import { describe, expect, it } from "vitest";
import {
  taxonomyHeaderNavigationConfigurationSchema,
  taxonomyHeaderNavigationUpdateSchema,
} from "./taxonomy";

const items = [
  { categoryId: "vehicles", isActive: true, displayOrder: 0 },
  { categoryId: "real_estate", isActive: false, displayOrder: 1 },
];

const promotionLink = {
  target: "promotions",
  labels: { "fr-FR": "Promotions", "en-GB": "Deals" },
  shortLabels: { "fr-FR": "Promotions", "en-GB": "Deals" },
  isActive: true,
  displayOrder: 2,
};

describe("taxonomy header navigation contracts", () => {
  it("accepts localized backend-managed links in the category ordering", () => {
    const update = taxonomyHeaderNavigationUpdateSchema.parse({
      marketCode: "FR",
      expectedRevision: 1,
      changeReason: "Activer les offres dans la navigation publiée.",
      items,
      links: [promotionLink],
    });
    expect(update.links).toEqual([promotionLink]);
  });

  it.each([
    [{ ...promotionLink, target: "external_url" }],
    [{ ...promotionLink, labels: { "en-GB": "Deals" } }],
    [{ ...promotionLink, displayOrder: 0 }],
    [promotionLink, { ...promotionLink, displayOrder: 3 }],
  ])("rejects unsupported or conflicting navigation links (%#)", (...links) => {
    expect(
      taxonomyHeaderNavigationUpdateSchema.safeParse({
        marketCode: "FR",
        expectedRevision: 1,
        changeReason: "Vérification des contraintes de navigation.",
        items,
        links,
      }).success,
    ).toBe(false);
  });

  it("accepts an ordered, revisioned, market-scoped update", () => {
    expect(
      taxonomyHeaderNavigationUpdateSchema.parse({
        marketCode: "BE",
        expectedRevision: 4,
        changeReason: "Réorganisation éditoriale pour le marché belge.",
        items,
      }),
    ).toMatchObject({ marketCode: "BE", expectedRevision: 4, items });
  });

  it("rejects duplicate category selections and display positions", () => {
    const duplicate = taxonomyHeaderNavigationUpdateSchema.safeParse({
      marketCode: "FR",
      expectedRevision: 1,
      changeReason: "Configuration volontairement invalide.",
      items: [
        { categoryId: "vehicles", isActive: true, displayOrder: 0 },
        { categoryId: "vehicles", isActive: false, displayOrder: 0 },
      ],
    });

    expect(duplicate.success).toBe(false);
    if (!duplicate.success) {
      expect(
        duplicate.error.issues.map((issue) => issue.path.join(".")),
      ).toEqual(
        expect.arrayContaining(["items.1.categoryId", "items.1.displayOrder"]),
      );
    }
  });

  it("keeps inactive entries in the admin response projection", () => {
    const configuration = taxonomyHeaderNavigationConfigurationSchema.parse({
      marketCode: "CH",
      revision: 2,
      updatedAt: "2026-08-29T10:00:00.000Z",
      items: [
        {
          categoryId: "real_estate",
          slug: "immobilier",
          labels: { "fr-FR": "Immobilier" },
          shortLabels: { "fr-FR": "Immobilier" },
          iconName: "building",
          isActive: false,
          displayOrder: 0,
        },
      ],
    });

    expect(configuration.items[0]?.isActive).toBe(false);
  });
});
