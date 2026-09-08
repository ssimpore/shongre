import type {
  TaxonomyV1Node,
  TaxonomyV1PublicBundle,
} from "@shongre/contracts/taxonomy";
import type { TaxonomyV1TreeResponse } from "@shongre/contracts/taxonomy";

type TaxonomySeoProjection =
  TaxonomyV1PublicBundle["projections"]["seo"][number];

export interface TaxonomySeoRecord {
  node: TaxonomyV1Node;
  projection: TaxonomySeoProjection;
}

/** A request-scoped API snapshot keeps aliases, labels and indexing on one revision. */
export function resolveTaxonomySeoRecord(
  idOrSlug: string | null | undefined,
  tree?: TaxonomyV1TreeResponse,
): TaxonomySeoRecord | null {
  if (!idOrSlug || !tree) return null;
  const alias = tree.aliases?.find(
    (row) =>
      row.alias.toLocaleLowerCase("fr-FR") ===
      idOrSlug.toLocaleLowerCase("fr-FR"),
  );
  const node = tree.items.find(
    (row) =>
      row.id === idOrSlug ||
      row.slug === idOrSlug ||
      row.id === alias?.canonicalCategoryId,
  );
  if (!node) return null;
  const projection = tree.seo?.find((row) => row.categoryId === node.id);
  return projection ? { node, projection } : null;
}

export function resolveLocalizedTaxonomySeoText(
  values: Readonly<Record<string, string>>,
  locale: string | null | undefined = "fr-FR",
): string {
  const requestedLocale = (locale || "fr-FR").toLocaleLowerCase();
  const requestedLanguage = requestedLocale.split("-")[0];
  const entries = Object.entries(values).filter(([, value]) => value.trim());
  const exact = entries.find(
    ([candidate]) => candidate.toLocaleLowerCase() === requestedLocale,
  )?.[1];
  if (exact) return exact.trim();
  const sameLanguage = entries.find(
    ([candidate]) =>
      candidate.toLocaleLowerCase().split("-")[0] === requestedLanguage,
  )?.[1];
  if (sameLanguage) return sameLanguage.trim();
  return (
    values["fr-FR"]?.trim() ||
    values["en-US"]?.trim() ||
    entries[0]?.[1].trim() ||
    ""
  );
}

export function taxonomyNodeIsIndexableInMarket(
  node: TaxonomyV1Node,
  marketCode: string,
): boolean {
  const availability = node.marketAvailability.find(
    (candidate) => candidate.marketCode === marketCode.toLocaleUpperCase(),
  );
  return Boolean(
    node.status === "active" &&
    node.seo.indexable &&
    availability?.status === "active" &&
    availability.marketplaceEnabled &&
    availability.indexable,
  );
}

/** Ancestors are projected by the backend from the same publication as the listing. */
export function taxonomySlugsForListing(listing: {
  taxonomy?: { path: readonly { slug: string }[] };
}): string[] {
  return [...new Set(listing.taxonomy?.path.map((node) => node.slug) ?? [])];
}
