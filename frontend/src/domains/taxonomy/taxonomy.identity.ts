import {
  CANONICAL_TAXONOMY_ALIASES,
  CANONICAL_TAXONOMY_IDENTITIES,
  CANONICAL_TAXONOMY_IDENTITY_BY_ID,
  type CanonicalTaxonomyIdentity,
} from "@shongre/contracts/taxonomy-catalog";

export function normalizeTaxonomyIdentityLookup(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Preserve malformed historical values for the unresolved report.
  }
  return decoded
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/^\/+|\/+$/g, "");
}

export function resolveCanonicalTaxonomyIdentity(
  value?: string,
): CanonicalTaxonomyIdentity | undefined {
  if (!value) return undefined;
  const lookup = normalizeTaxonomyIdentityLookup(value);
  const direct = CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(lookup);
  if (direct) return direct;
  const bySlug = CANONICAL_TAXONOMY_IDENTITIES.find(
    (identity) => identity.slug === lookup,
  );
  if (bySlug) return bySlug;
  const mappedId = CANONICAL_TAXONOMY_ALIASES[lookup];
  return mappedId ? CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(mappedId) : undefined;
}

export function normalizeListingTaxonomyIdentity(listing: {
  categorySlug?: string;
  subCategorySlug?: string;
  categoryLabel?: string;
  subCategoryLabel?: string;
}) {
  const identity =
    resolveCanonicalTaxonomyIdentity(listing.subCategorySlug) ||
    resolveCanonicalTaxonomyIdentity(listing.categorySlug);
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

  let root = identity;
  while (root.parentId) {
    root = CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(root.parentId) || root;
    if (!root.parentId) break;
  }

  return {
    categoryId: identity.id,
    categorySlug: root.slug,
    categoryLabel: root.shortLabels?.["fr-FR"] || root.labels["fr-FR"],
    subCategorySlug: identity.slug,
    subCategoryLabel:
      identity.shortLabels?.["fr-FR"] || identity.labels["fr-FR"],
  };
}
