/**
 * Web compatibility adapters over the generated taxonomy v4 public bundle.
 * No category, listing-type, attribute, option, or projection is authored here.
 */
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import type { TaxonomyV4Node } from "@shongre/contracts/taxonomy";
import { themeColors } from "@shongre/design-tokens";
import type {
  Category,
  SubCategory,
  CategoryAttributeSchema,
  AttributeInputType,
} from "../../types";
import { activeDataLocale } from "../../i18n/localized";
import { ATTRIBUTE_REGISTRY } from "./attribute.registry";
import { CONDITION_SCHEMES } from "./condition.schemes";
import { getTaxonomyLabel } from "./taxonomy.labels";
import type {
  ListingFamily,
  TaxonomyNode,
  TaxonomyPrimaryCta,
} from "./taxonomy.types";

export { ATTRIBUTE_REGISTRY } from "./attribute.registry";
export { CONDITION_SCHEMES } from "./condition.schemes";

const bundle = getTaxonomyV4PublicBundle();
const APPLICATION_MANAGED_ATTRIBUTE_IDS = new Set([
  "title",
  "description",
  "images",
  "listing_intent",
  "price",
  "price_type",
  "currency",
  "seller_type",
  "condition",
  "location_country",
  "location_postcode",
  "location_city",
  "country",
  "postal_code",
  "city",
  "address",
  "item_condition",
]);
const childrenByParent = new Map<string | undefined, TaxonomyV4Node[]>();
const bindingsByCategory = new Map<string, typeof bundle.bindings>();

for (const category of bundle.categories) {
  const siblings = childrenByParent.get(category.parentId) ?? [];
  siblings.push(category);
  childrenByParent.set(category.parentId, siblings);
}
for (const siblings of childrenByParent.values()) {
  siblings.sort((left, right) => left.sortOrder - right.sortOrder);
}
for (const binding of bundle.bindings) {
  const bindings = bindingsByCategory.get(binding.categoryId) ?? [];
  bindings.push(binding);
  bindingsByCategory.set(binding.categoryId, bindings);
}

const ROOT_COLORS: Record<string, string> = {
  vehicles: themeColors["category-vehicles"],
  real_estate: themeColors["category-real-estate"],
  jobs: themeColors["category-jobs"],
  services: themeColors["category-services"],
  fashion: themeColors["category-fashion"],
  home_garden: themeColors["category-home-garden"],
  baby_family: themeColors["category-baby"],
  electronics: themeColors["category-multimedia"],
  leisure_culture: themeColors["category-leisure"],
  pets: themeColors["category-pets"],
  holidays: themeColors["category-real-estate"],
  education: themeColors["category-services"],
  professional_equipment: themeColors["category-neutral"],
  agriculture: themeColors["category-neutral"],
  energy_transition: themeColors["category-neutral"],
  sports_outdoors: themeColors["category-leisure"],
  events_tickets: themeColors["category-leisure"],
  free_exchange: themeColors["category-neutral"],
};

const STANDARD_PUBLICATION_STEPS: NonNullable<
  TaxonomyNode["publication"]
>["steps"] = [
  "intent",
  "taxonomy",
  "essential",
  "condition_history",
  "price_compensation",
  "fulfillment_location",
  "media_documents",
  "contact_preferences",
  "preview",
  "standard_or_upgrades",
  "confirmation",
];

function listingFamily(rootId: string): ListingFamily {
  if (rootId === "vehicles") return "vehicle";
  if (rootId === "real_estate") return "real_estate";
  if (rootId === "jobs") return "job";
  if (rootId === "services" || rootId === "education") return "service";
  if (
    rootId === "professional_equipment" ||
    rootId === "agriculture" ||
    rootId === "energy_transition"
  ) {
    return "professional_equipment";
  }
  return "physical_product";
}

function primaryCta(
  family: ListingFamily,
  categoryId: string,
): TaxonomyPrimaryCta {
  if (family === "job") return "apply";
  if (family === "real_estate") return "request_visit";
  if (family === "vehicle") return "request_test_drive";
  if (categoryId.startsWith("education.")) return "request_lesson";
  if (family === "service" || family === "professional_equipment") {
    return "request_quote";
  }
  return "contact_seller";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function adaptNode(source: TaxonomyV4Node, rootId: string): TaxonomyNode {
  const family = listingFamily(rootId);
  const children = (childrenByParent.get(source.id) ?? []).map((child) =>
    adaptNode(child, rootId),
  );
  const bindings = bindingsByCategory.get(source.id) ?? [];
  const attributeIds = unique(
    bindings
      .filter((binding) => binding.publicationVisible)
      .filter(
        (binding) =>
          !APPLICATION_MANAGED_ATTRIBUTE_IDS.has(binding.attributeId),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((binding) => binding.attributeId),
  );
  const summaryAttributeIds = unique(
    bundle.projections.cardFields
      .filter(
        (field) =>
          field.categoryId === source.id && field.field.kind === "attribute",
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((field) => field.field.key),
  );
  const filterFacetIds = unique(
    bundle.projections.filters
      .filter((filter) => filter.categoryId === source.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((filter) => filter.attributeId),
  );
  const intents =
    bundle.compatibility.supportedIntentsByCategory[source.id] ?? [];
  const rootColor = ROOT_COLORS[rootId] ?? themeColors["category-neutral"];
  const isProfessionalOnly =
    !source.sellerEligibility.individualAllowed &&
    source.sellerEligibility.professionalAllowed;

  return {
    id: source.id,
    code: source.sourceKey,
    slug: source.slug,
    parentId: source.parentId,
    level:
      source.level === 0
        ? "category"
        : source.level === 1
          ? "subcategory"
          : "type",
    publishable: source.publishable,
    listingFamily: family,
    verticalType:
      family === "vehicle"
        ? "automotive"
        : family === "real_estate"
          ? "real_estate"
          : family === "job"
            ? "employment"
            : source.id.startsWith("education.")
              ? "tutoring"
              : undefined,
    supportedIntents: intents,
    labels: source.labels,
    shortLabels: source.shortLabels,
    name: source.labels["fr-FR"],
    label: source.labels["fr-FR"],
    shortLabel: source.shortLabels["fr-FR"],
    description: source.description,
    // The generated v4 taxonomy owns category icon selection. Keeping the
    // canonical key intact makes every CategoryIcon consumer render the same
    // symbol and prevents new taxonomy icons from silently degrading to Tag.
    iconName: source.iconName,
    accentColor: rootColor,
    sortOrder: source.sortOrder,
    status: source.status,
    conditionScheme:
      family === "vehicle"
        ? "vehicle"
        : family === "real_estate"
          ? "real_estate"
          : family === "job"
            ? "job"
            : family === "service"
              ? "service"
              : family === "professional_equipment"
                ? "professional"
                : "consumer_product",
    capabilities: {
      canSell: intents.includes("SELL"),
      canGive: intents.includes("DONATE"),
      canExchange: intents.includes("EXCHANGE"),
      canRent: intents.includes("RENT_OUT"),
      reservationAllowed: !["job", "service", "real_estate"].includes(family),
      securePaymentAllowed: !["job", "service", "real_estate"].includes(family),
      negotiablePrice: family !== "job",
      fulfillmentModes:
        family === "service"
          ? ["on_site_service"]
          : family === "job" || family === "real_estate"
            ? ["none"]
            : ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: {
      individualAllowed: source.sellerEligibility.individualAllowed,
      proAllowed: source.sellerEligibility.professionalAllowed,
    },
    attributeIds,
    summaryAttributeIds,
    filterFacetIds,
    aliases: bundle.aliases
      .filter((alias) => alias.canonicalCategoryId === source.id)
      .map((alias) => alias.alias),
    seo: { indexable: source.seo.indexable },
    presentation: {
      cardAttributeIds: summaryAttributeIds,
      comparisonAttributeIds: attributeIds.filter(
        (id) => ATTRIBUTE_REGISTRY[id]?.comparable,
      ),
      detailGroupOrder: [
        "general",
        "specifications",
        "dimensions",
        "performance",
        "legal",
      ],
      sortOptions: bundle.projections.search.find(
        (search) => search.categoryId === source.id,
      )?.sortOptions ?? ["relevance", "recent"],
    },
    mediaGuidance: {
      minimumPhotoCount: family === "job" || family === "service" ? 0 : 1,
      maxPhotoCount: family === "real_estate" ? 20 : 12,
      recommendedViews:
        family === "service" ? ["work_sample", "context"] : ["front", "detail"],
    },
    taxonomyVersion: 4,
    schemaVersion: 4,
    schemaStatus: "published",
    publication: {
      steps: STANDARD_PUBLICATION_STEPS,
      primaryCta: primaryCta(family, source.id),
      standardPolicy: {
        enabled: true,
        label: "Publication standard gratuite",
        eligibleSellerTypes: isProfessionalOnly
          ? ["professional"]
          : ["individual", "professional"],
        durationDays: family === "job" ? 30 : 60,
        mediaAllowance: family === "real_estate" ? 20 : 12,
        includesMessaging: true,
        includesListingManagement: true,
        includesStandardStatistics: true,
        paidUpgradesOptional: true,
      },
    },
    moderation: {
      policyId: "public.taxonomy-v4",
      reviewMode: "standard",
      prohibitedItemRuleIds: [],
      safetyNoticeKeys: [],
      sensitiveAttributeIds: [],
    },
    children,
  };
}

export const CANONICAL_TAXONOMY: TaxonomyNode[] = (
  childrenByParent.get(undefined) ?? []
).map((root) => adaptNode(root, root.id));

export const CONDITION_OPTIONS = CONDITION_SCHEMES.consumer_product.map(
  (condition) => ({
    value: condition.value,
    label: condition.label,
    description: condition.description,
  }),
);

function legacyInputType(dataType: string): AttributeInputType {
  if (["select", "enum", "autocomplete"].includes(dataType)) return "select";
  if (["multi_select", "multi_enum"].includes(dataType)) return "multi_select";
  if (
    ["number", "integer", "decimal", "percent", "money", "range"].includes(
      dataType,
    )
  ) {
    return "number";
  }
  if (dataType === "long_text") return "textarea";
  if (dataType === "boolean") return "boolean";
  if (dataType === "year") return "year";
  if (dataType === "date" || dataType === "date_time") return "date";
  return "text";
}

function buildLegacyAttributes(
  attributeIds: string[],
  summaryIds: string[],
): CategoryAttributeSchema[] {
  return attributeIds.flatMap((id) => {
    const attribute = ATTRIBUTE_REGISTRY[id];
    if (!attribute) return [];
    return [
      {
        key: attribute.code,
        label: attribute.label,
        type: legacyInputType(attribute.dataType),
        required: Boolean(attribute.required),
        showInFilters: Boolean(attribute.filterable),
        showInCardPreview: summaryIds.includes(attribute.id),
        options: attribute.options?.map((option) => ({
          value: option.value,
          label: option.label,
        })),
        unit: attribute.unit,
        min: attribute.validation?.min,
        max: attribute.validation?.max,
        step: attribute.validation?.step,
        placeholder: attribute.validation?.placeholder ?? attribute.helpText,
      },
    ];
  });
}

function buildTaxonomyProjection(locale: string): Category[] {
  return CANONICAL_TAXONOMY.map((root) => ({
    id: root.id,
    slug: root.slug,
    name: getTaxonomyLabel(root, { locale }),
    label: getTaxonomyLabel(root, { locale }),
    shortLabel: getTaxonomyLabel(root, { locale, compact: true }),
    iconName: root.iconName ?? "Tag",
    description: root.description ?? getTaxonomyLabel(root, { locale }),
    accentColor: root.accentColor,
    subCategories: (root.children ?? []).map((subcategory): SubCategory => ({
      id: subcategory.id,
      slug: subcategory.slug,
      name: getTaxonomyLabel(subcategory, { locale }),
      label: getTaxonomyLabel(subcategory, { locale }),
      shortLabel: getTaxonomyLabel(subcategory, { locale, compact: true }),
      parentSlug: root.slug,
      iconName: subcategory.iconName ?? root.iconName,
      accentColor: subcategory.accentColor ?? root.accentColor,
      attributesSchema: buildLegacyAttributes(
        subcategory.attributeIds ?? [],
        subcategory.summaryAttributeIds ?? [],
      ),
    })),
  }));
}

export const TAXONOMY: Category[] = buildTaxonomyProjection(activeDataLocale());

export function refreshTaxonomyProjection(locale: string): void {
  TAXONOMY.splice(0, TAXONOMY.length, ...buildTaxonomyProjection(locale));
}

export const getCategoryBySlug = (slug: string): Category | undefined =>
  TAXONOMY.find((category) => category.slug === slug || category.id === slug);

export const getSubCategoryBySlug = (
  categorySlug: string,
  subCategorySlug: string,
): SubCategory | undefined =>
  getCategoryBySlug(categorySlug)?.subCategories.find(
    (subcategory) =>
      subcategory.slug === subCategorySlug ||
      subcategory.id === subCategorySlug,
  );

export const getAttributesForCategory = (
  categorySlug: string,
  subCategorySlug?: string,
): CategoryAttributeSchema[] => {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];
  if (subCategorySlug) {
    return (
      category.subCategories.find(
        (subcategory) =>
          subcategory.slug === subCategorySlug ||
          subcategory.id === subCategorySlug,
      )?.attributesSchema ?? []
    );
  }
  return category.subCategories.flatMap(
    (subcategory) => subcategory.attributesSchema,
  );
};
