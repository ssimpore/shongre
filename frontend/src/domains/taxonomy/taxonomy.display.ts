import type { Listing, RecentSearch } from "../../types";
import { getTaxonomyLabel } from "./taxonomy.labels";
import { TaxonomyMigration } from "./taxonomy.migration";
import type { TaxonomyNode } from "./taxonomy.types";

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
): TaxonomyNode | undefined {
  return TaxonomyMigration.resolveCanonicalNode(slugOrId);
}

export function getCompactTaxonomyLabelBySlug(
  slugOrId: string | undefined,
  fallback = "",
): string {
  return getCompactTaxonomyLabel(resolveTaxonomyNode(slugOrId), fallback);
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
