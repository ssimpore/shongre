import {
  SearchResponse,
  SearchServiceContract,
  MarketScopedSearchFilters,
} from "../../contracts/search.contract";
import { httpClient } from "./http-client";
import {
  mapBackendListing,
  type BackendListing,
} from "./http-listings.service";

export class HttpSearchService implements SearchServiceContract {
  async search(params: MarketScopedSearchFilters): Promise<SearchResponse> {
    const result = await httpClient.post<
      Omit<SearchResponse, "items"> & { items: BackendListing[] }
    >("/listings/search", params);
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

  async getSearchSuggestions(query: string, marketCode: string): Promise<string[]> {
    const popular = await this.getPopularKeywords(marketCode);
    if (!query) return popular;
    return popular.filter((k) => k.toLowerCase().includes(query.toLowerCase()));
  }
}

export const httpSearchService = new HttpSearchService();
