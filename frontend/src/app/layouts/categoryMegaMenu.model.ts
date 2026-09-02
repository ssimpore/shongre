import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";

export type TaxonomyNodeAvailability = (node: TaxonomyNode) => boolean;

export interface CategoryNavigationRootReference {
  id: string;
  slug: string;
}

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
  rootReference: string | CategoryNavigationRootReference,
  isAvailable: TaxonomyNodeAvailability,
): Promise<TaxonomyNode | null> {
  const root =
    typeof rootReference === "string"
      ? await taxonomy.getNodeBySlug(rootReference)
      : ((await taxonomy.getNodeById(rootReference.id)) ??
        (await taxonomy.getNodeBySlug(rootReference.slug)));
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
  excludedRootIds: ReadonlySet<string>,
  isAvailable: TaxonomyNodeAvailability,
): Promise<TaxonomyNode[]> {
  const roots = await taxonomy.getRootCategories();
  const rootSlugsById = new Map<string, string>();
  roots.forEach((root) => {
    if (!excludedRootIds.has(root.id) && !rootSlugsById.has(root.id)) {
      rootSlugsById.set(root.id, root.slug);
    }
  });
  const branches = await Promise.all(
    [...rootSlugsById.values()].map((slug) =>
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
