import {
  TAXONOMY_V4_BRAND_OPTIONS,
  TAXONOMY_V4_IDENTITY_ALIASES,
  TAXONOMY_V4_IDENTITY_NODES,
  type TaxonomyV4IdentityLabels,
} from "./fixtures/generated/taxonomy-v4.identity";

export type TaxonomyV4IdentityNode = {
  readonly id: string;
  readonly sourceKey: string;
  readonly parentId?: string;
  readonly slug: string;
  readonly labels: TaxonomyV4IdentityLabels;
  readonly shortLabels: TaxonomyV4IdentityLabels;
};

const nodes: readonly TaxonomyV4IdentityNode[] = TAXONOMY_V4_IDENTITY_NODES.map(
  ([id, sourceKey, parentId, slug, labels, shortLabels]) => ({
    id,
    sourceKey,
    ...(parentId ? { parentId } : {}),
    slug,
    labels,
    shortLabels,
  }),
);
const nodesById = new Map(nodes.map((node) => [node.id, node]));
const nodesBySourceKey = new Map(nodes.map((node) => [node.sourceKey, node]));
const nodesBySlug = new Map(nodes.map((node) => [node.slug, node]));
const aliases = new Map(TAXONOMY_V4_IDENTITY_ALIASES);
const brandOptionsByKey = new Map(
  TAXONOMY_V4_BRAND_OPTIONS.map(([key, labels]) => [
    key.toLocaleLowerCase("fr-FR"),
    labels,
  ]),
);

function normalizeLookup(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Malformed legacy input remains unresolved instead of changing identity.
  }
  return decoded
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/^\/+|\/+$/g, "");
}

/** Resolve a v4 category id, source key, public slug, or compiled alias. */
export function resolveTaxonomyV4Identity(
  value?: string,
): TaxonomyV4IdentityNode | undefined {
  if (!value) return undefined;
  const lookup = normalizeLookup(value);
  const aliasTarget = aliases.get(lookup);
  return (
    nodesById.get(lookup) ||
    nodesBySourceKey.get(lookup) ||
    nodesBySlug.get(lookup) ||
    (aliasTarget ? nodesById.get(aliasTarget) : undefined)
  );
}

/** Resolve the universe node, including for a forward-compatible descendant id. */
export function resolveTaxonomyV4Root(
  value?: string,
): TaxonomyV4IdentityNode | undefined {
  if (!value) return undefined;
  const segments = normalizeLookup(value).split(".");
  let node: TaxonomyV4IdentityNode | undefined;
  while (!node && segments.length) {
    node = resolveTaxonomyV4Identity(segments.join("."));
    segments.pop();
  }
  if (!node) return undefined;
  while (node.parentId) {
    const parent = nodesById.get(node.parentId);
    if (!parent) break;
    node = parent;
  }
  return node;
}

/** Whether a category resolves to the requested node or one of its descendants. */
export function isTaxonomyV4DescendantOf(
  value: string | undefined,
  ancestorValue: string | undefined,
): boolean {
  const ancestor = resolveTaxonomyV4Identity(ancestorValue);
  let node = resolveTaxonomyV4Identity(value);
  if (!ancestor || !node) return false;

  while (node) {
    if (node.id === ancestor.id) return true;
    node = node.parentId ? nodesById.get(node.parentId) : undefined;
  }
  return false;
}

function localizedValue(
  values: Readonly<Record<string, string | undefined>>,
  locale: string,
): string | undefined {
  const exact = values[locale];
  if (exact) return exact;
  const language = locale.split("-")[0]?.toLocaleLowerCase();
  const languageMatch = Object.entries(values).find(
    ([candidate, value]) =>
      Boolean(value) &&
      candidate.split("-")[0]?.toLocaleLowerCase() === language,
  )?.[1];
  return languageMatch;
}

/** Return the compact, localized universe label from the generated v4 registry. */
export function getTaxonomyV4RootLabel(
  value: string | undefined,
  locale = "fr-FR",
): string | undefined {
  const root = resolveTaxonomyV4Root(value);
  if (!root) return undefined;
  return (
    localizedValue(root.shortLabels, locale) ||
    localizedValue(root.labels, locale) ||
    root.shortLabels["fr-FR"] ||
    root.labels["fr-FR"] ||
    root.shortLabels["en-US"] ||
    root.labels["en-US"]
  );
}

/** Return the compact localized label for one exact canonical category. */
export function getTaxonomyV4Label(
  value: string | undefined,
  locale = "fr-FR",
): string | undefined {
  const node = resolveTaxonomyV4Identity(value);
  if (!node) return undefined;
  return (
    localizedValue(node.shortLabels, locale) ||
    localizedValue(node.labels, locale) ||
    node.shortLabels["fr-FR"] ||
    node.labels["fr-FR"] ||
    node.shortLabels["en-US"] ||
    node.labels["en-US"]
  );
}

/** Resolve a stored canonical option key to its public localized label. */
export function getTaxonomyV4OptionLabel(
  attributeId: string,
  value: string | undefined,
  locale = "fr-FR",
): string | undefined {
  const normalized = value?.trim().toLocaleLowerCase("fr-FR");
  if (attributeId !== "brand" || !normalized) return undefined;
  const labels = brandOptionsByKey.get(normalized);
  if (!labels) return undefined;
  return localizedValue(labels, locale) || labels["fr-FR"] || labels["en-US"];
}
