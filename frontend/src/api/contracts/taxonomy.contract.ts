import type { components } from "@shongre/contracts/openapi";
import { Category } from "../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../domains/taxonomy/taxonomy.types";
import type {
  MarketContext,
  ResolveTaxonomyV1PublicInput,
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationUpdate,
  TaxonomyV1OptionPage,
  TaxonomyV1ResolvedSchema,
  TaxonomyV1TreeResponse,
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
  getV1Tree(input: {
    marketContext: Pick<MarketContext, "countryCode">;
    locale: string;
    taxonomyVersion?: string;
    /**
     * Ask for one node instead of the catalogue.
     *
     * The unprojected snapshot is 735 KiB. Callers that resolve a single
     * category — the search page's SEO policy is the only one — pass its id,
     * slug or alias and receive roughly 2 KiB.
     */
    category?: string;
    /** Deepest level to keep, where 0 is the root categories on their own. */
    maxLevel?: number;
  }): Promise<TaxonomyV1TreeResponse>;
  resolveV1(
    input: ResolveTaxonomyV1PublicInput,
  ): Promise<TaxonomyV1ResolvedSchema>;
  lookupV1Options(input: {
    marketContext: MarketContext;
    optionSetId: string;
    taxonomyRevision?: number;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV1OptionPage>;
}
