import type { TaxonomyV1Node } from "@shongre/contracts";

export interface TaxonomyTreeAlias {
  readonly alias: string;
  readonly canonicalCategoryId: string;
}

export interface TaxonomyTreeProjection {
  /** Node id, slug or published alias the caller wants, if it wants only one. */
  readonly category?: string | null;
  /** Deepest level to keep, where 0 is the root categories on their own. */
  readonly maxLevel?: number;
}

/**
 * Narrows a published tree to what a caller actually reads.
 *
 * The unprojected snapshot is 735 KiB, and its three highest-traffic consumers
 * read a fraction of it: the search page resolves a single node for its SEO
 * policy, and the homepage universe rails read the labels of the root
 * categories. Both used to download every category, every listing type and
 * every SEO projection to do it, on the two busiest routes in the product.
 *
 * Projecting server-side rather than in each caller keeps one definition of
 * "this route's node" — the alias table is only available here — and lets the
 * response body shrink instead of being parsed and discarded by the browser.
 */
export function projectTaxonomyTreeItems(
  items: readonly TaxonomyV1Node[],
  aliases: readonly TaxonomyTreeAlias[],
  projection: TaxonomyTreeProjection,
): TaxonomyV1Node[] {
  const byLevel =
    projection.maxLevel === undefined
      ? [...items]
      : items.filter((node) => node.level <= projection.maxLevel!);
  const category = projection.category?.trim();
  if (!category) return byLevel;

  const requested = category.toLocaleLowerCase("fr-FR");
  const canonicalId = aliases.find(
    (row) => row.alias.toLocaleLowerCase("fr-FR") === requested,
  )?.canonicalCategoryId;
  const node = byLevel.find(
    (row) =>
      row.id === category || row.slug === category || row.id === canonicalId,
  );
  // An unresolvable category is not an error: the route is public and reachable
  // with any slug. Answering with an empty projection keeps the caller on the
  // small payload instead of silently restoring the full snapshot.
  return node ? [node] : [];
}
