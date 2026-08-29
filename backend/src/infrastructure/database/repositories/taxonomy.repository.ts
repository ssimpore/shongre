import type {
  TaxonomyAttribute as ContractTaxonomyAttribute,
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationUpdate,
} from "@shongre/contracts/taxonomy";
import type { Category } from "../../../shared/types/index.js";
import { TAXONOMY_V4_PRIVATE_BUNDLE } from "../../../modules/taxonomy/generated/taxonomy-v4.private.js";
import { AppError } from "../../../shared/errors/app-error.js";
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
  shortLabels?: Record<string, string>;
  shortLabel?: string;
  parentId?: string | null;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  status: "active" | "draft" | "disabled" | "deprecated" | "archived";
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
const DEFAULT_HEADER_CATEGORY_IDS = [
  "real_estate",
  "vehicles",
  "professional_equipment",
  "jobs",
  "fashion",
  "home_garden",
  "baby_family",
  "electronics",
  "leisure_culture",
  "education",
] as const;

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
    shortLabels: category.shortLabels,
    shortLabel: category.shortLabels["fr-FR"],
    parentId: category.parentId,
    iconName: category.iconName,
    sortOrder: category.sortOrder,
    isActive: category.status === "active",
    status: category.status,
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

function categoryToHeaderItem(
  category: (typeof bundle.categories)[number],
  isActive: boolean,
  displayOrder: number,
): TaxonomyHeaderNavigationConfiguration["items"][number] {
  return {
    categoryId: category.id,
    slug: category.slug,
    labels: category.labels,
    shortLabels: category.shortLabels,
    iconName: category.iconName,
    isActive,
    displayOrder,
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
    shortLabel: category.shortLabels["fr-FR"],
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
    shortLabels: (row.short_labels || {}) as Record<string, string>,
    shortLabel:
      row.short_labels?.["fr-FR"] || row.short_label || row.name || undefined,
    parentId: row.parent_id || undefined,
    iconName: row.icon_name || "Package",
    sortOrder: row.sort_order || 0,
    isActive: Boolean(row.is_active),
    status: (row.status ||
      (row.is_active ? "active" : "disabled")) as TaxonomyNode["status"],
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
  getHeaderNavigation(
    marketCode: string,
    includeInactive: boolean,
  ): Promise<TaxonomyHeaderNavigationConfiguration>;
  replaceHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
    actorProfileId: string,
    requestId?: string,
  ): Promise<number>;
}

export class DemoTaxonomyRepository implements ITaxonomyRepository {
  private readonly headerNavigationByMarket = new Map<
    string,
    TaxonomyHeaderNavigationConfiguration
  >(
    ["FR", "BE", "CH"].map((marketCode) => [
      marketCode,
      {
        marketCode,
        revision: 1,
        updatedAt: "2026-08-01T08:00:00.000Z",
        items: DEFAULT_HEADER_CATEGORY_IDS.flatMap(
          (categoryId, displayOrder) => {
            const category = categoriesById.get(categoryId);
            return category
              ? [categoryToHeaderItem(category, true, displayOrder)]
              : [];
          },
        ),
      },
    ]),
  );

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

  async getHeaderNavigation(
    marketCode: string,
    includeInactive: boolean,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    const stored = this.headerNavigationByMarket.get(marketCode) ?? {
      marketCode,
      revision: 0,
      updatedAt: null,
      items: [],
    };
    const items = stored.items.filter((item) => {
      if (includeInactive) return true;
      const category = categoriesById.get(item.categoryId);
      const availability = category?.marketAvailability.find(
        (entry) => entry.marketCode === marketCode,
      );
      return (
        item.isActive &&
        category?.status === "active" &&
        availability?.marketplaceEnabled === true
      );
    });
    return structuredClone({ ...stored, items });
  }

  async replaceHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
  ): Promise<number> {
    const current = this.headerNavigationByMarket.get(input.marketCode);
    if ((current?.revision ?? 0) !== input.expectedRevision) {
      throw new Error("Taxonomy header configuration revision conflict.");
    }
    input.items.forEach((item) => {
      const category = categoriesById.get(item.categoryId);
      const availability = category?.marketAvailability.find(
        (entry) => entry.marketCode === input.marketCode,
      );
      if (!category || category.parentId) {
        throw new Error(
          "Only existing root taxonomy categories may appear in the header.",
        );
      }
      if (
        item.isActive &&
        (category.status !== "active" || !availability?.marketplaceEnabled)
      ) {
        throw new Error(
          "Active header categories must be enabled in the selected market.",
        );
      }
    });
    const revision = input.expectedRevision + 1;
    const items = input.items.flatMap((item) => {
      const category = categoriesById.get(item.categoryId);
      return category
        ? [categoryToHeaderItem(category, item.isActive, item.displayOrder)]
        : [];
    });
    this.headerNavigationByMarket.set(input.marketCode, {
      marketCode: input.marketCode,
      revision,
      updatedAt: new Date().toISOString(),
      items,
    });
    return revision;
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
            shortLabel:
              child.short_labels?.["fr-FR"] ||
              child.short_label ||
              child.name ||
              undefined,
            parentId: child.parent_id,
            iconName: child.icon_name || "Package",
            sortOrder: child.sort_order || 0,
            isActive: Boolean(child.is_active),
          }));
        return {
          id: root.id,
          slug: root.slug,
          name: root.name,
          shortLabel:
            root.short_labels?.["fr-FR"] ||
            root.short_label ||
            root.name ||
            undefined,
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

  async getHeaderNavigation(
    marketCode: string,
    includeInactive: boolean,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    try {
      const supabase = getSupabaseAdminClient();
      const [configurationResult, itemResult] = await Promise.all([
        (supabase.from("taxonomy_header_configurations" as any) as any)
          .select("revision,updated_at")
          .eq("market_code", marketCode)
          .maybeSingle(),
        (supabase.from("taxonomy_header_categories" as any) as any)
          .select("category_id,is_active,display_order")
          .eq("market_code", marketCode)
          .order("display_order", { ascending: true }),
      ]);
      if (configurationResult.error) {
        databaseFailure(
          "taxonomy.getHeaderNavigation.configuration",
          configurationResult.error,
        );
      }
      if (itemResult.error) {
        databaseFailure("taxonomy.getHeaderNavigation.items", itemResult.error);
      }

      const storedItems = (itemResult.data ?? []) as Array<{
        category_id: string;
        is_active: boolean;
        display_order: number;
      }>;
      if (storedItems.length === 0) {
        return {
          marketCode,
          revision: Number(configurationResult.data?.revision ?? 0),
          updatedAt: configurationResult.data?.updated_at ?? null,
          items: [],
        };
      }

      const categoryIds = storedItems.map((item) => item.category_id);
      const [categoryResult, availabilityResult] = await Promise.all([
        (supabase.from("categories" as any) as any)
          .select(
            "id,slug,name,short_label,labels,short_labels,icon_name,status,is_active,parent_id",
          )
          .in("id", categoryIds),
        (supabase.from("taxonomy_market_availability" as any) as any)
          .select("category_id,marketplace_enabled")
          .eq("market_code", marketCode)
          .in("category_id", categoryIds),
      ]);
      if (categoryResult.error) {
        databaseFailure(
          "taxonomy.getHeaderNavigation.categories",
          categoryResult.error,
        );
      }
      if (availabilityResult.error) {
        databaseFailure(
          "taxonomy.getHeaderNavigation.availability",
          availabilityResult.error,
        );
      }

      const categoryRows = new Map<string, any>(
        (categoryResult.data ?? []).map((category: any) => [
          String(category.id),
          category,
        ]),
      );
      const availableCategoryIds = new Set(
        (availabilityResult.data ?? [])
          .filter((availability: any) => availability.marketplace_enabled)
          .map((availability: any) => String(availability.category_id)),
      );
      const items = storedItems.flatMap((item) => {
        const category = categoryRows.get(item.category_id);
        if (!category || category.parent_id) return [];
        if (
          !includeInactive &&
          (!item.is_active ||
            category.status !== "active" ||
            !category.is_active ||
            !availableCategoryIds.has(item.category_id))
        ) {
          return [];
        }
        const labels = {
          ...(category.labels || {}),
          "fr-FR": category.labels?.["fr-FR"] || category.name,
        } as Record<string, string>;
        const shortLabels = {
          ...(category.short_labels || {}),
          "fr-FR":
            category.short_labels?.["fr-FR"] ||
            category.short_label ||
            category.name,
        } as Record<string, string>;
        return [
          {
            categoryId: item.category_id,
            slug: String(category.slug),
            labels,
            shortLabels,
            iconName: String(category.icon_name || "Package"),
            isActive: item.is_active,
            displayOrder: item.display_order,
          },
        ];
      });

      return {
        marketCode,
        revision: Number(configurationResult.data?.revision ?? 0),
        updatedAt: configurationResult.data?.updated_at ?? null,
        items,
      };
    } catch (error) {
      databaseFailure("taxonomy.getHeaderNavigation", error);
    }
  }

  async replaceHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
    actorProfileId: string,
    requestId?: string,
  ): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.rpc as any)(
        "replace_taxonomy_header_categories",
        {
          p_market_code: input.marketCode,
          p_expected_revision: input.expectedRevision,
          p_items: input.items,
          p_actor_profile_id: actorProfileId,
          p_change_reason: input.changeReason,
          p_request_id: requestId ?? null,
        },
      );
      if (error?.code === "40001") {
        throw new AppError({
          code: "CONFLICT",
          statusCode: 409,
          message:
            "La configuration de la barre de catégories a été modifiée. Rechargez-la avant de réessayer.",
          originalError: error,
        });
      }
      if (error || typeof data !== "number") {
        databaseFailure("taxonomy.replaceHeaderNavigation", error);
      }
      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      databaseFailure("taxonomy.replaceHeaderNavigation", error);
    }
  }
}
