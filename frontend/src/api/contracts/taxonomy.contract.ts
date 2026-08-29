import { Category } from "../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../domains/taxonomy/taxonomy.types";
import type {
  MarketContext,
  ResolveTaxonomyV4PublicInput,
  TaxonomyV4OptionPage,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts";

export interface TaxonomyServiceContract {
  getRootCategories(): Promise<Category[]>;
  getNodeById(id: string): Promise<TaxonomyNode | null>;
  getNodeBySlug(slug: string): Promise<TaxonomyNode | null>;
  getChildren(nodeId: string): Promise<TaxonomyNode[]>;
  getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]>;
  resolveSearchFilters(
    nodeId?: string,
  ): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>>;
  getV4Tree(input: {
    marketContext: MarketContext;
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse>;
  resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema>;
  lookupV4Options(input: {
    marketContext: MarketContext;
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4OptionPage>;
}
