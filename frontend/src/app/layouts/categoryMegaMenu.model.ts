import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import type { TaxonomyNavigationNode as TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import type { MarketContext, TaxonomyV1Node } from "@shongre/contracts";

export type TaxonomyNodeAvailability = (node: TaxonomyNode) => boolean;

export interface CategoryNavigationRootReference {
  id: string;
  slug: string;
}

const byTaxonomyOrder = (left: TaxonomyNode, right: TaxonomyNode) =>
  left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);

const toNavigationNode = (node: TaxonomyV1Node): TaxonomyNode => ({
  id: node.id,
  code: node.sourceKey,
  slug: node.slug,
  parentId: node.parentId,
  level:
    node.level === 0 ? "category" : node.level === 1 ? "subcategory" : "type",
  publishable: node.publishable,
  labels: node.labels,
  shortLabels: node.shortLabels,
  name: node.labels["fr-FR"] ?? Object.values(node.labels)[0] ?? node.slug,
  description: node.description,
  iconName: node.iconName,
  sortOrder: node.sortOrder,
  status: node.status,
});

/**
 * Projects the canonical flat tree into the header's nested menu. The API returns the complete market tree in one
 * request, so opening a menu never fans out into one request per node.
 */
export function buildCategoryNavigationTree(
  items: readonly TaxonomyV1Node[],
  isAvailable: TaxonomyNodeAvailability,
): TaxonomyNode[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const childrenByParentId = new Map<string, TaxonomyV1Node[]>();
  items.forEach((item) => {
    if (!item.parentId || !itemsById.has(item.parentId)) return;
    const children = childrenByParentId.get(item.parentId) ?? [];
    children.push(item);
    childrenByParentId.set(item.parentId, children);
  });

  const buildNode = (
    item: TaxonomyV1Node,
    ancestors: ReadonlySet<string>,
  ): TaxonomyNode | null => {
    const node = toNavigationNode(item);
    if (!isAvailable(node) || ancestors.has(node.id)) return null;

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(node.id);
    const children = (childrenByParentId.get(node.id) ?? [])
      .map((child) => buildNode(child, nextAncestors))
      .filter((child): child is TaxonomyNode => child !== null)
      .sort(byTaxonomyOrder);
    return { ...node, children };
  };

  return items
    .filter((item) => !item.parentId)
    .map((item) => buildNode(item, new Set()))
    .filter((node): node is TaxonomyNode => node !== null)
    .sort(byTaxonomyOrder);
}

export async function loadCategoryNavigationTree(
  taxonomy: TaxonomyServiceContract,
  marketContext: MarketContext,
  locale: string,
  isAvailable: TaxonomyNodeAvailability,
): Promise<TaxonomyNode[]> {
  const response = await taxonomy.getV1Tree({
    marketContext,
    locale,
    taxonomyVersion: "v1",
  });
  return buildCategoryNavigationTree(response.items, isAvailable);
}

export function findCategoryNavigationBranch(
  roots: readonly TaxonomyNode[],
  rootReference: string | CategoryNavigationRootReference,
): TaxonomyNode | null {
  if (typeof rootReference === "string") {
    return roots.find((root) => root.slug === rootReference) ?? null;
  }
  return (
    roots.find((root) => root.id === rootReference.id) ??
    roots.find((root) => root.slug === rootReference.slug) ??
    null
  );
}

export function filterCategoryNavigationOverview(
  roots: readonly TaxonomyNode[],
  excludedRootIds: ReadonlySet<string>,
): TaxonomyNode[] {
  return roots
    .filter((root) => !excludedRootIds.has(root.id))
    .sort(byTaxonomyOrder);
}

export function hasCategoryMenuContent(
  node: TaxonomyNode | null | undefined,
): node is TaxonomyNode {
  return Boolean(node);
}
