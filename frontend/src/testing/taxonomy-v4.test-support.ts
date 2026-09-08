import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import type { Category, SubCategory } from "../types";

const bundle = getTaxonomyV4PublicBundle();

const toSubCategory = (
  node: (typeof bundle.categories)[number],
  parentSlug: string,
): SubCategory => ({
  id: node.id,
  slug: node.slug,
  name: node.labels["fr-FR"],
  label: node.labels["fr-FR"],
  shortLabel: node.shortLabels["fr-FR"],
  parentSlug,
  iconName: node.iconName,
  attributesSchema: [],
});

/** Explicit generated import fixture for isolated unit tests; never a runtime fallback. */
export const taxonomyV4TestCategories: Category[] = bundle.categories
  .filter((node) => !node.parentId && node.status === "active")
  .sort((left, right) => left.sortOrder - right.sortOrder)
  .map((root) => ({
    id: root.id,
    slug: root.slug,
    name: root.labels["fr-FR"],
    label: root.labels["fr-FR"],
    shortLabel: root.shortLabels["fr-FR"],
    iconName: root.iconName,
    description: root.description ?? root.labels["fr-FR"],
    subCategories: bundle.categories
      .filter((node) => node.parentId === root.id && node.status === "active")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((node) => toSubCategory(node, root.slug)),
  }));
