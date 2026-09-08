import {
  taxonomyHeaderNavigationUpdateSchema,
  type TaxonomyHeaderNavigationConfiguration,
  type TaxonomyHeaderNavigationUpdate,
} from "@shongre/contracts/taxonomy";
import type { TaxonomyV1PrivateBundle } from "../../src/modules/taxonomy/taxonomy.bundle.js";
import type {
  ITaxonomyRepository,
  TaxonomyNode,
} from "../../src/infrastructure/database/repositories/taxonomy.repository.js";
import { createTaxonomyProjection } from "../../src/infrastructure/database/repositories/taxonomy.projection.js";

export function createTestTaxonomyRepository(
  bundle: TaxonomyV1PrivateBundle,
): ITaxonomyRepository {
  const projection = createTaxonomyProjection(bundle);
  const {
    categoriesById,
    categoryToHeaderItem,
    categoryToTaxonomyNode,
    canonicalCategoryId,
  } = projection;
  const DEFAULT_HEADER_CATEGORY_IDS = [
    "real_estate",
    "vehicles",
    "professional_equipment",
    "jobs",
    "fashion",
    "home_garden",
    "baby_family",
    "electronics",
    "leisure_culture",
    "education",
  ] as const;

  class TestTaxonomyRepository implements ITaxonomyRepository {
    private readonly headerNavigationByMarket = new Map<
      string,
      TaxonomyHeaderNavigationConfiguration
    >(
      ["FR", "BE", "CH"].map((marketCode) => [
        marketCode,
        {
          marketCode,
          revision: 1,
          updatedAt: "2026-08-01T08:00:00.000Z",
          links: [
            {
              target: "category_overview",
              labels: { "fr-FR": "Autres", "en-GB": "Other" },
              shortLabels: { "fr-FR": "Autres", "en-GB": "Other" },
              isActive: true,
              displayOrder: DEFAULT_HEADER_CATEGORY_IDS.length,
            },
            {
              target: "promotions",
              labels: { "fr-FR": "Promotions", "en-GB": "Deals" },
              shortLabels: { "fr-FR": "Promotions", "en-GB": "Deals" },
              isActive: true,
              displayOrder: DEFAULT_HEADER_CATEGORY_IDS.length + 1,
            },
          ],
          items: DEFAULT_HEADER_CATEGORY_IDS.flatMap(
            (categoryId, displayOrder) => {
              const category = categoriesById.get(categoryId);
              return category
                ? [categoryToHeaderItem(category, true, displayOrder)]
                : [];
            },
          ),
        },
      ]),
    );

    async getNodeById(id: string): Promise<TaxonomyNode | null> {
      const category = categoriesById.get(canonicalCategoryId(id));
      return category ? categoryToTaxonomyNode(category) : null;
    }

    async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
      return this.getNodeById(slug);
    }

    async getHeaderNavigation(
      marketCode: string,
      includeInactive: boolean,
    ): Promise<TaxonomyHeaderNavigationConfiguration> {
      const stored = this.headerNavigationByMarket.get(marketCode) ?? {
        marketCode,
        revision: 0,
        updatedAt: null,
        items: [],
      };
      const items = stored.items.filter((item) => {
        if (includeInactive) return true;
        const category = categoriesById.get(item.categoryId);
        const availability = category?.marketAvailability.find(
          (entry) => entry.marketCode === marketCode,
        );
        return (
          item.isActive &&
          category?.status === "active" &&
          availability?.marketplaceEnabled === true
        );
      });
      const links = (stored.links ?? []).filter(
        (link) => includeInactive || link.isActive,
      );
      return structuredClone({ ...stored, items, links });
    }

    async replaceHeaderNavigation(
      input: TaxonomyHeaderNavigationUpdate,
    ): Promise<number> {
      const current = this.headerNavigationByMarket.get(input.marketCode);
      if ((current?.revision ?? 0) !== input.expectedRevision) {
        throw new Error("Taxonomy header configuration revision conflict.");
      }
      input.items.forEach((item) => {
        const category = categoriesById.get(item.categoryId);
        const availability = category?.marketAvailability.find(
          (entry) => entry.marketCode === input.marketCode,
        );
        if (!category || category.parentId) {
          throw new Error(
            "Only existing root taxonomy categories may appear in the header.",
          );
        }
        if (
          item.isActive &&
          (category.status !== "active" || !availability?.marketplaceEnabled)
        ) {
          throw new Error(
            "Active header categories must be enabled in the selected market.",
          );
        }
      });
      const revision = input.expectedRevision + 1;
      const links = input.links ?? current?.links ?? [];
      taxonomyHeaderNavigationUpdateSchema.parse({ ...input, links });
      const items = input.items.flatMap((item) => {
        const category = categoriesById.get(item.categoryId);
        return category
          ? [categoryToHeaderItem(category, item.isActive, item.displayOrder)]
          : [];
      });
      this.headerNavigationByMarket.set(input.marketCode, {
        marketCode: input.marketCode,
        revision,
        updatedAt: new Date().toISOString(),
        items,
        links: structuredClone(links),
      });
      return revision;
    }
  }

  return new TestTaxonomyRepository();
}
