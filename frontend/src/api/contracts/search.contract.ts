import { Listing, SearchFilters } from '../../types';

export interface SearchServiceContract {
  search(params: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }>;
  getPopularKeywords(): Promise<string[]>;
  getSearchSuggestions(query: string): Promise<string[]>;
}
