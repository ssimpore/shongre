import {
  TAXONOMY_V4_CARD_BRANDS,
  TAXONOMY_V4_CARD_ROOT_ALIASES,
  TAXONOMY_V4_CARD_ROOTS,
} from "./fixtures/generated/taxonomy-v4.card";

const roots = TAXONOMY_V4_CARD_ROOTS.map(
  ([id, sourceKey, slug, labels, shortLabels]) => ({
    id,
    sourceKey,
    slug,
    labels,
    shortLabels,
  }),
);
const rootsByLookup = new Map(
  roots.flatMap((root) =>
    [root.id, root.sourceKey, root.slug].map((key) => [key, root] as const),
  ),
);
const rootAliases = new Map(TAXONOMY_V4_CARD_ROOT_ALIASES);
const brandLabelsByKey = new Map(
  TAXONOMY_V4_CARD_BRANDS.map(([key, labels]) => [
    key.toLocaleLowerCase("fr-FR"),
    labels,
  ]),
);

function normalizeLookup(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Malformed values stay unresolved and fall back to the supplied label.
  }
  return decoded
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/^\/+|\/+$/g, "");
}

function localizedValue(
  values: Readonly<Record<string, string | undefined>>,
  locale: string,
): string | undefined {
  const exact = values[locale];
  if (exact) return exact;
  const language = locale.split("-")[0]?.toLocaleLowerCase();
  return Object.entries(values).find(
    ([candidate, value]) =>
      Boolean(value) &&
      candidate.split("-")[0]?.toLocaleLowerCase() === language,
  )?.[1];
}

/** Resolve only the small, public universe label needed during card hydration. */
export function getTaxonomyV4CardRootLabel(
  value: string | undefined,
  locale = "fr-FR",
): string | undefined {
  if (!value) return undefined;
  const lookup = normalizeLookup(value);
  const aliasTarget = rootAliases.get(lookup);
  const rootLookup = lookup.split(".")[0] ?? "";
  const aliasedRootTarget = rootAliases.get(rootLookup);
  const root =
    rootsByLookup.get(lookup) ||
    rootsByLookup.get(rootLookup) ||
    (aliasTarget ? rootsByLookup.get(aliasTarget) : undefined) ||
    (aliasedRootTarget ? rootsByLookup.get(aliasedRootTarget) : undefined);
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

/** Resolve a public brand key without loading the complete taxonomy graph. */
export function getTaxonomyV4CardBrandLabel(
  value: string | undefined,
  locale = "fr-FR",
): string | undefined {
  const normalized = value?.trim().toLocaleLowerCase("fr-FR");
  if (!normalized) return undefined;
  const labels = brandLabelsByKey.get(normalized);
  if (!labels) return undefined;
  return localizedValue(labels, locale) || labels["fr-FR"] || labels["en-US"];
}
