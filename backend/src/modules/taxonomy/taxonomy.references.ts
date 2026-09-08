import { z } from "zod";
import type { Json } from "../../generated/database.types.js";
import { vehicleTypeConfigSchema } from "@shongre/contracts/auto";
import { vehicleAttributeDefinitionSchema } from "@shongre/contracts/auto";
import { vehicleCatalogEntrySchema } from "@shongre/contracts/auto";
import { propertyTypeConfigSchema } from "@shongre/contracts/real-estate";
import { propertyAttributeDefinitionSchema } from "@shongre/contracts/real-estate";
import { propertyFieldRuleSchema } from "@shongre/contracts/real-estate";
import { courseSubjectSchema } from "@shongre/contracts/courses";
import { courseSubjectLevelSchema } from "@shongre/contracts/courses";
import { employmentDictionaryEntrySchema } from "@shongre/contracts/employment";

// These schemas preserve existing stored reference identities while all datasets
// share the v1 authoring, validation and publication boundary.
export const taxonomyReferenceDefinitions = {
  auto_vehicle_types: {
    schema: vehicleTypeConfigSchema,
    key: "type",
    publicPayload: true,
    fields: {
      type: "type",
      slug: "slug",
      label: "label",
      description: "description",
      schema_version: "schemaVersion",
      is_active: "isActive",
      sort_order: "sortOrder",
      required_field_ids: "requiredFieldIds",
      filter_field_ids: "filterFieldIds",
    },
  },
  auto_attribute_definitions: {
    schema: vehicleAttributeDefinitionSchema,
    key: "id",
    publicPayload: true,
    fields: {
      id: "id",
      market_code: "marketCode",
      vehicle_types: "vehicleTypes",
      label: "label",
      field_type: "fieldType",
      unit: "unit",
      options: "options",
      is_required: "isRequired",
      is_filterable: "isFilterable",
      is_public: "isPublic",
      sort_order: "sortOrder",
      schema_version: "schemaVersion",
      is_active: "isActive",
    },
  },
  auto_catalog_entries: {
    schema: vehicleCatalogEntrySchema,
    key: "id",
    publicPayload: true,
    fields: {
      id: "id",
      kind: "kind",
      parent_id: "parentId",
      vehicle_types: "vehicleTypes",
      slug: "slug",
      label: "label",
      starts_year: "startsYear",
      ends_year: "endsYear",
      is_active: "isActive",
    },
  },
  real_estate_property_types: {
    schema: propertyTypeConfigSchema,
    key: "type",
    publicPayload: false,
    fields: {
      type: "type",
      market_code: "marketCode",
      slug: "slug",
      label: "label",
      description: "description",
      icon_name: "iconName",
      transaction_types: "transactionTypes",
      required_field_ids: "requiredFieldIds",
      filter_field_ids: "filterFieldIds",
      schema_version: "schemaVersion",
      is_active: "isActive",
      sort_order: "sortOrder",
    },
  },
  real_estate_attribute_definitions: {
    schema: propertyAttributeDefinitionSchema,
    key: "id",
    publicPayload: false,
    fields: {
      id: "id",
      market_code: "marketCode",
      property_types: "propertyTypes",
      transaction_types: "transactionTypes",
      label: "label",
      help_text: "helpText",
      field_type: "fieldType",
      unit: "unit",
      options: "options",
      privacy: "privacy",
      is_required: "isRequired",
      is_filterable: "isFilterable",
      is_active: "isActive",
      schema_version: "schemaVersion",
      sort_order: "sortOrder",
    },
  },
  real_estate_field_rules: {
    schema: propertyFieldRuleSchema,
    key: "id",
    publicPayload: false,
    fields: {
      id: "id",
      market_code: "marketCode",
      property_type: "propertyType",
      transaction_type: "transactionType",
      field_id: "fieldId",
      requirement: "requirement",
      condition_payload: "condition",
      schema_version: "schemaVersion",
      is_active: "isActive",
    },
  },
  course_subjects: {
    schema: courseSubjectSchema,
    key: "id",
    publicPayload: true,
    fields: {
      id: "id",
      market_code: "marketCode",
      slug: "slug",
      parent_id: "parentId",
      label: "label",
      description: "description",
      icon_name: "iconName",
      sort_order: "sortOrder",
      is_active: "isActive",
    },
  },
  course_subject_levels: {
    schema: courseSubjectLevelSchema,
    key: "id",
    publicPayload: true,
    fields: {
      id: "id",
      label: "label",
      sort_order: "sortOrder",
      is_active: "isActive",
    },
  },
  employment_dictionary_entries: {
    schema: employmentDictionaryEntrySchema,
    key: "id",
    publicPayload: false,
    fields: {
      id: "id",
      market_code: "marketCode",
      kind: "kind",
      parent_id: "parentId",
      code: "code",
      slug: "slug",
      label: "label",
      description: "description",
      aliases: "aliases",
      metadata: "metadata",
      is_active: "isActive",
      sort_order: "sortOrder",
      version: "version",
    },
  },
} as const;
export type ReferenceNamespace = keyof typeof taxonomyReferenceDefinitions;
export const taxonomyReferenceEntrySchema = z
  .object({
    id: z.string().min(1),
    namespace: z.enum([
      "auto_vehicle_types",
      "auto_attribute_definitions",
      "auto_catalog_entries",
      "real_estate_property_types",
      "real_estate_attribute_definitions",
      "real_estate_field_rules",
      "course_subjects",
      "course_subject_levels",
      "employment_dictionary_entries",
    ]),
    marketCode: z.string().regex(/^[A-Z]{2}$/),
    key: z.string().min(1),
    values: z.record(z.unknown()),
  })
  .strict();
export type TaxonomyReferenceEntry = z.infer<
  typeof taxonomyReferenceEntrySchema
>;

export function projectTaxonomyReference<N extends ReferenceNamespace>(
  namespace: N,
  values: Record<string, unknown>,
): z.infer<(typeof taxonomyReferenceDefinitions)[N]["schema"]> {
  const definition = taxonomyReferenceDefinitions[namespace];
  const projected: Record<string, unknown> = definition.publicPayload
    ? { ...(values.public_payload as Record<string, unknown>) }
    : {};
  for (const [column, property] of Object.entries(definition.fields))
    projected[property] = values[column] ?? undefined;
  return definition.schema.parse(projected) as z.infer<
    (typeof taxonomyReferenceDefinitions)[N]["schema"]
  >;
}

export function readTaxonomyReferences<N extends ReferenceNamespace>(
  entries: readonly TaxonomyReferenceEntry[],
  namespace: N,
  marketCode: string,
  includeInactive = false,
): z.infer<(typeof taxonomyReferenceDefinitions)[N]["schema"]>[] {
  return entries
    .filter(
      (row) =>
        row.namespace === namespace &&
        row.marketCode === marketCode.toUpperCase() &&
        (includeInactive || row.values.is_active === true),
    )
    .sort(
      (a, b) =>
        Number(a.values.sort_order ?? 0) - Number(b.values.sort_order ?? 0) ||
        String(a.values.label).localeCompare(String(b.values.label)),
    )
    .map((row) => projectTaxonomyReference(namespace, row.values));
}

export function taxonomyReferenceChange(entry: TaxonomyReferenceEntry) {
  const definition = taxonomyReferenceDefinitions[entry.namespace];
  const value = projectTaxonomyReference(entry.namespace, entry.values);
  return {
    table: entry.namespace,
    values: {
      ...entry.values,
      ...(definition.publicPayload
        ? {
            public_payload: {
              ...(entry.values.public_payload as Record<string, unknown>),
              ...value,
            },
          }
        : {}),
    } as Json,
  };
}

export function inspectTaxonomyReferences(
  entries: readonly TaxonomyReferenceEntry[],
): { id: string; message: string }[] {
  const issues: { id: string; message: string }[] = [];
  const keys = new Set(entries.map((row) => row.id));
  for (const row of entries) {
    const fail = (message: string) => issues.push({ id: row.id, message });
    if (
      row.id !== row.namespace + ":" + row.marketCode + ":" + row.key ||
      row.values.market_code !== row.marketCode ||
      row.values[taxonomyReferenceDefinitions[row.namespace].key] !== row.key
    )
      fail("Identité ou marché du référentiel incohérent.");
    try {
      projectTaxonomyReference(row.namespace, row.values);
    } catch {
      fail("Valeurs de référentiel incompatibles avec le contrat du domaine.");
    }
    const seenParents = new Set([row.id]);
    let parent = row.values.parent_id;
    while (parent) {
      const id = row.namespace + ":" + row.marketCode + ":" + parent;
      if (seenParents.has(id)) {
        fail("Cycle dans les références parentes.");
        break;
      }
      seenParents.add(id);
      parent = entries.find((entry) => entry.id === id)?.values.parent_id;
    }
    if (
      row.values.parent_id &&
      !keys.has(
        row.namespace + ":" + row.marketCode + ":" + row.values.parent_id,
      )
    )
      fail("Référence parente absente dans ce marché.");
    if (
      row.namespace === "real_estate_field_rules" &&
      !keys.has(
        "real_estate_attribute_definitions:" +
          row.marketCode +
          ":" +
          row.values.field_id,
      )
    )
      fail("Champ référencé absent.");
    if (row.namespace === "course_subjects")
      for (const level of (row.values.public_payload as { levelIds?: string[] })
        ?.levelIds ?? [])
        if (!keys.has("course_subject_levels:" + row.marketCode + ":" + level))
          fail("Niveau de cours absent dans ce marché.");
  }
  return issues;
}
