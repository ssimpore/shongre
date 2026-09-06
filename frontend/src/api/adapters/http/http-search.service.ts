import {
  SearchResponse,
  SearchServiceContract,
  MarketScopedSearchFilters,
} from "../../contracts/search.contract";
import { httpClient } from "./http-client";
import { mapBackendListing } from "./http-listings.service";
import type { operations } from "@shongre/contracts/openapi";

type BackendSearchResponse =
  operations["postListingsSearch"]["responses"][200]["content"]["application/json"];

export class HttpSearchService implements SearchServiceContract {
  async search(params: MarketScopedSearchFilters): Promise<SearchResponse> {
    const result = await httpClient.post<BackendSearchResponse>(
      "/listings/search",
      params,
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
