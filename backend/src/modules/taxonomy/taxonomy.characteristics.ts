import type { components } from "@shongre/contracts/openapi";
import type { TaxonomyV4Attribute } from "@shongre/contracts/taxonomy";
import { TAXONOMY_V4_PRIVATE_BUNDLE as taxonomy } from "./generated/taxonomy-v4.private.js";

type Characteristics = components["schemas"]["ListingCharacteristics"];
type Group = Characteristics["groups"][number];
type Option = (typeof taxonomy.options)[number];

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

// Existing vehicle records use these persisted keys. Keep translation at the
// backend read boundary until those records are migrated; never infer values.
const storedVehicleKeys: Readonly<Record<string, string>> = {
  model_year: "year",
  fuel_type: "fuel",
  transmission: "gearbox",
  critair_class: "critair",
};

function localized(labels: Readonly<Record<string, string>>, locale: string) {
  const language = locale.split("-")[0];
  return (
    labels[locale] ||
    Object.entries(labels).find(
      ([key]) => key.split("-")[0] === language,
    )?.[1] ||
    labels["fr-FR"] ||
    Object.values(labels)[0] ||
    ""
  );
}

function comparable(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("fr-FR");
}

function formatValue(
  value: unknown,
  definition: TaxonomyV4Attribute,
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

export function projectListingCharacteristics(input: {
  categoryId: string;
  listingTypeId?: string;
  intent?: string;
  sellerType: "individual" | "professional";
  marketCode: string;
  locale: string;
  attributes: Readonly<Record<string, unknown>>;
}): Characteristics {
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

  const sellerAllowed = (eligibility: {
    individualAllowed: boolean;
    professionalAllowed: boolean;
  }) =>
    input.sellerType === "professional"
      ? eligibility.professionalAllowed
      : eligibility.individualAllowed;
  const belongsToBranch = (id: string): boolean => {
    let node = categories.get(id);
    while (node) {
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
      sellerAllowed(type.sellerEligibility) &&
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
              binding.detailVisible &&
              sellerAllowed(binding.sellerEligibility) &&
              groups.get(binding.groupId)?.public &&
              definition?.detailVisible &&
              definition.privacy === "public" &&
              groups.get(definition.groupId)?.public &&
              sellerAllowed(definition.sellerEligibility) &&
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
  const common = [...applicable[0].values()]
    .filter((binding) =>
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
    const alias = category.id.startsWith("vehicles.")
      ? storedVehicleKeys[definition.code]
      : undefined;
    const value =
      input.attributes[definition.code] ??
      input.attributes[definition.id] ??
      (alias ? input.attributes[alias] : undefined);
    const formatted = formatValue(
      value,
      definition,
      definition.optionSetId
        ? (optionsBySet.get(definition.optionSetId) ?? [])
        : [],
      input.locale,
    );
    const label = localized(definition.labels, input.locale);
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
