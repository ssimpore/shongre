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
  /** Offered by the API only when the first page found nothing. */
  didYouMean?: string;
}

/** One entry of the search field's completion list, as the API ranks it. */
export type SearchSuggestion =
  | {
      kind: "term";
      /** The complete query to run: what was typed, completed. */
      query: string;
      label: string;
      listingCount: number;
    }
  | {
      kind: "category";
      categoryId: string;
      categorySlug: string;
      label: string;
      parentLabel?: string;
      parentSlug?: string;
      iconName?: string;
    };

export type MarketScopedSearchFilters = SearchFilters & { marketCode: string };

export interface SearchServiceContract {
  search(
    params: MarketScopedSearchFilters,
    options?: { signal?: AbortSignal },
  ): Promise<SearchResponse>;
  getPopularKeywords(marketCode: string): Promise<string[]>;
  getSearchSuggestions(
    query: string,
    marketCode: string,
    options?: { locale?: string; signal?: AbortSignal },
  ): Promise<SearchSuggestion[]>;
}
