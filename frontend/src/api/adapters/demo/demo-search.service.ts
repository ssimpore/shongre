import { SearchServiceContract } from '../../contracts/search.contract';
import { listingRepository } from '../../../repositories/listing.repository';
import { Listing, SearchFilters } from '../../../types';
import { simulateNetworkDelay } from '../../client/api-client.config';

const POPULAR_KEYWORDS = [
  'iPhone 15 Pro',
  'Vélo gravel',
  'Canapé convertible',
  'Peugeot 208',
  'PlayStation 5',
  'Table en chêne',
  'Appartement T3',
  'Veste Sézane',
];

export class DemoSearchService implements SearchServiceContract {
  async search(params: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }> {
    await simulateNetworkDelay();
    const res = await listingRepository.getListings(params);
    return {
      items: res.listings,
      total: res.total,
      page: res.page,
      totalPages: res.totalPages,
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
