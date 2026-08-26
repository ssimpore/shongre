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
  facets?: {
    attributes: Record<string, SearchFacetValue[]>;
  };
}

export type MarketScopedSearchFilters = SearchFilters & { marketCode: string };

export interface SearchServiceContract {
  search(params: MarketScopedSearchFilters): Promise<SearchResponse>;
  getPopularKeywords(marketCode: string): Promise<string[]>;
  getSearchSuggestions(query: string, marketCode: string): Promise<string[]>;
}
