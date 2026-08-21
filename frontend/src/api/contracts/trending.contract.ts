import type { TrendingAdminConfig, TrendingQuery, TrendingSectionResponse, TrendingTopicOverride } from '../../domains/trending/trending.types';

export interface TrendingServiceContract {
  getTrending(query: TrendingQuery): Promise<TrendingSectionResponse>;
}

export interface TrendingAdminServiceContract {
  getTrendingConfig(): Promise<TrendingAdminConfig>;
  updateTrendingConfig(updates: Partial<TrendingAdminConfig>): Promise<TrendingAdminConfig>;
  upsertTrendingOverride(override: TrendingTopicOverride): Promise<TrendingAdminConfig>;
}

