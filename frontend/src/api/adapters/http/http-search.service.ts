import {
  SearchResponse,
  SearchServiceContract,
  MarketScopedSearchFilters,
} from "../../contracts/search.contract";
import { apiOperation } from "./generated-api-operation";
import { mapBackendListing } from "./http-listings.service";
import type { operations } from "@shongre/contracts/openapi";
import {
  canonicalSearchGetParams,
  encodedSearchQueryLength,
  normalizeSearchFilters,
} from "../../search/normalized-search";

type BackendSearchResponse =
  operations["getListingsSearch"]["responses"][200]["content"]["application/json"];

const MAX_CACHEABLE_SEARCH_QUERY_LENGTH = 1_800;

export class HttpSearchService implements SearchServiceContract {
  async search(
    params: MarketScopedSearchFilters,
    options?: { signal?: AbortSignal },
  ): Promise<SearchResponse> {
    const normalized = normalizeSearchFilters(params);
    const getParams = canonicalSearchGetParams(normalized);
    // Public discovery is intentionally anonymous. Omitting credentials keeps
    // cookie-bearing sessions out of shared caches while allowing this public
    // projection to benefit from CDN caching.
    const requestOptions = {
      signal: options?.signal,
      credentials: "omit" as const,
    };
    const result =
      encodedSearchQueryLength(getParams) <= MAX_CACHEABLE_SEARCH_QUERY_LENGTH
        ? await apiOperation<BackendSearchResponse, "getListingsSearch">(
            "getListingsSearch",
            {
              ...requestOptions,
              query: getParams,
            },
          )
        : await apiOperation<BackendSearchResponse, "postListingsSearch">(
            "postListingsSearch",
            {
              ...requestOptions,
              body: normalized,
            },
          );
    return { ...result, items: result.items.map(mapBackendListing) };
  }

  async getPopularKeywords(marketCode: string): Promise<string[]> {
    const response = await this.search({
      marketCode,
      sortBy: "relevance",
      limit: 8,
    });
    return Array.from(
      new Set(response.items.map((listing) => listing.title.trim())),
    ).filter(Boolean);
  }

  async getSearchSuggestions(
    query: string,
    marketCode: string,
  ): Promise<string[]> {
    if (!query.trim()) return this.getPopularKeywords(marketCode);
    const response = await this.search({
      marketCode,
      query: query.trim(),
      sortBy: "relevance",
      limit: 8,
    });
    return Array.from(
      new Set(response.items.map((listing) => listing.title.trim())),
    ).filter(Boolean);
  }
}

export const httpSearchService = new HttpSearchService();
