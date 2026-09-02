import type { Listing, RecentSearch } from "../../types";
import type { CanonicalTaxonomyIdentity } from "@shongre/contracts/taxonomy-catalog";
import { getTaxonomyLabel } from "./taxonomy.labels";
import type { TaxonomyNode } from "./taxonomy.types";
import { resolveCanonicalTaxonomyIdentity } from "./taxonomy.identity";

/**
 * Presentation-only taxonomy helpers.
 *
 * Canonical names remain available to search, URLs, SEO and administration.
 * Marketplace surfaces should use these helpers so a long canonical label is
 * never rendered where the taxonomy provides a shorter alias.
 */
export function getCompactTaxonomyLabel(
  node: TaxonomyNode | null | undefined,
  fallback = "",
): string {
  return getTaxonomyLabel(node, "compact") || fallback;
}

export function resolveTaxonomyNode(
  slugOrId?: string,
): CanonicalTaxonomyIdentity | undefined {
  return resolveCanonicalTaxonomyIdentity(slugOrId);
}

export function getCompactTaxonomyLabelBySlug(
  slugOrId: string | undefined,
  fallback = "",
): string {
  const identity = resolveTaxonomyNode(slugOrId);
  return (
    identity?.shortLabels?.["fr-FR"] || identity?.labels["fr-FR"] || fallback
  );
}

export function getListingCategoryLabel(
  listing: Pick<Listing, "categorySlug" | "categoryLabel">,
): string {
  return getCompactTaxonomyLabelBySlug(
    listing.categorySlug,
    listing.categoryLabel || "Autres",
  );
}

export function getListingSubCategoryLabel(
  listing: Pick<Listing, "subCategorySlug" | "subCategoryLabel">,
): string {
  return getCompactTaxonomyLabelBySlug(
    listing.subCategorySlug,
    listing.subCategoryLabel || "Autres",
  );
}

export function getRecentSearchTitle(
  item: Pick<RecentSearch, "title" | "query" | "categorySlug">,
): string {
  if (item.query?.trim()) return item.title;
  return getCompactTaxonomyLabelBySlug(item.categorySlug, item.title);
}
