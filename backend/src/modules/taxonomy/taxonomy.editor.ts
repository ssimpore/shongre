import type { TaxonomyV4PrivateBundle } from "./taxonomy.bundle.js";
import type { components } from "@shongre/contracts/openapi";
import type { Json } from "../../generated/database.types.js";

type Resource = components["schemas"]["TaxonomyAdminResource"];
export const TAXONOMY_ADMIN_RESOURCES = [
  "categories",
  "listingTypes",
  "attributes",
  "attributeGroups",
  "optionSets",
  "options",
  "optionParentLinks",
  "bindings",
  "dependencies",
  "validationRules",
  "aliases",
  "referenceData",
  "presentations",
  "discovery",
] as const satisfies readonly Resource[];

const fieldsByResource = {
  categories: {
    id: "id",
    source_key: "sourceKey",
    parent_id: "parentId",
    slug: "slug",
    labels: "labels",
    short_labels: "shortLabels",
    taxonomy_description: "description",
    icon_name: "iconName",
    sort_order: "sortOrder",
    status: "status",
    publishable: "publishable",
    seller_eligibility: "sellerEligibility",
    seo_config: "seo",
  },
  listingTypes: {
    id: "id",
    source_key: "sourceKey",
    category_id: "categoryId",
    vertical_id: "verticalId",
    publication_flow: "publicationFlow",
    intent: "intent",
    labels: "labels",
    intent_labels: "intentLabel",
    slug: "slug",
    seller_eligibility: "sellerEligibility",
    status: "status",
    market_availability: "marketAvailability",
    seo_indexable: "seoIndexable",
  },
  attributes: {
    id: "id",
    code: "code",
    labels: "labels",
    data_type: "dataType",
    source_data_type: "sourceDataType",
    ui_component: "uiComponent",
    attribute_group_id: "groupId",
    scope: "scope",
    option_set_id: "optionSetId",
    cardinality: "cardinality",
    unit: "unit",
    default_value: "defaultValue",
    validation: "validation",
    is_searchable: "searchable",
    is_filterable: "filterable",
    is_sortable: "sortable",
    card_visible: "cardVisible",
    detail_visible: "detailVisible",
    is_seo_relevant: "seoRelevant",
    seller_eligibility: "sellerEligibility",
    market_availability: "marketAvailability",
    is_required: "defaultRequired",
    display_order: "defaultDisplayOrder",
    privacy: "privacy",
    immutable_after_publication: "immutableAfterPublication",
    localized_help_text: "helpText",
    placeholder: "placeholder",
  },
  attributeGroups: {
    id: "id",
    labels: "labels",
    icon_name: "iconName",
    sort_order: "sortOrder",
    collapsible: "collapsible",
    is_public: "public",
  },
  optionSets: {
    id: "id",
    labels: "labels",
  },
  options: {
    id: "id",
    option_set_id: "optionSetId",
    option_key: "key",
    labels: "labels",
    sort_order: "sortOrder",
    is_active: "active",
    managed_externally: "managedExternally",
  },
  optionParentLinks: {
    option_id: "optionId",
    parent_option_id: "parentOptionId",
  },
  bindings: {
    id: "id",
    category_id: "categoryId",
    listing_type_id: "listingTypeId",
    intent: "intent",
    attribute_id: "attributeId",
    group_id: "groupId",
    scope: "scope",
    source_level: "sourceLevel",
    is_required: "required",
    sort_order: "sortOrder",
    publication_visible: "publicationVisible",
    detail_visible: "detailVisible",
    card_visible: "cardVisible",
    filterable: "filterable",
    searchable: "searchable",
    sortable: "sortable",
    seller_eligibility: "sellerEligibility",
    override_default: "overrideDefault",
  },
  dependencies: {
    id: "id",
    scopes: "scopes",
    trigger: "trigger",
    operator: "operator",
    trigger_values: "values",
    effect: "effect",
    targets: "targets",
    detail: "detail",
    status: "status",
  },
  validationRules: {
    id: "id",
    target: "target",
    scopes: "scopes",
    rule_type: "ruleType",
    expression: "expression",
    severity: "severity",
    messages: "messages",
    country_codes: "countries",
    seller_scopes: "sellerScopes",
    enforcement: "enforcement",
    status: "status",
  },
  aliases: {
    alias: "alias",
    canonical_node_id: "canonicalCategoryId",
    alias_kind: "kind",
  },
} as const;
const tables = {
  categories: "categories",
  listingTypes: "taxonomy_listing_types",
  attributes: "taxonomy_attributes",
  attributeGroups: "taxonomy_attribute_groups",
  optionSets: "taxonomy_option_sets",
  options: "taxonomy_options",
  optionParentLinks: "taxonomy_option_parent_links",
  bindings: "taxonomy_attribute_bindings",
  dependencies: "taxonomy_dependency_rules",
  validationRules: "taxonomy_validation_rules",
  aliases: "taxonomy_aliases",
} as const;

export function taxonomyRecords(
  bundle: TaxonomyV4PrivateBundle,
  resource: Resource,
): Record<string, unknown>[] {
  if (resource === "presentations" || resource === "discovery") {
    const owners =
      resource === "presentations" ? bundle.listingTypes : bundle.categories;
    const field = resource === "presentations" ? "listingTypeId" : "categoryId";
    const keys =
      resource === "presentations"
        ? ([
            "filters",
            "cardFields",
            "detailFields",
            "publicationFlow",
          ] as const)
        : (["search", "seo"] as const);
    const records = new Map<string, Record<string, unknown>>(
      owners.map((owner) => [
        owner.id,
        { id: owner.id, ...Object.fromEntries(keys.map((key) => [key, []])) },
      ]),
    );
    for (const key of keys)
      for (const item of bundle.projections[key]) {
        const row = item as unknown as Record<string, unknown>;
        const owner = records.get(String(row[field]));
        if (owner) (owner[key] as unknown[]).push(item);
      }
    return [...records.values()];
  }
  return bundle[resource];
}

export function taxonomyRecordKey(
  record: Record<string, unknown>,
  resource: Resource,
): string {
  if (resource === "optionParentLinks")
    return `${record.optionId}/${record.parentOptionId}`;
  return String(resource === "aliases" ? record.alias : record.id);
}

export function mergeTaxonomyRecords(
  bundle: TaxonomyV4PrivateBundle,
  resource: Resource,
  records: Record<string, unknown>[],
): TaxonomyV4PrivateBundle {
  const next = structuredClone(bundle);
  if (resource === "presentations" || resource === "discovery") {
    const field = resource === "presentations" ? "listingTypeId" : "categoryId";
    const keys =
      resource === "presentations"
        ? ["filters", "cardFields", "detailFields", "publicationFlow"]
        : ["search", "seo"];
    const projection = next.projections as unknown as Record<
      string,
      Record<string, unknown>[]
    >;
    for (const row of records)
      for (const key of keys)
        projection[key] = [
          ...projection[key].filter((item) => item[field] !== row.id),
          ...((row[key] as Record<string, unknown>[]) ?? []),
        ];
  } else {
    const merged = new Map(
      taxonomyRecords(next, resource).map((row) => [
        taxonomyRecordKey(row, resource),
        row,
      ]),
    );
    for (const row of records)
      merged.set(taxonomyRecordKey(row, resource), row);
    Object.assign(next, { [resource]: [...merged.values()] });
  }
  return next;
}

export function taxonomyRecordChanges(
  resource: Resource,
  records: Record<string, unknown>[],
  bundle: TaxonomyV4PrivateBundle,
): { table: string; values: Json }[] {
  return records.flatMap((row) => {
    if (resource === "referenceData")
      return [{ table: resource, values: row as Json }];
    if (resource === "presentations" || resource === "discovery") {
      const { id, ...presentation } = row;
      return [
        {
          table:
            resource === "presentations"
              ? "taxonomy_listing_types"
              : "categories",
          values: {
            id,
            [resource === "presentations"
              ? "presentation"
              : "discovery_projection"]: presentation,
          } as Json,
        },
      ];
    }
    const values: Record<string, Json> = Object.fromEntries(
      Object.entries(fieldsByResource[resource]).map(([column, property]) => [
        column,
        (row[property] ?? null) as Json,
      ]),
    );
    if (resource === "categories")
      Object.assign(values, {
        code: row.sourceKey,
        name: (row.labels as Record<string, string>)["fr-FR"],
        short_label:
          (row.shortLabels as Record<string, string>)["fr-FR"] ?? null,
        level:
          row.level === 0
            ? "category"
            : row.level === 1
              ? "subcategory"
              : "type",
        is_active: row.status === "active",
      });
    if (resource === "attributes")
      values.label = (row.labels as Record<string, string>)["fr-FR"];
    if (resource === "aliases")
      Object.assign(values, {
        status: "active",
        redirect_path: `/categorie/${bundle.categories.find((node) => node.id === row.canonicalCategoryId)!.slug}`,
      });
    const changes: { table: string; values: Json }[] = [
      { table: tables[resource], values: values as Json },
    ];
    if (resource === "categories")
      for (const market of row.marketAvailability as Record<string, Json>[])
        changes.push({
          table: "taxonomy_market_availability",
          values: {
            category_id: row.id as string,
            market_code: market.marketCode,
            status: market.status,
            marketplace_enabled: market.marketplaceEnabled,
            indexable: market.indexable,
          },
        });
    return changes;
  });
}
