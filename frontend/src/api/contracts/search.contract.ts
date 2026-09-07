import { Listing, SearchFilters } from "../../types";

export interface SearchFacetValue {
  value: string;
  count: number;
}

export interface SearchResponse {
  items: Listing[];
  total: number;
  page: number;
  totalPages: number;
  totalRelation?: "exact" | "lower_bound";
  snapshotAt?: string;
  pageInfo?: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
  facets?: {
    attributes: Record<string, SearchFacetValue[]>;
  };
}

export type MarketScopedSearchFilters = SearchFilters & { marketCode: string };

export interface SearchServiceContract {
  search(
    params: MarketScopedSearchFilters,
    options?: { signal?: AbortSignal },
  ): Promise<SearchResponse>;
  getPopularKeywords(marketCode: string): Promise<string[]>;
  getSearchSuggestions(query: string, marketCode: string): Promise<string[]>;
}
