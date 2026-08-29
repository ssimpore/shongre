import type {
  TaxonomyV4Node,
  TaxonomyV4PublicBundle,
} from "@shongre/contracts/taxonomy";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";

export type TaxonomySeoProjection =
  TaxonomyV4PublicBundle["projections"]["seo"][number];

export interface TaxonomySeoRecord {
  node: TaxonomyV4Node;
  projection: TaxonomySeoProjection;
}

const bundle = getTaxonomyV4PublicBundle();
const nodeById = new Map(bundle.categories.map((node) => [node.id, node]));
const nodeIdBySlug = new Map(
  bundle.categories.map((node) => [node.slug, node.id]),
);
const nodeIdByAlias = new Map(
  bundle.aliases.map((alias) => [
    alias.alias.toLocaleLowerCase("fr-FR"),
    alias.canonicalCategoryId,
  ]),
);
const projectionByCategoryId = new Map(
  bundle.projections.seo.map((projection) => [
    projection.categoryId,
    projection,
  ]),
);

export function listTaxonomySeoRecords(): readonly TaxonomySeoRecord[] {
  return bundle.categories.flatMap((node) => {
    const projection = projectionByCategoryId.get(node.id);
    return projection ? [{ node, projection }] : [];
  });
}

/** Resolve canonical identities and generated compatibility aliases. */
export function resolveTaxonomySeoRecord(
  idOrSlug: string | null | undefined,
): TaxonomySeoRecord | null {
  if (!idOrSlug) return null;
  const node =
    nodeById.get(idOrSlug) ??
    nodeById.get(nodeIdBySlug.get(idOrSlug) ?? "") ??
    nodeById.get(nodeIdByAlias.get(idOrSlug.toLocaleLowerCase("fr-FR")) ?? "");
  if (!node) return null;
  const projection = projectionByCategoryId.get(node.id);
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
  node: TaxonomyV4Node,
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

/** Return canonical ancestor slugs from the root through the selected node. */
export function taxonomyBranchSlugs(
  idOrSlug: string | null | undefined,
): string[] {
  const record = resolveTaxonomySeoRecord(idOrSlug);
  if (!record) return [];
  const branch: string[] = [];
  const visited = new Set<string>();
  let current: TaxonomyV4Node | undefined = record.node;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    branch.unshift(current.slug);
    current = current.parentId ? nodeById.get(current.parentId) : undefined;
  }
  return branch;
}

export function taxonomySlugsForListing(listing: {
  categorySlug?: string;
  subCategorySlug?: string;
}): string[] {
  return Array.from(
    new Set([
      ...taxonomyBranchSlugs(listing.categorySlug),
      ...taxonomyBranchSlugs(listing.subCategorySlug),
    ]),
  );
}
