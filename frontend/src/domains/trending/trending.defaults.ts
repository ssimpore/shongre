import type { TrendingAdminConfig, TrendWeights } from "./trending.types";

export const DEFAULT_TREND_WEIGHTS: TrendWeights = {
  searchGrowth: 0.18,
  viewGrowth: 0.12,
  favorites: 0.12,
  contacts: 0.12,
  conversion: 0.1,
  listingVelocity: 0.09,
  locality: 0.07,
  freshness: 0.08,
  seasonality: 0.05,
  editorial: 0.07,
};

export const DEFAULT_TRENDING_ADMIN_CONFIG: TrendingAdminConfig = {
  enabled: true,
  selectionMode: "hybrid",
  maxTopics: 4,
  listingsPerTopic: 8,
  minTopics: 4,
  maxTopicsPerParentCategory: 1,
  minimumActivity: 0.08,
  displayPeriodDays: 7,
  cacheTtlMinutes: 20,
  personalizationWeight: 0.22,
  title: "En ce moment sur Shongre",
  subtitle: "Découvrez ce qui attire le plus les acheteurs en ce moment.",
  mobileVisible: true,
  desktopVisible: true,
  excludedCategories: [],
  excludedTopics: [],
  weights: DEFAULT_TREND_WEIGHTS,
  overrides: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
};
