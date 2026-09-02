import type { TaxonomyHeaderCategoryItem } from "@shongre/contracts";
import { CANONICAL_TAXONOMY_IDENTITIES } from "@shongre/contracts/taxonomy-catalog";

/**
 * Public-safe demo fallback for the admin-managed header projection.
 *
 * Keeping this outside components gives the demo adapter and the SSR shell one
 * source of truth. The adapter can still replace it with a persisted market
 * configuration after the user interacts with taxonomy navigation.
 */
export const DEFAULT_HEADER_CATEGORY_IDS = [
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

const rootIdentityById = new Map(
  CANONICAL_TAXONOMY_IDENTITIES.filter((item) => !item.parentId).map((item) => [
    item.id,
    item,
  ]),
);

export const DEFAULT_HEADER_CATEGORIES: readonly TaxonomyHeaderCategoryItem[] =
  DEFAULT_HEADER_CATEGORY_IDS.flatMap((categoryId, displayOrder) => {
    const category = rootIdentityById.get(categoryId);
    if (!category) return [];
    return [
      {
        categoryId: category.id,
        slug: category.slug,
        labels: category.labels,
        shortLabels: category.shortLabels ?? category.labels,
        iconName: category.iconName,
        isActive: true,
        displayOrder,
      },
    ];
  });
