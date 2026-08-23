import {
  SearchResponse,
  SearchServiceContract,
} from "../../contracts/search.contract";
import { listingRepository } from "../../../repositories/listing.repository";
import { Listing, SearchFilters } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { runUnifiedDiscovery } from "@shongre/shared";
import { toDemoDiscoveryDocument } from "../../../domains/discovery/discovery.mapper";

const POPULAR_KEYWORDS = [
  "iPhone 15 Pro",
  "Vélo gravel",
  "Canapé convertible",
  "Peugeot 208",
  "PlayStation 5",
  "Table en chêne",
  "Appartement T3",
  "Veste Sézane",
];

function buildAttributeFacets(
  listings: Listing[],
): NonNullable<SearchResponse["facets"]> {
  const counts = new Map<string, Map<string, number>>();

  listings.forEach((listing) => {
    Object.entries(listing.attributes || {}).forEach(([code, rawValue]) => {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      values.forEach((value) => {
        if (value === undefined || value === null || typeof value === "object")
          return;
        const normalized = String(value);
        const facetCounts = counts.get(code) || new Map<string, number>();
        facetCounts.set(normalized, (facetCounts.get(normalized) || 0) + 1);
        counts.set(code, facetCounts);
      });
    });
  });

  return {
    attributes: Object.fromEntries(
      Array.from(counts.entries()).map(([code, values]) => [
        code,
        Array.from(values.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) =>
            a.value.localeCompare(b.value, "fr", { sensitivity: "base" }),
          ),
      ]),
    ),
  };
}

export class DemoSearchService implements SearchServiceContract {
  constructor(
    private readonly scenario:
      "default" | "empty_search" | "search_error" = "default",
  ) {}

  async search(params: SearchFilters): Promise<SearchResponse> {
    await simulateNetworkDelay();
    if (this.scenario === "search_error") {
      throw new Error("Deterministic demo search failure");
    }
    if (this.scenario === "empty_search") {
      return {
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
        facets: { attributes: {} },
      };
    }
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(50, params.limit || 24));
    const res = await listingRepository.getListings({
      ...params,
      sellerType: "all",
      sortBy: "date_desc",
      page: 1,
      limit: 500,
    });
    const ranked = runUnifiedDiscovery(
      res.listings.map(toDemoDiscoveryDocument),
      {
        requestId: `demo-search:${JSON.stringify(params)}`,
        marketCode: params.marketCode || "FR",
        query: params.query,
        categoryId: params.subCategorySlug || params.categorySlug,
        city: params.city,
        publisherType:
          params.sellerType === "individual"
            ? "private"
            : params.sellerType === "pro"
              ? "professional"
              : "all",
        sort:
          params.sortBy === "date_desc"
            ? "recent"
            : params.sortBy === "distance"
              ? "relevance"
              : params.sortBy,
        page,
        pageSize,
      },
    );
    const listingsById = new Map(
      res.listings.map((listing) => [listing.id, listing]),
    );
    const items = ranked.items.flatMap((item) => {
      const listing = listingsById.get(item.document.id);
      return listing ? [{ ...listing, discovery: item.presentation }] : [];
    });
    return {
      items,
      total: ranked.totalResults,
      page: ranked.page,
      totalPages: ranked.totalPages,
      facets: buildAttributeFacets(res.listings),
    };
  }

  async getPopularKeywords(): Promise<string[]> {
    await simulateNetworkDelay();
    return [...POPULAR_KEYWORDS];
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    await simulateNetworkDelay();
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    return POPULAR_KEYWORDS.filter((kw) => kw.toLowerCase().includes(q));
  }
}

export const demoSearchService = new DemoSearchService();
