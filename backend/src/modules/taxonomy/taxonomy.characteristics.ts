import { localizeTaxonomyLabels as localized } from "@shongre/contracts/taxonomy-labels";
import type { components } from "@shongre/contracts/openapi";
import type { TaxonomyV1Attribute } from "@shongre/contracts/taxonomy";
import type { TaxonomyV1PrivateBundle } from "./taxonomy.bundle.js";

type Characteristics = components["schemas"]["ListingCharacteristics"];
type Group = Characteristics["groups"][number];
type Option = TaxonomyV1PrivateBundle["options"][number];

function comparable(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("fr-FR");
}

function formatValue(
  value: unknown,
  definition: TaxonomyV1Attribute,
  options: readonly Option[],
  locale: string,
): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item, definition, options, locale))
      .filter(Boolean)
      .join(", ");
  }
  if (value === null || value === undefined || typeof value === "object")
    return "";
  if (typeof value === "boolean") {
    if (definition.dataType !== "boolean") return "";
    return locale.startsWith("fr")
      ? value
        ? "Oui"
        : "Non"
      : value
        ? "Yes"
        : "No";
  }
  if (typeof value !== "string" && typeof value !== "number") return "";
  if (typeof value === "number" && !Number.isFinite(value)) return "";
  const text = String(value).trim();
  if (!text) return "";
  const matched = options.find((option) =>
    [option.id, option.key, ...Object.values(option.labels)].some(
      (candidate) => comparable(candidate) === comparable(text),
    ),
  );
  // Retired options still describe existing records; unknown enumerated values
  // do not acquire a made-up label. Autocomplete permits seller-entered text.
  if (matched) return localized(matched.labels, locale);
  if (["select", "multiselect", "radio"].includes(definition.dataType))
    return "";
  if (typeof value === "number") {
    const number = new Intl.NumberFormat(locale, {
      useGrouping: definition.dataType !== "year",
    }).format(value);
    return definition.unit ? `${number} ${definition.unit}` : number;
  }
  return text;
}

function buildCharacteristicsIndex(taxonomy: TaxonomyV1PrivateBundle) {
  const categories = new Map(taxonomy.categories.map((row) => [row.id, row]));
  const definitions = new Map(taxonomy.attributes.map((row) => [row.id, row]));
  const groups = new Map(taxonomy.attributeGroups.map((row) => [row.id, row]));
  const bindingsByType = new Map<
    string,
    Array<(typeof taxonomy.bindings)[number]>
  >();
  for (const row of taxonomy.bindings) {
    const entries = bindingsByType.get(row.listingTypeId) ?? [];
    entries.push(row);
    bindingsByType.set(row.listingTypeId, entries);
  }
  const optionsBySet = new Map<string, Option[]>();
  for (const row of taxonomy.options) {
    const entries = optionsBySet.get(row.optionSetId) ?? [];
    entries.push(row);
    optionsBySet.set(row.optionSetId, entries);
  }

  const cardsByType = new Map<
    string,
    TaxonomyV1PrivateBundle["projections"]["cardFields"]
  >();
  for (const row of taxonomy.projections.cardFields) {
    const entries = cardsByType.get(row.listingTypeId) ?? [];
    entries.push(row);
    cardsByType.set(row.listingTypeId, entries);
  }
  return {
    categories,
    definitions,
    groups,
    bindingsByType,
    optionsBySet,
    cardsByType,
  };
}
const indexedSnapshots = new WeakMap<
  TaxonomyV1PrivateBundle,
  ReturnType<typeof buildCharacteristicsIndex>
>();
function characteristicsIndex(taxonomy: TaxonomyV1PrivateBundle) {
  let index = indexedSnapshots.get(taxonomy);
  if (!index) {
    index = buildCharacteristicsIndex(taxonomy);
    indexedSnapshots.set(taxonomy, index);
  }
  return index;
}

export function projectListingCharacteristics(
  input: {
    categoryId: string;
    listingTypeId?: string;
    intent?: string;
    sellerType: "individual" | "professional";
    marketCode: string;
    locale: string;
    attributes: Readonly<Record<string, unknown>>;
    surface?: "detail" | "card";
    /** Typed domain APIs already validate which public fields their records own. */
    validatedDomainFields?: boolean;
    /** Values resolved from reference entries in this same immutable publication. */
    referenceValues?: Readonly<
      Record<string, Readonly<Record<string, string>>>
    >;
  },
  taxonomy: TaxonomyV1PrivateBundle,
): Characteristics {
  const {
    categories,
    definitions,
    groups,
    bindingsByType,
    optionsBySet,
    cardsByType,
  } = characteristicsIndex(taxonomy);

  const categoryId = categories.has(input.categoryId)
    ? input.categoryId
    : taxonomy.aliases.find((alias) => alias.alias === input.categoryId)
        ?.canonicalCategoryId;
  const category = categoryId ? categories.get(categoryId) : undefined;
  if (
    !category?.marketAvailability.some(
      (market) =>
        market.marketCode === input.marketCode && market.marketplaceEnabled,
    )
  )
    return { groups: [] };

  const belongsToBranch = (id: string): boolean => {
    let node = categories.get(id);
    const visited = new Set<string>();
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      if (node.id === category.id) return true;
      node = node.parentId ? categories.get(node.parentId) : undefined;
    }
    return false;
  };
  const types = taxonomy.listingTypes.filter(
    (type) =>
      belongsToBranch(type.categoryId) &&
      (!input.listingTypeId || type.id === input.listingTypeId) &&
      (!input.intent || type.intent === input.intent) &&
      type.marketAvailability.some(
        (market) =>
          market.marketCode === input.marketCode && market.marketplaceEnabled,
      ),
  );
  if (!types.length) return { groups: [] };
  const applicable = types.map(
    (type) =>
      new Map(
        (bindingsByType.get(type.id) ?? [])
          .filter((binding) => {
            const definition = definitions.get(binding.attributeId);
            return (
              (input.surface === "card"
                ? binding.cardVisible
                : binding.detailVisible) &&
              groups.get(binding.groupId)?.public &&
              definition &&
              (input.surface === "card"
                ? definition.cardVisible
                : definition.detailVisible) &&
              (input.surface !== "card" ||
                (cardsByType.get(type.id) ?? []).some(
                  (projection) =>
                    projection.field.kind === "attribute" &&
                    [definition.id, definition.code].includes(
                      projection.field.key,
                    ),
                )) &&
              definition.privacy === "public" &&
              groups.get(definition.groupId)?.public &&
              definition.marketAvailability.some(
                (market) =>
                  market.marketCode === input.marketCode &&
                  market.marketplaceEnabled,
              )
            );
          })
          .map((binding) => [binding.attributeId, binding]),
      ),
  );
  // A parent category is not a publication choice. Only fields shared by every
  // applicable descendant type are safe to present without guessing a leaf.
  const common = [
    ...new Map(
      (input.validatedDomainFields ? applicable : [applicable[0]]).flatMap(
        (bindings) => [...bindings.entries()],
      ),
    ).values(),
  ]
    .filter(
      (binding) =>
        input.validatedDomainFields ||
        applicable.every((bindings) => bindings.has(binding.attributeId)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const result = new Map<
    string,
    { id: string; label: string; items: Array<Group["items"][number]> }
  >();
  for (const binding of common) {
    const definition = definitions.get(binding.attributeId)!;
    const group = groups.get(binding.groupId)!;
    const value =
      input.attributes[definition.code] ?? input.attributes[definition.id];
    const formatted =
      (input.validatedDomainFields &&
      value != null &&
      input.referenceValues?.[definition.code]
        ? localized(input.referenceValues[definition.code], input.locale)
        : "") ||
      formatValue(
        value,
        definition,
        definition.optionSetId
          ? (optionsBySet.get(definition.optionSetId) ?? [])
          : [],
        input.locale,
      );
    const cardProjection =
      input.surface === "card"
        ? (cardsByType.get(types[0].id) ?? []).find(
            (row) =>
              row.field.kind === "attribute" &&
              [definition.id, definition.code].includes(row.field.key),
          )
        : undefined;
    const label = localized(
      cardProjection?.labels ?? definition.labels,
      input.locale,
    );
    if (!formatted || !label) continue;
    const projected = result.get(group.id) ?? {
      id: group.id,
      label: localized(group.labels, input.locale),
      items: [],
    };
    projected.items.push({ code: definition.code, label, value: formatted });
    result.set(group.id, projected);
  }
  return {
    groups: [...result.values()].sort(
      (a, b) => groups.get(a.id)!.sortOrder - groups.get(b.id)!.sortOrder,
    ),
  };
}

/** Public card values derive from the same historical read bindings as details. */
export function projectLocalizedListingCharacteristics(
  input: Omit<
    Parameters<typeof projectListingCharacteristics>[0],
    "locale" | "surface"
  >,
  taxonomy: TaxonomyV1PrivateBundle,
  surface: "card" | "detail" = "card",
): NonNullable<
  components["schemas"]["ListingTaxonomyProjection"]["cardCharacteristics"]
> {
  const category = taxonomy.categories.find(
    (row) => row.id === input.categoryId,
  );
  if (!category) return [];
  const locales = [...new Set(["fr-FR", ...Object.keys(category.labels)])];
  const rows = new Map<
    string,
    {
      code: string;
      labels: Record<string, string> & { "fr-FR": string };
      values: Record<string, string> & { "fr-FR": string };
    }
  >();
  for (const locale of locales) {
    const projection = projectListingCharacteristics(
      { ...input, locale, surface },
      taxonomy,
    );
    for (const group of projection.groups)
      for (const item of group.items) {
        const row = rows.get(item.code) ?? {
          code: item.code,
          labels: { "fr-FR": "" },
          values: { "fr-FR": "" },
        };
        row.labels[locale] = item.label;
        row.values[locale] = item.value;
        rows.set(item.code, row);
      }
  }
  if (surface === "detail") return [...rows.values()];
  // All applicable types must share a field to expose it on an ambiguous historical
  // category. Its first declared presentation supplies the deterministic order.
  const { categories } = characteristicsIndex(taxonomy);
  const belongsToCategory = (id: string) => {
    const visited = new Set<string>();
    let current = categories.get(id);
    while (current && !visited.has(current.id)) {
      if (current.id === category.id) return true;
      visited.add(current.id);
      current = current.parentId ? categories.get(current.parentId) : undefined;
    }
    return false;
  };
  const ranks = new Map<string, number>();
  for (const row of taxonomy.projections.cardFields) {
    if (
      row.field.kind !== "attribute" ||
      (input.listingTypeId && row.listingTypeId !== input.listingTypeId)
    )
      continue;
    if (!belongsToCategory(row.categoryId)) continue;
    if (!ranks.has(row.field.key)) ranks.set(row.field.key, row.sortOrder);
  }
  return [...rows.values()].sort(
    (a, b) =>
      (ranks.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
      (ranks.get(b.code) ?? Number.MAX_SAFE_INTEGER),
  );
}
