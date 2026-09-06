import {
  isTaxonomyV4DescendantOf,
  resolveTaxonomyV4Identity,
  resolveTaxonomyV4Root,
} from "@shongre/contracts/taxonomy-v4-identity";

export {
  isTaxonomyV4DescendantOf,
  resolveTaxonomyV4Identity as resolveCanonicalTaxonomyIdentity,
};

export function normalizeListingTaxonomyIdentity(listing: {
  categorySlug?: string;
  subCategorySlug?: string;
  categoryLabel?: string;
  subCategoryLabel?: string;
}) {
  const identity =
    resolveTaxonomyV4Identity(listing.subCategorySlug) ||
    resolveTaxonomyV4Identity(listing.categorySlug);
  if (!identity) {
    return {
      categoryId:
        listing.subCategorySlug || listing.categorySlug || "unclassified",
      categorySlug: listing.categorySlug || "autres",
      categoryLabel: listing.categoryLabel || "Autres",
      subCategorySlug: listing.subCategorySlug || "non-classee",
      subCategoryLabel: listing.subCategoryLabel || "À reclasser",
    };
  }

  const root = resolveTaxonomyV4Root(identity.id) || identity;

  return {
    categoryId: identity.id,
    categorySlug: root.slug,
    categoryLabel: root.shortLabels?.["fr-FR"] || root.labels["fr-FR"],
    subCategorySlug: identity.slug,
    subCategoryLabel:
      identity.shortLabels?.["fr-FR"] || identity.labels["fr-FR"],
  };
}
