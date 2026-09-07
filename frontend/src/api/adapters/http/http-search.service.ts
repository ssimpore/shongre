import {
  SearchResponse,
  SearchServiceContract,
  MarketScopedSearchFilters,
} from "../../contracts/search.contract";
import { httpClient } from "./http-client";
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
    const requestOptions = {
      signal: options?.signal,
      // Public discovery is intentionally anonymous. Omitting credentials keeps
      // cookie-bearing sessions out of shared caches while allowing this public
      // projection to benefit from CDN caching.
      credentials: "omit" as const,
    };
    const result =
      encodedSearchQueryLength(getParams) <= MAX_CACHEABLE_SEARCH_QUERY_LENGTH
        ? await httpClient.get<BackendSearchResponse>("/listings/search", {
            ...requestOptions,
            params: getParams,
          })
        : await httpClient.post<BackendSearchResponse>(
            "/listings/search",
            normalized,
            requestOptions,
          );
    return { ...result, items: result.items.map(mapBackendListing) };
  }

  async getPopularKeywords(_marketCode: string): Promise<string[]> {
    return [
      "Vélo gravel",
      "iPhone 15 Pro",
      "Canapé Togo",
      "Montre Seiko",
      "PlayStation 5",
      "Appartement Paris",
    ];
  }

  async getSearchSuggestions(
    query: string,
    marketCode: string,
  ): Promise<string[]> {
    const popular = await this.getPopularKeywords(marketCode);
    if (!query) return popular;
    return popular.filter((k) => k.toLowerCase().includes(query.toLowerCase()));
  }
}

export const httpSearchService = new HttpSearchService();
