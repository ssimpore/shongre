import { getTaxonomyV4CardRootLabel } from "@shongre/contracts/taxonomy-v4-card";
import type { Listing } from "../../types";

/** Universe-level category label used by compact listing presentations. */
export function getListingCategoryLabel(
  listing: Pick<Listing, "categorySlug" | "categoryLabel">,
  locale = "fr-FR",
): string {
  return (
    getTaxonomyV4CardRootLabel(listing.categorySlug, locale) ||
    listing.categoryLabel.trim()
  );
}
