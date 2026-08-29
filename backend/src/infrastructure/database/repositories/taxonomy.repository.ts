import type { TaxonomyAttribute as ContractTaxonomyAttribute } from "@shongre/contracts/taxonomy";
import type { Category } from "../../../shared/types/index.js";
import { TAXONOMY_V4_PRIVATE_BUNDLE } from "../../../modules/taxonomy/generated/taxonomy-v4.private.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

/** Shared taxonomy field shape with legacy aliases retained for old adapters. */
export type TaxonomyAttribute = ContractTaxonomyAttribute & {
  name?: string;
  type?: ContractTaxonomyAttribute["dataType"];
  defaultValue?: unknown;
};

export interface TaxonomyNode {
  id: string;
  code: string;
  slug: string;
  name: string;
  labels: Record<string, string>;
  shortLabel?: string;
  parentId?: string | null;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  level: "category" | "subcategory" | "type";
  publishable: boolean;
  listingFamily: string;
  supportedIntents: string[];
  attributes?: TaxonomyAttribute[];
  children?: TaxonomyNode[];
}

const bundle = TAXONOMY_V4_PRIVATE_BUNDLE;
const categoriesById = new Map(
  bundle.categories.map((category) => [category.id, category]),
);
const publicGroupIds = new Set(
  bundle.attributeGroups
    .filter((group) => group.public)
    .map((group) => group.id),
);
const publicAttributesById = new Map(
  bundle.attributes
    .filter(
      (attribute) =>
        publicGroupIds.has(attribute.groupId) && attribute.privacy === "public",
    )
    .map((attribute) => [attribute.id, attribute]),
);
const aliases = new Map(
  bundle.aliases.map((alias) => [alias.alias, alias.canonicalCategoryId]),
);

function canonicalCategoryId(identity: string): string {
  if (categoriesById.has(identity)) return identity;
  const normalized = identity.trim().toLocaleLowerCase("fr-FR");
  const direct = bundle.categories.find(
    (category) =>
      category.slug === normalized || category.sourceKey === identity,
  );
  return direct?.id ?? aliases.get(normalized) ?? identity;
}

function rootIdFor(categoryId: string): string {
  let current = categoriesById.get(categoryId);
  while (current?.parentId) current = categoriesById.get(current.parentId);
  return current?.id ?? categoryId;
}

function listingFamilyFor(categoryId: string): string {
  const rootId = rootIdFor(categoryId);
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

function categoryToTaxonomyNode(
  category: (typeof bundle.categories)[number],
): TaxonomyNode {
  return {
    id: category.id,
    code: category.sourceKey,
    slug: category.slug,
    name: category.labels["fr-FR"],
    labels: category.labels,
    shortLabel: category.labels["fr-FR"],
    parentId: category.parentId,
    iconName: category.iconName,
    sortOrder: category.sortOrder,
    isActive: category.status === "active",
    level:
      category.level === 0
        ? "category"
        : category.level === 1
          ? "subcategory"
          : "type",
    publishable: category.publishable,
    listingFamily: listingFamilyFor(category.id),
    supportedIntents: [
      ...new Set(
        bundle.listingTypes
          .filter((listingType) => listingType.categoryId === category.id)
          .map((listingType) => listingType.intent),
      ),
    ],
  };
}

function categoryToLegacyCategory(
  category: (typeof bundle.categories)[number],
): Category {
  const children = bundle.categories
    .filter((candidate) => candidate.parentId === category.id)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(categoryToLegacyCategory);
  return {
    id: category.id,
    slug: category.slug,
    name: category.labels["fr-FR"],
    shortLabel: category.labels["fr-FR"],
    parentId: category.parentId,
    iconName: category.iconName,
    sortOrder: category.sortOrder,
    isActive: category.status === "active",
    subcategories: children.length > 0 ? children : undefined,
  };
}

function publicAttributesForCategory(
  categoryIdentity: string,
): TaxonomyAttribute[] {
  const categoryId = canonicalCategoryId(categoryIdentity);
  const defaultListingType = bundle.listingTypes
    .filter(
      (listingType) =>
        listingType.categoryId === categoryId &&
        listingType.status === "active" &&
        listingType.sellerEligibility.individualAllowed,
    )
    .sort((left, right) => {
      const intentOrder = ["SELL", "SERVICE_OFFER", "JOB_OFFER", "BOOK"];
      const leftOrder = intentOrder.indexOf(left.intent);
      const rightOrder = intentOrder.indexOf(right.intent);
      return (
        (leftOrder === -1 ? intentOrder.length : leftOrder) -
          (rightOrder === -1 ? intentOrder.length : rightOrder) ||
        left.id.localeCompare(right.id)
      );
    })[0];
  const bindings = bundle.bindings
    .filter(
      (binding) =>
        binding.categoryId === categoryId &&
        (!defaultListingType ||
          binding.listingTypeId === defaultListingType.id) &&
        binding.publicationVisible &&
        binding.sellerEligibility.individualAllowed &&
        publicAttributesById.has(binding.attributeId) &&
        publicAttributesById.get(binding.attributeId)?.sellerEligibility
          .individualAllowed,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const bindingByAttributeId = new Map(
    bindings.map((binding) => [binding.attributeId, binding]),
  );
  const attributeIds = [
    ...new Set(bindings.map((binding) => binding.attributeId)),
  ];
  return attributeIds.flatMap((attributeId) => {
    const attribute = publicAttributesById.get(attributeId);
    if (!attribute) return [];
    const options = attribute.optionSetId
      ? bundle.options
          .filter(
            (option) =>
              option.optionSetId === attribute.optionSetId && option.active,
          )
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((option) => ({
            value: option.key,
            label: option.labels["fr-FR"],
            labels: option.labels,
          }))
      : undefined;
    return [
      {
        id: attribute.id,
        code: attribute.code,
        name: attribute.code,
        label: attribute.labels["fr-FR"],
        labels: attribute.labels,
        dataType: attribute.dataType,
        type: attribute.dataType,
        unit: attribute.unit,
        required: bindingByAttributeId.get(attribute.id)?.required ?? false,
        filterable: attribute.filterable,
        searchable: attribute.searchable,
        sortable: attribute.sortable,
        options,
        validation: {
          min: attribute.validation.min,
          max: attribute.validation.max,
        },
        displayOrder: attribute.defaultDisplayOrder,
        defaultValue: attribute.defaultValue,
        privacy: attribute.privacy,
      },
    ];
  });
}

function databaseRowToTaxonomyNode(row: any): TaxonomyNode {
  return {
    id: String(row.id),
    code: String(row.code || row.id).toUpperCase(),
    slug: String(row.slug),
    name: String(row.name),
    labels: (row.labels || { "fr-FR": row.name }) as Record<string, string>,
    shortLabel: row.short_label || undefined,
    parentId: row.parent_id || undefined,
    iconName: row.icon_name || "Package",
    sortOrder: row.sort_order || 0,
    isActive: Boolean(row.is_active),
    level: (row.level ||
      (row.parent_id ? "subcategory" : "category")) as TaxonomyNode["level"],
    publishable: Boolean(row.publishable),
    listingFamily: row.listing_family || listingFamilyFor(String(row.id)),
    supportedIntents: Array.isArray(row.supported_intents)
      ? row.supported_intents
      : bundle.listingTypes
          .filter((listingType) => listingType.categoryId === row.id)
          .map((listingType) => listingType.intent),
  };
}

export const CANONICAL_DEMO_CATEGORIES: Category[] = bundle.categories
  .filter((category) => !category.parentId && category.status === "active")
  .sort((left, right) => left.sortOrder - right.sortOrder)
  .map(categoryToLegacyCategory);

export interface ITaxonomyRepository {
  getRootCategories(): Promise<Category[]>;
  getNodeById(id: string): Promise<TaxonomyNode | null>;
  getNodeBySlug(slug: string): Promise<TaxonomyNode | null>;
  getChildren(nodeId: string): Promise<TaxonomyNode[]>;
  getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]>;
}

export class DemoTaxonomyRepository implements ITaxonomyRepository {
  async getRootCategories(): Promise<Category[]> {
    return CANONICAL_DEMO_CATEGORIES;
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    const category = categoriesById.get(canonicalCategoryId(id));
    return category ? categoryToTaxonomyNode(category) : null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    return this.getNodeById(slug);
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    const parentId = canonicalCategoryId(nodeId);
    return bundle.categories
      .filter((category) => category.parentId === parentId)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(categoryToTaxonomyNode);
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    return publicAttributesForCategory(categoryId);
  }
}

export class PostgresTaxonomyRepository implements ITaxonomyRepository {
  async getRootCategories(): Promise<Category[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error || !data) databaseFailure("taxonomy.getRootCategories", error);
      const roots = data.filter((category: any) => !category.parent_id);
      return roots.map((root: any) => {
        const children = data
          .filter((category: any) => category.parent_id === root.id)
          .map((child: any) => ({
            id: child.id,
            slug: child.slug,
            name: child.name,
            shortLabel: child.short_label || undefined,
            parentId: child.parent_id,
            iconName: child.icon_name || "Package",
            sortOrder: child.sort_order || 0,
            isActive: Boolean(child.is_active),
          }));
        return {
          id: root.id,
          slug: root.slug,
          name: root.name,
          shortLabel: root.short_label || undefined,
          iconName: root.icon_name || "Package",
          sortOrder: root.sort_order || 0,
          isActive: Boolean(root.is_active),
          subcategories: children.length > 0 ? children : undefined,
        };
      });
    } catch (error) {
      databaseFailure("taxonomy.getRootCategories", error);
    }
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.from("categories" as any) as any)
        .select("*")
        .eq("id", canonicalCategoryId(id))
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("taxonomy.getNodeById", error);
      }
      return data ? databaseRowToTaxonomyNode(data) : null;
    } catch (error) {
      databaseFailure("taxonomy.getNodeById", error);
    }
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    try {
      const mappedId = canonicalCategoryId(slug);
      if (categoriesById.has(mappedId)) return this.getNodeById(mappedId);
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.from("categories" as any) as any)
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("taxonomy.getNodeBySlug", error);
      }
      return data ? databaseRowToTaxonomyNode(data) : null;
    } catch (error) {
      databaseFailure("taxonomy.getNodeBySlug", error);
    }
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", canonicalCategoryId(nodeId))
        .order("sort_order", { ascending: true });
      if (error || !data) databaseFailure("taxonomy.getChildren", error);
      return data.map(databaseRowToTaxonomyNode);
    } catch (error) {
      databaseFailure("taxonomy.getChildren", error);
    }
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("category_attributes")
        .select("*")
        .eq("category_id", canonicalCategoryId(categoryId))
        .order("sort_order", { ascending: true });
      if (error || !data) {
        databaseFailure("taxonomy.getAttributesForCategory", error);
      }
      return data.map((attribute: any) => ({
        id: attribute.attribute_id || attribute.name,
        code: attribute.code || attribute.name,
        name: attribute.name,
        label: attribute.label,
        dataType: attribute.data_type || attribute.type || "text",
        type: attribute.data_type || attribute.type || "text",
        options: attribute.options || undefined,
        unit: attribute.unit || undefined,
        required: Boolean(attribute.is_required),
        filterable: Boolean(attribute.is_filterable),
        searchable: Boolean(attribute.is_searchable),
        sortable: Boolean(attribute.is_sortable),
        comparable: Boolean(attribute.is_comparable),
        publicationGroup: attribute.publication_group || undefined,
        displayOrder:
          attribute.display_order || attribute.sort_order || undefined,
      }));
    } catch (error) {
      databaseFailure("taxonomy.getAttributesForCategory", error);
    }
  }
}
