/** What a search bar submission carries, independent of which bar produced it. */
export interface KeywordSearchCriteria {
  query: string;
  categorySlug?: string;
  subCategorySlug?: string;
  city?: string;
  radiusKm?: number;
}

/**
 * The URL a keyword submission should produce when the visitor is already
 * looking at results.
 *
 * `routes.search()` builds a fresh URL, which is right when the search starts
 * from the homepage or the header of an unrelated page. On a results route it
 * silently discards the sort, the condition facet, the price bounds and the
 * view the visitor had already chosen — so a keyword refinement cost them every
 * other refinement. This merges into the current parameters instead.
 *
 * Kept pure, and here beside `routes.ts` rather than in a feature folder,
 * because both the header search bar and the results page reason about the same
 * URL contract, and the interesting behaviour is entirely "which parameters
 * survive" — testable without a DOM.
 */
export function mergeKeywordSearchParams(
  current: URLSearchParams,
  criteria: KeywordSearchCriteria,
  context: { currentCategorySlug?: string; categoryRouteSlug?: string | null },
): { params: URLSearchParams; leaveCategoryRoute: boolean } {
  const params = new URLSearchParams(current);
  const put = (key: string, value: string | undefined) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  put("query", criteria.query.trim() || undefined);
  // One spelling wins in the URL the visitor ends up on. `q` is tolerated on the
  // way in because `seo-policy` builds a title from either spelling.
  params.delete("q");

  const nextCategory = criteria.categorySlug || undefined;
  const categoryChanged =
    nextCategory !== (context.currentCategorySlug || undefined);
  put("category", nextCategory);
  put("subCategory", criteria.subCategorySlug || undefined);
  // Attribute facets belong to the category that offered them.
  if (categoryChanged) {
    Array.from(params.keys()).forEach((key) => {
      if (key.startsWith("attr_")) params.delete(key);
    });
  }

  put("city", criteria.city || undefined);
  // A radius with no city filters nothing, and the search bar always carries the
  // location selector's default one. Writing it anyway put `radius=30` on the
  // URL of every keyword submit, where `seo-policy` reads any query parameter as
  // arbitrary state.
  put(
    "radius",
    criteria.city && criteria.radiusKm && criteria.radiusKm > 0
      ? String(criteria.radiusKm)
      : undefined,
  );

  params.delete("page");
  params.delete("cursor");

  // A category route owns its category in the path, so a different one has to
  // leave the route rather than contradict it from the query string.
  if (context.categoryRouteSlug && nextCategory !== context.categoryRouteSlug) {
    return { params, leaveCategoryRoute: true };
  }
  if (context.categoryRouteSlug) params.delete("category");
  return { params, leaveCategoryRoute: false };
}
