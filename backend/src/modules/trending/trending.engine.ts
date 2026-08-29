import type {
  TrendCandidate,
  TrendingAdminConfig,
  TrendingTopic,
} from "./trending.types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export function calculateGrowth(recent: number, previous: number): number {
  if (recent <= 0 && previous <= 0) return 0;
  if (previous <= 0) return 1;
  return clamp((recent - previous) / previous, -1, 1);
}

export function timeDecay(
  lastActivityAt: string | undefined,
  now: Date,
  halfLifeDays = 7,
): number {
  if (!lastActivityAt) return 0;
  const age = Math.max(0, now.getTime() - new Date(lastActivityAt).getTime());
  return Math.exp(-age / (Math.max(0.5, halfLifeDays) * DAY_MS));
}

export function normalizeSignal(value: number, maximum: number): number {
  if (value <= 0 || maximum <= 0) return 0;
  return clamp(Math.log1p(value) / Math.log1p(maximum));
}

function scoreCandidate(
  candidate: TrendCandidate,
  candidates: TrendCandidate[],
  config: TrendingAdminConfig,
  now: Date,
): number {
  const maxViews = Math.max(1, ...candidates.map((item) => item.signals.views));
  const maxFavorites = Math.max(
    1,
    ...candidates.map((item) => item.signals.favorites),
  );
  const maxContacts = Math.max(
    1,
    ...candidates.map((item) => item.signals.contacts),
  );
  const signals = {
    searchGrowth: clamp(0.5 + candidate.signals.demandGrowth / 2),
    viewGrowth: clamp(0.5 + candidate.signals.supplyGrowth / 2),
    favorites: normalizeSignal(candidate.signals.favorites, maxFavorites),
    contacts: normalizeSignal(candidate.signals.contacts, maxContacts),
    conversion: clamp(candidate.signals.conversionRate),
    listingVelocity: clamp(candidate.signals.publicationVelocity),
    locality: clamp(candidate.signals.geographicRelevance),
    freshness: timeDecay(candidate.signals.lastActivityAt, now),
    seasonality: clamp(candidate.signals.seasonalRelevance),
    editorial: clamp(candidate.signals.editorialBoost),
  };
  const totalWeight =
    Object.values(config.weights).reduce(
      (sum, weight) => sum + Math.max(0, weight),
      0,
    ) || 1;
  const weighted = (
    Object.keys(config.weights) as Array<keyof typeof config.weights>
  ).reduce(
    (sum, key) => sum + signals[key] * Math.max(0, config.weights[key]),
    0,
  );
  const volume = normalizeSignal(candidate.signals.views, maxViews) * 0.06;
  return clamp(
    weighted / totalWeight +
      volume +
      (candidate.override?.boostScore || 0) * 0.25,
  );
}

export function selectTrendingTopics(
  candidates: TrendCandidate[],
  config: TrendingAdminConfig,
  now = new Date(),
): TrendingTopic[] {
  const eligible = candidates
    .filter(
      (candidate) => !config.excludedCategories.includes(candidate.parentKey),
    )
    .filter((candidate) => !config.excludedTopics.includes(candidate.key))
    .filter((candidate) => !candidate.override?.isHidden)
    .filter(
      (candidate) =>
        config.selectionMode !== "manual" || candidate.override?.isPinned,
    )
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, candidates, config, now),
    }))
    .filter(({ candidate }) => candidate.signals.activeListings > 0)
    .sort((a, b) => {
      const pinned =
        config.selectionMode === "automatic"
          ? 0
          : Number(Boolean(b.candidate.override?.isPinned)) -
            Number(Boolean(a.candidate.override?.isPinned));
      if (pinned !== 0) return pinned;
      return b.score - a.score;
    });

  const selected: Array<{ candidate: TrendCandidate; score: number }> = [];
  const parentCounts = new Map<string, number>();
  for (const item of eligible) {
    const count = parentCounts.get(item.candidate.parentKey) || 0;
    if (
      count >= config.maxTopicsPerParentCategory &&
      !(item.candidate.override?.isPinned && item.score >= 0.8)
    )
      continue;
    selected.push(item);
    parentCounts.set(item.candidate.parentKey, count + 1);
    if (selected.length >= config.maxTopics) break;
  }

  const claimedListings = new Set<string>();
  return selected
    .map(({ candidate, score }) => {
      const listings = candidate.listings
        .filter(
          (listing) =>
            listing.status === "published" || listing.status === "reserved",
        )
        .sort(
          (a, b) =>
            Number(Boolean(b.images.length)) -
              Number(Boolean(a.images.length)) || b.viewCount - a.viewCount,
        )
        .filter((listing) => {
          if (claimedListings.has(listing.id)) return false;
          claimedListings.add(listing.id);
          return true;
        })
        .slice(0, config.listingsPerTopic);
      const direction: "up" | "stable" =
        candidate.signals.demandGrowth > 0.58 ? "up" : "stable";
      return {
        id: candidate.id,
        type: "category" as const,
        title: candidate.override?.customTitle || candidate.title,
        subtitle:
          candidate.override?.customSubtitle || "Très recherchés cette semaine",
        href: candidate.href,
        categorySlug: candidate.key,
        image: candidate.override?.customImage || candidate.image,
        listings,
        badge: direction === "up" ? "En hausse" : undefined,
        trend: { score: Number(score.toFixed(3)), direction },
      };
    })
    .filter((topic) => topic.listings.length > 0);
}
