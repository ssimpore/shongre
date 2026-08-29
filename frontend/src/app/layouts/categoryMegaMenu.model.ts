import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";

export type TaxonomyNodeAvailability = (node: TaxonomyNode) => boolean;

const byTaxonomyOrder = (left: TaxonomyNode, right: TaxonomyNode) =>
  left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);

async function loadNodeBranch(
  taxonomy: TaxonomyServiceContract,
  node: TaxonomyNode,
  isAvailable: TaxonomyNodeAvailability,
  ancestors: ReadonlySet<string>,
): Promise<TaxonomyNode | null> {
  if (!isAvailable(node) || ancestors.has(node.id)) return null;

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(node.id);
  const children = await taxonomy.getChildren(node.id);
  const availableChildren = (
    await Promise.all(
      children.map((child) =>
        loadNodeBranch(taxonomy, child, isAvailable, nextAncestors),
      ),
    )
  )
    .filter((child): child is TaxonomyNode => child !== null)
    .sort(byTaxonomyOrder);

  return { ...node, children: availableChildren };
}

/**
 * Loads one complete navigation branch through the public taxonomy contract.
 *
 * The recursive projection deliberately makes no assumption about taxonomy
 * depth. Availability is injected so the caller can use the active market's
 * canonical policy without teaching this hierarchy helper about market state.
 */
export async function loadCategoryNavigationBranch(
  taxonomy: TaxonomyServiceContract,
  rootSlug: string,
  isAvailable: TaxonomyNodeAvailability,
): Promise<TaxonomyNode | null> {
  const root = await taxonomy.getNodeBySlug(rootSlug);
  if (!root) return null;

  return loadNodeBranch(taxonomy, root, isAvailable, new Set());
}

/**
 * Loads the taxonomy roots not already promoted into the primary header row.
 * This keeps the "Autres" panel derived from the same authoritative taxonomy
 * instead of introducing another manually maintained category catalogue.
 */
export async function loadCategoryNavigationOverview(
  taxonomy: TaxonomyServiceContract,
  excludedRootSlugs: ReadonlySet<string>,
  isAvailable: TaxonomyNodeAvailability,
): Promise<TaxonomyNode[]> {
  const roots = await taxonomy.getRootCategories();
  const slugs = [
    ...new Set(
      roots
        .map((root) => root.slug)
        .filter((slug) => !excludedRootSlugs.has(slug)),
    ),
  ];
  const branches = await Promise.all(
    slugs.map((slug) =>
      loadCategoryNavigationBranch(taxonomy, slug, isAvailable),
    ),
  );
  return branches
    .filter((branch): branch is TaxonomyNode => branch !== null)
    .sort(byTaxonomyOrder);
}

export function hasCategoryMenuContent(
  node: TaxonomyNode | null | undefined,
): node is TaxonomyNode {
  return Boolean(node);
}
