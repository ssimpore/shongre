import { TaxonomyServiceContract } from "../../contracts/taxonomy.contract";
import { httpClient } from "./http-client";
import { Category } from "../../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../../domains/taxonomy/taxonomy.types";

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
}

export const httpTaxonomyService = new HttpTaxonomyService();
