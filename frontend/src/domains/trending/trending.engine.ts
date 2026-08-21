import type {
  TrendingAdminConfig,
  TrendingSignalSnapshot,
  TrendingTopic,
  TrendingTopicCandidate,
  TrendingTopicOverride,
  TrendWeightKey,
} from './trending.types';
import { DEFAULT_TREND_WEIGHTS } from './trending.defaults';

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

/** Returns a bounded percentage change. A new signal with no prior activity is full growth. */
export function calculateGrowth(recent: number, previous: number): number {
  if (recent <= 0 && previous <= 0) return 0;
  if (previous <= 0) return 1;
  return clamp((recent - previous) / previous, -1, 1);
}

/** Converts -100%..+100% growth to a 0..1 score where 0.5 means stable. */
export function growthScore(recent: number, previous: number): number {
  return clamp((calculateGrowth(recent, previous) + 1) / 2);
}

export function timeDecay(lastActivityAt: string | undefined, now: Date, halfLifeDays = 7): number {
  if (!lastActivityAt) return 0;
  const ageMs = Math.max(0, now.getTime() - new Date(lastActivityAt).getTime());
  return Math.exp(-ageMs / (Math.max(0.5, halfLifeDays) * DAY_MS));
}

/** Log normalization prevents large categories from permanently winning on volume alone. */
export function normalizeSignal(value: number, maximum: number): number {
  if (value <= 0 || maximum <= 0) return 0;
  return clamp(Math.log1p(value) / Math.log1p(maximum));
}

export function calculateTrendScore(
  signals: Record<TrendWeightKey, number>,
  weights = DEFAULT_TREND_WEIGHTS,
): number {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + Math.max(0, weight), 0) || 1;
  const weightedScore = (Object.keys(weights) as TrendWeightKey[]).reduce(
    (sum, key) => sum + clamp(signals[key]) * Math.max(0, weights[key]),
    0,
  );
  return clamp(weightedScore / totalWeight);
}

function derivedSignals(
  candidate: TrendingTopicCandidate,
  maximums: Record<keyof TrendingSignalSnapshot, number>,
  now: Date,
): Record<TrendWeightKey, number> {
  const raw = candidate.signals;
  const normalized = (key: keyof TrendingSignalSnapshot): number => normalizeSignal(raw[key] as number, maximums[key]);
  const demandGrowth = clamp(raw.demandGrowth);
  const viewGrowth = clamp(raw.supplyGrowth * 0.35 + demandGrowth * 0.65);
  const freshness = clamp(timeDecay(raw.lastActivityAt, now));
  return {
    searchGrowth: demandGrowth,
    viewGrowth,
    favorites: normalized('favorites'),
    contacts: normalized('contacts'),
    conversion: clamp(raw.conversionRate),
    listingVelocity: clamp(raw.publicationVelocity),
    locality: clamp(raw.geographicRelevance),
    freshness,
    seasonality: clamp(raw.seasonalRelevance),
    editorial: clamp(raw.editorialBoost),
  };
}

function activeOverride(overrides: TrendingTopicOverride[], key: string, now: Date): TrendingTopicOverride | undefined {
  return overrides.find((override) => {
    if (override.topicKey !== key) return false;
    if (override.startsAt && new Date(override.startsAt).getTime() > now.getTime()) return false;
    if (override.endsAt && new Date(override.endsAt).getTime() < now.getTime()) return false;
    return true;
  });
}

function buildMaximums(candidates: TrendingTopicCandidate[]): Record<keyof TrendingSignalSnapshot, number> {
  const keys = Object.keys(candidates[0]?.signals || {}) as Array<keyof TrendingSignalSnapshot>;
  return keys.reduce((maximums, key) => {
    maximums[key] = Math.max(1, ...candidates.map((candidate) => Number(candidate.signals[key]) || 0));
    return maximums;
  }, {} as Record<keyof TrendingSignalSnapshot, number>);
}

function activityScore(candidate: TrendingTopicCandidate): number {
  const signals = candidate.signals;
  return clamp(
    (signals.activeListings > 0 ? 0.35 : 0) +
      (signals.views > 0 ? 0.25 : 0) +
      (signals.favorites > 0 ? 0.2 : 0) +
      (signals.contacts > 0 ? 0.2 : 0),
  );
}

export interface RankedTrendingCandidate extends TrendingTopicCandidate {
  score: number;
  direction: 'up' | 'stable';
  override?: TrendingTopicOverride;
}

export function rankTrendingCandidates(
  candidates: TrendingTopicCandidate[],
  config: TrendingAdminConfig,
  now = new Date(),
): RankedTrendingCandidate[] {
  const eligible = candidates.filter((candidate) => {
    const override = activeOverride(config.overrides, candidate.key, now);
    return !config.excludedCategories.includes(candidate.categorySlug || candidate.parentKey || '') &&
      !config.excludedTopics.includes(candidate.key) &&
      !override?.isHidden;
  });
  const maximums = buildMaximums(eligible);

  return eligible
    .map((candidate) => {
      const override = activeOverride(config.overrides, candidate.key, now);
      const score = calculateTrendScore(derivedSignals(candidate, maximums, now), config.weights) +
        clamp(override?.boostScore || 0) * 0.25 +
        clamp(candidate.personalizationScore || 0) * config.personalizationWeight;
      const direction: 'up' | 'stable' = candidate.signals.demandGrowth > 0.58 ? 'up' : 'stable';
      return {
        ...candidate,
        title: override?.customTitle || candidate.title,
        subtitle: override?.customSubtitle || candidate.subtitle,
        image: override?.customImage || candidate.image,
        score: clamp(score),
        direction,
        override,
      };
    })
    .filter((candidate) => activityScore(candidate) >= config.minimumActivity)
    .sort((a, b) => {
      const pinnedDelta = Number(Boolean(b.override?.isPinned)) - Number(Boolean(a.override?.isPinned));
      if (pinnedDelta !== 0) return pinnedDelta;
      const sortDelta = (a.override?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.override?.sortOrder ?? Number.MAX_SAFE_INTEGER);
      if (sortDelta !== 0 && (a.override?.isPinned || b.override?.isPinned)) return sortDelta;
      return b.score - a.score;
    });
}

export function selectDiverseCandidates(
  ranked: RankedTrendingCandidate[],
  config: TrendingAdminConfig,
): RankedTrendingCandidate[] {
  const selected: RankedTrendingCandidate[] = [];
  const parentCounts = new Map<string, number>();
  const maxTopics = Math.max(config.minTopics, config.maxTopics);

  for (const candidate of ranked) {
    const parent = candidate.parentKey || candidate.categorySlug || candidate.key;
    const count = parentCounts.get(parent) || 0;
    const canBreakDiversity = Boolean(candidate.override?.isPinned) && candidate.score >= 0.8;
    if (count >= config.maxTopicsPerParentCategory && !canBreakDiversity) continue;
    selected.push(candidate);
    parentCounts.set(parent, count + 1);
    if (selected.length >= maxTopics) break;
  }

  return selected;
}

export function deduplicateListings(topics: RankedTrendingCandidate[], listingsPerTopic = 5): Map<string, string[]> {
  const claimed = new Set<string>();
  const assignments = new Map<string, string[]>();

  for (const topic of topics) {
    const chosen = [...topic.listings]
      .sort((a, b) => {
        const qualityA = Number(a.sellerIsVerified) * 3 + Number(Boolean(a.coverImageUrl)) * 2 + a.viewsCount * 0.002 + a.favoritesCount * 0.01;
        const qualityB = Number(b.sellerIsVerified) * 3 + Number(Boolean(b.coverImageUrl)) * 2 + b.viewsCount * 0.002 + b.favoritesCount * 0.01;
        return qualityB - qualityA;
      })
      .filter((listing) => !claimed.has(listing.id))
      .slice(0, listingsPerTopic);

    chosen.forEach((listing) => claimed.add(listing.id));
    assignments.set(topic.id, chosen.map((listing) => listing.id));
  }

  return assignments;
}

export function toPublicTopics(
  selected: RankedTrendingCandidate[],
  config: TrendingAdminConfig,
  now = new Date(),
): TrendingTopic[] {
  const assignments = deduplicateListings(selected);
  return selected
    .map((candidate) => {
      const listingIds = new Set(assignments.get(candidate.id) || []);
      const listings = candidate.listings.filter((listing) => listingIds.has(listing.id));
      return {
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        subtitle: candidate.subtitle,
        href: candidate.href,
        categorySlug: candidate.categorySlug,
        subcategorySlug: candidate.subcategorySlug,
        image: candidate.image,
        listings,
        badge: candidate.direction === 'up' ? 'En hausse' : undefined,
        trend: { score: Number(candidate.score.toFixed(3)), direction: candidate.direction },
      };
    })
    .filter((topic) => topic.listings.length > 0 || config.minTopics === 0)
    .map((topic) => ({ ...topic, listings: topic.listings.slice(0, 5) }));
}
