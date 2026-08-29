/**
 * Compatibility projection over the generated taxonomy v4 public bundle.
 * Attribute definitions are authored in the backend normalized source; this
 * module only adapts them to the established Web domain interface.
 */
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import type { TaxonomyV4Attribute } from "@shongre/contracts/taxonomy";
import type { AttributeDataType, TaxonomyAttribute } from "./taxonomy.types";

const bundle = getTaxonomyV4PublicBundle();
const optionsBySet = new Map<string, TaxonomyAttribute["options"]>();

for (const optionSet of bundle.optionSets) {
  optionsBySet.set(
    optionSet.id,
    bundle.options
      .filter((option) => option.optionSetId === optionSet.id && option.active)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((option) => ({
        value: option.key,
        label: option.labels["fr-FR"],
        labels: option.labels,
      })),
  );
}

function publicationGroup(
  groupId: string,
): NonNullable<TaxonomyAttribute["publicationGroup"]> {
  if (groupId === "G_LEGAL" || groupId.includes("regulatory")) return "legal";
  if (
    groupId === "G_SURFACES" ||
    groupId === "grp.dimensions" ||
    groupId === "grp.property_specs"
  ) {
    return "dimensions";
  }
  if (
    groupId === "G_ENERGY" ||
    groupId === "grp.vehicle_technical" ||
    groupId === "grp.property_energy" ||
    groupId === "grp.energy_technical"
  ) {
    return "performance";
  }
  if (
    ["G_TECHNICAL", "G_EQUIPMENT", "G_CHARACT"].includes(groupId) ||
    /(characteristics|identity|history|equipment|compatibility|_specs)$/u.test(
      groupId,
    )
  ) {
    return "specifications";
  }
  return "general";
}

function compatibleDataType(attribute: TaxonomyV4Attribute): AttributeDataType {
  return attribute.dataType as AttributeDataType;
}

function adaptAttribute(attribute: TaxonomyV4Attribute): TaxonomyAttribute {
  const helpText = attribute.helpText["fr-FR"];
  const placeholder = attribute.placeholder["fr-FR"];
  return {
    id: attribute.id,
    code: attribute.code,
    label: attribute.labels["fr-FR"],
    labels: attribute.labels,
    helpText,
    dataType: compatibleDataType(attribute),
    unit: attribute.unit,
    fieldRole: attribute.defaultRequired ? "required" : "optional",
    privacy: attribute.privacy,
    sellerEligibility: {
      individualAllowed: attribute.sellerEligibility.individualAllowed,
      proAllowed: attribute.sellerEligibility.professionalAllowed,
    },
    required: attribute.defaultRequired,
    filterable: attribute.filterable,
    searchable: attribute.searchable,
    sortable: attribute.sortable,
    comparable: attribute.detailVisible,
    seoRelevant: attribute.seoRelevant,
    options: attribute.optionSetId
      ? optionsBySet.get(attribute.optionSetId)
      : undefined,
    validation: {
      min: attribute.validation.min,
      max: attribute.validation.max,
      placeholder,
      integer: attribute.dataType === "integer",
    },
    publicationGroup: publicationGroup(attribute.groupId),
    displayOrder: attribute.defaultDisplayOrder,
  };
}

export const ATTRIBUTE_REGISTRY: Record<string, TaxonomyAttribute> =
  Object.fromEntries(
    bundle.attributes.map((attribute) => [
      attribute.id,
      adaptAttribute(attribute),
    ]),
  );
