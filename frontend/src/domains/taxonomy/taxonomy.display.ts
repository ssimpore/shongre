import type { Listing } from "../../types";

/** The HTTP adapter supplies the published, localized label. */
export function getListingSubCategoryLabel(
  listing: Pick<Listing, "subCategoryLabel">,
): string {
  return listing.subCategoryLabel;
}
