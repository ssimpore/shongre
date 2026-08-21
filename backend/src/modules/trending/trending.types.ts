import type { Listing } from '../../shared/types/index.js';

export type TrendingTopicType =
  | 'category'
  | 'subcategory'
  | 'collection'
  | 'search_term'
  | 'brand'
  | 'location'
  | 'seasonal'
  | 'editorial';

export interface TrendWeights {
  searchGrowth: number;
  viewGrowth: number;
  favorites: number;
  contacts: number;
  conversion: number;
  listingVelocity: number;
  locality: number;
  freshness: number;
  seasonality: number;
  editorial: number;
}

export interface TrendingAdminConfig {
  enabled: boolean;
  maxTopics: number;
  minTopics: number;
  maxTopicsPerParentCategory: number;
  minimumActivity: number;
  displayPeriodDays: number;
  cacheTtlMinutes: number;
  personalizationWeight: number;
  title: string;
  subtitle: string;
  mobileVisible: boolean;
  desktopVisible: boolean;
  excludedCategories: string[];
  excludedTopics: string[];
  weights: TrendWeights;
  overrides: TrendingTopicOverride[];
  updatedAt: string;
}

export interface TrendingTopicOverride {
  topicKey: string;
  topicType?: TrendingTopicType;
  isPinned?: boolean;
  isHidden?: boolean;
  boostScore?: number;
  customTitle?: string;
  customSubtitle?: string;
  customImage?: { src: string; alt: string };
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
  marketCode?: string;
  region?: string;
  city?: string;
}

export interface TrendingQuery {
  marketCode: string;
  region?: string;
  city?: string;
  limit?: number;
}

export interface TrendingTopic {
  id: string;
  type: TrendingTopicType;
  title: string;
  subtitle?: string;
  href: string;
  categorySlug?: string;
  image?: { src: string; alt: string };
  listings: Listing[];
  badge?: string;
  trend: { score: number; direction: 'up' | 'stable' };
}

export interface TrendingSectionResponse {
  enabled: boolean;
  generatedAt: string;
  expiresAt?: string;
  title: string;
  subtitle: string;
  topics: TrendingTopic[];
}

export interface TrendingActivitySignals {
  views: number;
  uniqueViews: number;
  searches: number;
  searchClicks: number;
  favorites: number;
  shares: number;
  contacts: number;
  offers: number;
  reservations: number;
  transactions: number;
}

export interface TrendCandidateSignals {
  activeListings: number;
  newlyPublished: number;
  views: number;
  favorites: number;
  contacts: number;
  demandGrowth: number;
  supplyGrowth: number;
  conversionRate: number;
  publicationVelocity: number;
  geographicRelevance: number;
  seasonalRelevance: number;
  editorialBoost: number;
  lastActivityAt?: string;
}

export interface TrendCandidate {
  id: string;
  key: string;
  parentKey: string;
  title: string;
  href: string;
  image?: { src: string; alt: string };
  signals: TrendCandidateSignals;
  listings: Listing[];
  override?: TrendingTopicOverride;
}
