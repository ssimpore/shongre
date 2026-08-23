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

export interface SearchServiceContract {
  search(params: SearchFilters): Promise<SearchResponse>;
  getPopularKeywords(): Promise<string[]>;
  getSearchSuggestions(query: string): Promise<string[]>;
}
