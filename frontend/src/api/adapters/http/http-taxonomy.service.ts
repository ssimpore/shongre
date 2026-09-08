import { TaxonomyServiceContract } from "../../contracts/taxonomy.contract";
import { apiOperation } from "./generated-api-operation";
import { Category } from "../../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../../domains/taxonomy/taxonomy.types";
import type { MarketContext } from "@shongre/contracts/market-country";
import type { ResolveTaxonomyV4PublicInput } from "@shongre/contracts/taxonomy-v4-resolver";
import type {
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationUpdate,
  TaxonomyV4OptionPage,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts/taxonomy";
import type { components } from "@shongre/contracts/openapi";

type BackendCategory = components["schemas"]["TaxonomyLegacyCategory"];

function mapBackendCategory(category: BackendCategory): Category {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    label: category.name,
    shortLabel: category.shortLabel,
    iconName: category.iconName ?? "Package",
    description: category.name,
    subCategories: (category.subcategories ?? []).map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      label: child.name,
      shortLabel: child.shortLabel,
      parentSlug: category.slug,
      iconName: child.iconName,
      attributesSchema: [],
    })),
  };
}

export class HttpTaxonomyService implements TaxonomyServiceContract {
  private marketHeaders(marketContext: Pick<MarketContext, "countryCode">) {
    return {
      "X-Shongre-Market": marketContext.countryCode ?? "",
    };
  }

  async getRootCategories(): Promise<Category[]> {
    const categories = await apiOperation<BackendCategory[], "getTaxonomyRoot">(
      "getTaxonomyRoot",
      {},
    );
    return categories.map(mapBackendCategory);
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    return apiOperation<TaxonomyNode, "getTaxonomyNodesById">(
      "getTaxonomyNodesById",
      { path: { id: id } },
    );
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    return apiOperation<TaxonomyNode, "getTaxonomySlugBySlug">(
      "getTaxonomySlugBySlug",
      { path: { slug: slug } },
    );
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    return apiOperation<TaxonomyNode[], "getTaxonomyNodesByIdChildren">(
      "getTaxonomyNodesByIdChildren",
      { path: { id: nodeId } },
    );
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    return apiOperation<TaxonomyAttribute[], "getTaxonomyNodesByIdAttributes">(
      "getTaxonomyNodesByIdAttributes",
      { path: { id: categoryId } },
    );
  }

  async resolveSearchFilters(
    nodeId?: string,
  ): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>> {
    return apiOperation<
      Array<{ attribute: TaxonomyAttribute; facetType: string }>,
      "getTaxonomySearchFilters"
    >("getTaxonomySearchFilters", { query: { nodeId } });
  }

  async getHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    return apiOperation<
      TaxonomyHeaderNavigationConfiguration,
      "getTaxonomyHeaderNavigation"
    >("getTaxonomyHeaderNavigation", {
      headers: this.marketHeaders(marketContext),
    });
  }

  async getAdminHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    return apiOperation<
      TaxonomyHeaderNavigationConfiguration,
      "getAdminTaxonomyHeaderNavigation"
    >("getAdminTaxonomyHeaderNavigation", {
      headers: this.marketHeaders(marketContext),
    });
  }

  async saveHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    return apiOperation<
      TaxonomyHeaderNavigationConfiguration,
      "putAdminTaxonomyHeaderNavigation"
    >("putAdminTaxonomyHeaderNavigation", {
      body: input,
      headers: { "X-Shongre-Market": input.marketCode },
    });
  }

  async getV4Tree(input: {
    marketContext: Pick<MarketContext, "countryCode">;
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse> {
    return apiOperation<TaxonomyV4TreeResponse, "getTaxonomyV4Tree">(
      "getTaxonomyV4Tree",
      {
        query: {
          locale: input.locale,
          version: input.taxonomyVersion,
        },
        headers: this.marketHeaders(input.marketContext),
      },
    );
  }

  async resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    return apiOperation<
      TaxonomyV4ResolvedSchema,
      "resolveTaxonomyV4PublicationSchema"
    >("resolveTaxonomyV4PublicationSchema", {
      query: {
        category: input.categoryIdentity,
        listingTypeId: input.listingTypeId,
        intent: input.intent,
        sellerType: input.sellerType,
        locale: input.locale,
        version: input.taxonomyVersion,
      },
      headers: this.marketHeaders(input.marketContext),
    });
  }

  async lookupV4Options(input: {
    marketContext: MarketContext;
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4OptionPage> {
    return apiOperation<TaxonomyV4OptionPage, "getTaxonomyV4Options">(
      "getTaxonomyV4Options",
      {
        path: { optionSetId: input.optionSetId },
        query: {
          parentOptionId: input.parentOptionId,
          q: input.query,
          cursor: input.cursor,
          limit: input.limit,
          locale: input.locale,
          version: input.taxonomyVersion,
        },
        headers: this.marketHeaders(input.marketContext),
      },
    );
  }
}

export const httpTaxonomyService = new HttpTaxonomyService();
