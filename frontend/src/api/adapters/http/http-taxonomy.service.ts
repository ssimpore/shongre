import { TaxonomyServiceContract } from "../../contracts/taxonomy.contract";
import { httpClient } from "./http-client";
import { Category } from "../../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../../domains/taxonomy/taxonomy.types";
import type {
  MarketContext,
  ResolveTaxonomyV4PublicInput,
  TaxonomyV4OptionPage,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts";

export class HttpTaxonomyService implements TaxonomyServiceContract {
  async getRootCategories(): Promise<Category[]> {
    return httpClient.get<Category[]>("/taxonomy/root");
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    return httpClient.get<TaxonomyNode>(`/taxonomy/nodes/${id}`);
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    return httpClient.get<TaxonomyNode>(`/taxonomy/slug/${slug}`);
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    return httpClient.get<TaxonomyNode[]>(`/taxonomy/nodes/${nodeId}/children`);
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    return httpClient.get<TaxonomyAttribute[]>(
      `/taxonomy/nodes/${categoryId}/attributes`,
    );
  }

  async resolveSearchFilters(
    nodeId?: string,
  ): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>> {
    return httpClient.get<
      Array<{ attribute: TaxonomyAttribute; facetType: string }>
    >("/taxonomy/search-filters", {
      params: { nodeId },
    });
  }

  async getV4Tree(input: {
    marketContext: MarketContext;
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse> {
    return httpClient.get<TaxonomyV4TreeResponse>("/taxonomy/v4/tree", {
      headers: { "X-Shongre-Market": input.marketContext.countryCode ?? "" },
      params: {
        locale: input.locale,
        version: input.taxonomyVersion,
      },
    });
  }

  async resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    return httpClient.get<TaxonomyV4ResolvedSchema>("/taxonomy/v4/resolve", {
      headers: { "X-Shongre-Market": input.marketContext.countryCode ?? "" },
      params: {
        category: input.categoryIdentity,
        listingTypeId: input.listingTypeId,
        intent: input.intent,
        sellerType: input.sellerType,
        locale: input.locale,
        version: input.taxonomyVersion,
      },
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
    return httpClient.get<TaxonomyV4OptionPage>(
      `/taxonomy/v4/options/${encodeURIComponent(input.optionSetId)}`,
      {
        headers: { "X-Shongre-Market": input.marketContext.countryCode ?? "" },
        params: {
          parentOptionId: input.parentOptionId,
          q: input.query,
          cursor: input.cursor,
          limit: input.limit,
          locale: input.locale,
          version: input.taxonomyVersion,
        },
      },
    );
  }
}

export const httpTaxonomyService = new HttpTaxonomyService();
