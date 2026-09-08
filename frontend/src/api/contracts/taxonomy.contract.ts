import type { components } from "@shongre/contracts/openapi";
import { Category } from "../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../domains/taxonomy/taxonomy.types";
import type {
  MarketContext,
  ResolveTaxonomyV4PublicInput,
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationUpdate,
  TaxonomyV4OptionPage,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts";

export interface TaxonomyServiceContract {
  getAdminDraft(input: {
    resource?: components["schemas"]["TaxonomyAdminResource"];
    offset?: number;
    limit?: number;
    q?: string;
  }): Promise<components["schemas"]["TaxonomyDraftPage"]>;
  updateAdminDraft(
    input: components["schemas"]["TaxonomyDraftUpdate"],
  ): Promise<components["schemas"]["TaxonomyRevisionReview"]>;
  previewAdminDraft(): Promise<components["schemas"]["TaxonomyRevisionReview"]>;
  publishAdminDraft(
    input: components["schemas"]["TaxonomyRevisionAction"],
  ): Promise<components["schemas"]["TaxonomyRevisionReview"]>;
  rollbackAdminRevision(
    input: components["schemas"]["TaxonomyRevisionAction"],
  ): Promise<components["schemas"]["TaxonomyRevisionReview"]>;
  getAdminHistory(): Promise<components["schemas"]["TaxonomyRevisionHistory"]>;

  getRootCategories(): Promise<Category[]>;
  getNodeById(id: string): Promise<TaxonomyNode | null>;
  getNodeBySlug(slug: string): Promise<TaxonomyNode | null>;
  getChildren(nodeId: string): Promise<TaxonomyNode[]>;
  getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]>;
  resolveSearchFilters(
    nodeId?: string,
  ): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>>;
  getHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration>;
  getAdminHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration>;
  saveHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
  ): Promise<TaxonomyHeaderNavigationConfiguration>;
  getV4Tree(input: {
    marketContext: Pick<MarketContext, "countryCode">;
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse>;
  resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema>;
  lookupV4Options(input: {
    marketContext: MarketContext;
    optionSetId: string;
    taxonomyRevision?: number;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4OptionPage>;
}
