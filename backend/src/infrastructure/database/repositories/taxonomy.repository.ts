import type {
  TaxonomyAttribute as ContractTaxonomyAttribute,
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationUpdate,
} from "@shongre/contracts/taxonomy";
import { taxonomyHeaderNavigationLinkSchema } from "@shongre/contracts/taxonomy";
import type { Category } from "../../../shared/types/index.js";
import { config } from "../../../app/config/index.js";
import { createTaxonomyProjection } from "./taxonomy.projection.js";
import { taxonomyV4Service } from "../../../modules/taxonomy/taxonomy.runtime.js";
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

export class TestTaxonomyRepository implements ITaxonomyRepository {
  private instance?: Promise<ITaxonomyRepository>;
  private get() {
    if (config.environment.environment !== "test")
      throw new Error("Taxonomy fixtures are restricted to isolated tests.");
    return (this.instance ??= Promise.all([
      import("./taxonomy.test-repository.js"),
      import("../../../modules/taxonomy/generated/taxonomy-v4.private.js"),
    ]).then(
      ([{ createTestTaxonomyRepository }, { TAXONOMY_V4_PRIVATE_BUNDLE }]) =>
        createTestTaxonomyRepository(TAXONOMY_V4_PRIVATE_BUNDLE),
    ));
  }
  async getRootCategories() {
    return (await this.get()).getRootCategories();
  }
  async getNodeById(id: string) {
    return (await this.get()).getNodeById(id);
  }
  async getNodeBySlug(slug: string) {
    return (await this.get()).getNodeBySlug(slug);
  }
  async getChildren(id: string) {
    return (await this.get()).getChildren(id);
  }
  async getAttributesForCategory(id: string) {
    return (await this.get()).getAttributesForCategory(id);
  }
  async getHeaderNavigation(market: string, includeInactive: boolean) {
    return (await this.get()).getHeaderNavigation(market, includeInactive);
  }
  async replaceHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
    actor: string,
    requestId?: string,
  ) {
    return (await this.get()).replaceHeaderNavigation(input, actor, requestId);
  }
}

export class PostgresTaxonomyRepository implements ITaxonomyRepository {
  private async projection() {
    return createTaxonomyProjection(
      (await taxonomyV4Service.snapshot()).getBundle(),
    );
  }
  async getRootCategories() {
    return (await this.projection()).getRootCategories();
  }
  async getNodeById(id: string) {
    return (await this.projection()).getNode(id);
  }
  async getNodeBySlug(slug: string) {
    return (await this.projection()).getNode(slug);
  }
  async getChildren(id: string) {
    return (await this.projection()).getChildren(id);
  }
  async getAttributesForCategory(id: string) {
    return (await this.projection()).publicAttributesForCategory(id);
  }

  async getHeaderNavigation(
    marketCode: string,
    includeInactive: boolean,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    try {
      const supabase = getSupabaseAdminClient();
      const [configurationResult, itemResult, linkResult] = await Promise.all([
        (supabase.from("taxonomy_header_configurations" as any) as any)
          .select("revision,updated_at")
          .eq("market_code", marketCode)
          .maybeSingle(),
        (supabase.from("taxonomy_header_categories" as any) as any)
          .select("category_id,is_active,display_order")
          .eq("market_code", marketCode)
          .order("display_order", { ascending: true }),
        supabase
          .from("taxonomy_header_links")
          .select("target,labels,short_labels,is_active,display_order")
          .eq("market_code", marketCode)
          .order("display_order", { ascending: true }),
      ]);
      if (linkResult.error)
        databaseFailure("taxonomy.getHeaderNavigation.links", linkResult.error);
      const links = (linkResult.data ?? [])
        .filter((link) => includeInactive || link.is_active)
        .map((link) =>
          taxonomyHeaderNavigationLinkSchema.parse({
            target: link.target,
            labels: link.labels,
            shortLabels: link.short_labels,
            isActive: link.is_active,
            displayOrder: link.display_order,
          }),
        );
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
          links,
        };
      }

      const published = (await taxonomyV4Service.snapshot()).getBundle();
      const categoryRows = new Map(
        published.categories.map((category) => [category.id, category]),
      );
      const items = storedItems.flatMap((item) => {
        const category = categoryRows.get(item.category_id);
        if (!category || category.parentId) return [];
        if (
          !includeInactive &&
          (!item.is_active ||
            category.status !== "active" ||
            !category.marketAvailability.some(
              (market) =>
                market.marketCode === marketCode &&
                market.status === "active" &&
                market.marketplaceEnabled,
            ))
        ) {
          return [];
        }
        const labels = {
          ...(category.labels || {}),
          "fr-FR": category.labels["fr-FR"],
        } as Record<string, string>;
        const shortLabels = {
          ...(category.shortLabels || {}),
          "fr-FR": category.shortLabels?.["fr-FR"] || category.labels["fr-FR"],
        } as Record<string, string>;
        return [
          {
            categoryId: item.category_id,
            slug: String(category.slug),
            labels,
            shortLabels,
            iconName: String(category.iconName || "Package"),
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
        links,
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
      const { data, error } = await supabase.rpc(
        "replace_taxonomy_header_navigation",
        {
          p_market_code: input.marketCode,
          p_expected_revision: input.expectedRevision,
          p_items: input.items,
          p_actor_profile_id: actorProfileId,
          p_change_reason: input.changeReason,
          p_request_id: requestId,
          p_links: input.links,
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
