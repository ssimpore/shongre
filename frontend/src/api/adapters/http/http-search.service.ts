import { SearchServiceContract } from '../../contracts/search.contract';
import { httpClient } from './http-client';
import { Listing, SearchFilters } from '../../../types';

export class HttpSearchService implements SearchServiceContract {
  async search(params: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }> {
    return httpClient.post<{ items: Listing[]; total: number; page: number; totalPages: number }>('/listings/search', params);
  }

  async getPopularKeywords(): Promise<string[]> {
    return ['Vélo gravel', 'iPhone 15 Pro', 'Canapé Togo', 'Montre Seiko', 'PlayStation 5', 'Appartement Paris'];
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    const popular = await this.getPopularKeywords();
    if (!query) return popular;
    return popular.filter((k) => k.toLowerCase().includes(query.toLowerCase()));
  }
}

export const httpSearchService = new HttpSearchService();
