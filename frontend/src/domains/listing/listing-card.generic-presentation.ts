import type { Listing, ListingCondition } from "../../types";

const CONDITION_LABELS: Record<ListingCondition, { fr: string; en: string }> = {
  new_with_tag: { fr: "Neuf avec étiquette", en: "New with tags" },
  new_without_tag: { fr: "Neuf sans étiquette", en: "New without tags" },
  very_good: { fr: "Très bon état", en: "Very good condition" },
  good: { fr: "Bon état", en: "Good condition" },
  fair: { fr: "État satisfaisant", en: "Fair condition" },
  for_parts: { fr: "Pour pièces / Réparation", en: "For parts or repair" },
  not_applicable: { fr: "", en: "" },
};

const VALUE_LABELS: Record<string, { fr: string; en: string }> = {
  apartment: { fr: "Appartement", en: "Apartment" },
  house: { fr: "Maison", en: "House" },
  permanent: { fr: "CDI", en: "Permanent" },
  fixed_term: { fr: "CDD", en: "Fixed-term" },
  petrol: { fr: "Essence", en: "Petrol" },
  essence: { fr: "Essence", en: "Petrol" },
  diesel: { fr: "Diesel", en: "Diesel" },
  electric: { fr: "Électrique", en: "Electric" },
  hybrid: { fr: "Hybride", en: "Hybrid" },
  automatic: { fr: "Automatique", en: "Automatic" },
  manual: { fr: "Manuelle", en: "Manual" },
  remote: { fr: "Télétravail", en: "Remote" },
  hybrid_work: { fr: "Hybride", en: "Hybrid" },
};

const CARD_ATTRIBUTE_GROUPS: Record<string, readonly (readonly string[])[]> = {
  vehicles: [
    ["model_year", "year"],
    ["mileage"],
    ["fuel_type", "fuel"],
    ["transmission", "gearbox"],
  ],
  vehicules: [
    ["model_year", "year"],
    ["mileage"],
    ["fuel_type", "fuel"],
    ["transmission", "gearbox"],
  ],
  real_estate: [
    ["property_type", "propertyType"],
    ["living_area", "livingAreaSquareMeters"],
    ["rooms"],
  ],
  immobilier: [
    ["property_type", "propertyType"],
    ["living_area", "livingAreaSquareMeters"],
    ["rooms"],
  ],
  jobs: [
    ["contract_type", "contractType"],
    ["working_arrangement", "remote_work"],
    ["profession", "professionLabel"],
  ],
  emploi: [
    ["contract_type", "contractType"],
    ["working_arrangement", "remote_work"],
    ["profession", "professionLabel"],
  ],
  electronics: [["brand"], ["model"], ["storage", "storage_capacity_gb"]],
  electronique: [["brand"], ["model"], ["storage", "storage_capacity_gb"]],
  fashion: [["size"], ["brand"], ["clothing_category"]],
  mode: [["size"], ["brand"], ["clothing_category"]],
  home_garden: [["furniture_type"], ["material"], ["brand"]],
  maison: [["furniture_type"], ["material"], ["brand"]],
  "maison-deco": [["furniture_type"], ["material"], ["brand"]],
};

const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "canonicalPath",
  "verticalEntityId",
  "verticalSchemaVersion",
  "verticalType",
]);

function humanize(value: string, language: "fr" | "en"): string {
  const normalized = value.trim().toLocaleLowerCase("fr-FR");
  const known = VALUE_LABELS[normalized];
  if (known) return known[language];
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toLocaleUpperCase() + spaced.slice(1) : "";
}

function formatAttribute(
  key: string,
  value: unknown,
  attributes: Listing["attributes"],
  locale: string,
): string {
  if (value === undefined || value === null || value === "") return "";
  const language = locale.toLocaleLowerCase().startsWith("en") ? "en" : "fr";
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatAttribute(key, entry, attributes, locale))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "boolean") {
    return value
      ? language === "fr"
        ? "Oui"
        : "Yes"
      : language === "fr"
        ? "Non"
        : "No";
  }
  if (["model_year", "year"].includes(key)) return String(value);
  if (key === "mileage") {
    const numeric = Number(value);
    const formatted = Number.isFinite(numeric)
      ? new Intl.NumberFormat(locale).format(numeric)
      : String(value);
    return `${formatted} ${String(attributes.mileage_unit || "km")}`;
  }
  if (["living_area", "livingAreaSquareMeters", "land_area"].includes(key)) {
    const numeric = Number(value);
    return `${Number.isFinite(numeric) ? new Intl.NumberFormat(locale).format(numeric) : String(value)} m²`;
  }
  if (key === "rooms") {
    const numeric = Number(value);
    return language === "fr"
      ? `${value} pièce${numeric > 1 ? "s" : ""}`
      : `${value} room${numeric === 1 ? "" : "s"}`;
  }
  if (key === "storage_capacity_gb") {
    return `${new Intl.NumberFormat(locale).format(Number(value))} ${language === "fr" ? "Go" : "GB"}`;
  }
  if (key === "storage" && typeof value === "string") {
    return language === "fr" ? value.replace(/gb\b/iu, "Go") : value;
  }
  if (typeof value === "number")
    return new Intl.NumberFormat(locale).format(value);
  return humanize(String(value), language);
}

export function getGenericListingConditionLabel(
  condition: ListingCondition,
  locale: string,
): string {
  const language = locale.toLocaleLowerCase().startsWith("en") ? "en" : "fr";
  return CONDITION_LABELS[condition]?.[language] ?? "";
}

/**
 * Small card projection for generic listing DTOs.
 *
 * Full taxonomy metadata is reserved for forms, filters and detail views. A
 * homepage card needs only a small ordered set of stable decision values, so
 * importing the compressed taxonomy catalogue here would make every market
 * landing page pay the publication-engine cost before a user asks for it. The
 * shared card applies the cross-platform two-chip display limit.
 */
export function getGenericListingCardCharacteristics(
  listing: Pick<Listing, "attributes" | "categorySlug" | "subCategorySlug">,
  locale: string,
): string[] {
  const attributes = listing.attributes || {};
  const groups =
    CARD_ATTRIBUTE_GROUPS[listing.categorySlug] ||
    CARD_ATTRIBUTE_GROUPS[listing.subCategorySlug] ||
    Object.keys(attributes)
      .filter((key) => !INTERNAL_ATTRIBUTE_KEYS.has(key))
      .map((key) => [key]);

  const values = groups.flatMap((group) => {
    const key = group.find(
      (candidate) =>
        attributes[candidate] !== undefined && attributes[candidate] !== null,
    );
    if (!key) return [];
    const formatted = formatAttribute(key, attributes[key], attributes, locale);
    return formatted ? [formatted] : [];
  });

  return [...new Set(values)].slice(0, 3);
}
