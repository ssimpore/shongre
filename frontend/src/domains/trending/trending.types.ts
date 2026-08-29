import type { Listing } from "../../types";
import type { HomepageSelectionMode } from "@shongre/contracts/homepage";

export const TRENDING_ADMIN_CONSTRAINTS = {
  topicCount: { min: 1, max: 12, step: 1 },
  listingsPerTopic: { min: 4, max: 8, step: 1 },
  minimumActivity: { min: 0, max: 1, step: 0.01 },
  displayPeriodDays: { min: 1, max: 30, step: 1 },
  cacheTtlMinutes: { min: 5, max: 120, step: 1 },
  editorialBoost: { min: 0, max: 1, step: 0.05 },
  sortOrder: { min: 0, max: 1_000, step: 1 },
  publicTitle: { maxLength: 120 },
  publicSubtitle: { maxLength: 240 },
} as const;

/** Central scoring policy used by the deterministic discovery engine. */
export const TRENDING_SCORE_POLICY = {
  normalized: { min: 0, max: 1, stable: 0.5 },
  growth: { min: -1, max: 1 },
  timeDecay: { defaultHalfLifeDays: 7, minimumHalfLifeDays: 0.5 },
  viewGrowthWeights: { supply: 0.35, demand: 0.65 },
  activityWeights: {
    activeListings: 0.35,
    views: 0.25,
    favorites: 0.2,
    contacts: 0.2,
  },
} as const;

export type TrendingTopicType =
  | "category"
  | "subcategory"
  | "collection"
  | "search_term"
  | "brand"
  | "location"
  | "seasonal"
  | "editorial";

export interface TrendingSignalSnapshot {
  activeListings: number;
  newlyPublished: number;
  views: number;
  uniqueViewers: number;
  searches: number;
  searchClicks: number;
  favorites: number;
  shares: number;
  contacts: number;
  offers: number;
  reservations: number;
  transactions: number;
  conversionRate: number;
  publicationVelocity: number;
  demandGrowth: number;
  supplyGrowth: number;
  priceActivity: number;
  lastActivityAt?: string;
  geographicRelevance: number;
  seasonalRelevance: number;
  editorialBoost: number;
}

export type TrendWeightKey =
  | "searchGrowth"
  | "viewGrowth"
  | "favorites"
  | "contacts"
  | "conversion"
  | "listingVelocity"
  | "locality"
  | "freshness"
  | "seasonality"
  | "editorial";

export type TrendWeights = Record<TrendWeightKey, number>;

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

export interface TrendingAdminConfig {
  enabled: boolean;
  selectionMode: HomepageSelectionMode;
  maxTopics: number;
  listingsPerTopic: number;
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

export interface TrendingPersonalizationContext {
  favoriteListingIds?: string[];
  recentCategorySlugs?: string[];
  recentSearchTerms?: string[];
}

export interface TrendingQuery {
  marketCode: string;
  country?: string;
  region?: string;
  city?: string;
  limit?: number;
  locale?: string;
  userId?: string;
  personalization?: TrendingPersonalizationContext;
  now?: Date;
}

export interface TrendingTopicCandidate {
  id: string;
  type: TrendingTopicType;
  key: string;
  title: string;
  subtitle?: string;
  href: string;
  parentKey?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  image?: { src: string; alt: string };
  signals: TrendingSignalSnapshot;
  listings: Listing[];
  personalizationScore?: number;
}

export interface TrendingTopic {
  id: string;
  type: TrendingTopicType;
  title: string;
  subtitle?: string;
  href: string;
  categorySlug?: string;
  subcategorySlug?: string;
  image?: { src: string; alt: string };
  listings: Listing[];
  badge?: string;
  trend: {
    /** Present only in private engine candidates; public adapters remove it. */
    score?: number;
    direction: "up" | "stable";
  };
}

export interface TrendingSectionResponse {
  enabled: boolean;
  generatedAt: string;
  expiresAt?: string;
  title: string;
  subtitle: string;
  topics: TrendingTopic[];
}
