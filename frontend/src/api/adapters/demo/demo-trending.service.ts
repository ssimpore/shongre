import type { Listing } from '../../../types';
import { listingRepository } from '../../../repositories/listing.repository';
import { storageService } from '../../../services/storage.service';
import { simulateNetworkDelay } from '../../client/api-client.config';
import { getTrendingAdminConfig } from '../../../domains/trending/trending.store';
import { taxonomyService } from '../../../domains/taxonomy/taxonomy.service';
import { getCompactTaxonomyLabel } from '../../../domains/taxonomy/taxonomy.display';
import { rankTrendingCandidates, selectDiverseCandidates, toPublicTopics } from '../../../domains/trending/trending.engine';
import type {
  TrendingQuery,
  TrendingSectionResponse,
  TrendingSignalSnapshot,
  TrendingTopicCandidate,
} from '../../../domains/trending/trending.types';
import type { TrendingServiceContract } from '../../contracts/trending.contract';

function hashSeed(value: string): number {
  return value.split('').reduce((hash, char) => ((hash * 31 + char.charCodeAt(0)) >>> 0), 7) / 4294967295;
}

function daysSince(date: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

function cityMatches(listing: Listing, city?: string): boolean {
  if (!city) return false;
  return listing.city.toLocaleLowerCase().includes(city.toLocaleLowerCase());
}

function buildSignals(listings: Listing[], key: string, query: TrendingQuery, now: Date): TrendingSignalSnapshot {
  const activeListings = listings.length;
  const views = listings.reduce((sum, listing) => sum + (listing.viewsCount || listing.viewCount || 0), 0);
  const favorites = listings.reduce((sum, listing) => sum + listing.favoritesCount, 0);
  const contacts = listings.reduce((sum, listing) => sum + listing.contactCount, 0);
  const newlyPublished = listings.filter((listing) => daysSince(listing.createdAt, now) <= 7).length;
  const recentActivity = newlyPublished + Math.round(views * (0.05 + hashSeed(`${key}:activity`) * 0.08));
  const previousActivity = Math.max(1, Math.round(activeListings * (0.7 + hashSeed(`${key}:previous`) * 1.3)));
  const demandGrowth = (recentActivity + previousActivity) === 0
    ? 0
    : Math.min(1, Math.max(0, 0.5 + (recentActivity - previousActivity) / (2 * previousActivity)));
  const matchingListings = listings.filter((listing) => cityMatches(listing, query.city)).length;
  const conversionRate = views > 0 ? Math.min(1, contacts / views) : 0;
  const lastActivityAt = [...listings]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.updatedAt;

  return {
    activeListings,
    newlyPublished,
    views,
    uniqueViewers: Math.round(views * 0.72),
    searches: Math.round(recentActivity * (2.2 + hashSeed(`${key}:searches`) * 2.8)),
    searchClicks: Math.round(recentActivity * (1.1 + hashSeed(`${key}:clicks`) * 1.8)),
    favorites,
    shares: Math.round(favorites * 0.12),
    contacts,
    offers: Math.round(contacts * 0.18),
    reservations: Math.round(contacts * 0.07),
    transactions: Math.round(contacts * 0.04),
    conversionRate,
    publicationVelocity: Math.min(1, newlyPublished / Math.max(1, activeListings)),
    demandGrowth,
    supplyGrowth: Math.min(1, (newlyPublished + 1) / Math.max(2, activeListings)),
    priceActivity: Math.min(1, listings.filter((listing) => listing.originalPrice && listing.originalPrice > listing.price).length / Math.max(1, activeListings)),
    lastActivityAt,
    geographicRelevance: query.city ? (matchingListings > 0 ? 0.65 + matchingListings / Math.max(1, activeListings) * 0.35 : 0.15) : 0.45,
    seasonalRelevance: 0.45 + hashSeed(`${key}:${now.getUTCMonth()}`) * 0.45,
    editorialBoost: 0,
  };
}

function buildCandidate(listings: Listing[], query: TrendingQuery, now: Date): TrendingTopicCandidate {
  const first = listings[0];
  const key = first.categorySlug;
  const node = taxonomyService.getNodeBySlug(key);
  const title = getCompactTaxonomyLabel(node, first.categoryLabel || key);
  const personalMatches = query.personalization?.favoriteListingIds?.filter((id) => listings.some((listing) => listing.id === id)).length || 0;
  const personalizationScore = Math.min(1, personalMatches / Math.max(1, listings.length) + Number(query.personalization?.recentCategorySlugs?.includes(key) || false) * 0.35);
  const signals = buildSignals(listings, key, query, now);
  const subtitle = query.city && signals.geographicRelevance > 0.65
    ? `Populaire près de ${query.city}`
    : signals.demandGrowth > 0.65
      ? 'En forte progression'
      : signals.publicationVelocity > 0.45
        ? 'Nouveautés très consultées'
        : 'Très recherchés cette semaine';

  return {
    id: `category:${key}`,
    type: 'category',
    key,
    title,
    subtitle,
    href: `/categorie/${key}`,
    parentKey: key,
    categorySlug: key,
    image: first.coverImageUrl ? { src: first.coverImageUrl, alt: title } : undefined,
    signals,
    listings,
    personalizationScore,
  };
}

export function buildDemoTrendingCandidates(listings: Listing[], query: TrendingQuery, now = new Date()): TrendingTopicCandidate[] {
  const grouped = new Map<string, Listing[]>();
  listings.filter((listing) => listing.status === 'active').forEach((listing) => {
    const current = grouped.get(listing.categorySlug) || [];
    grouped.set(listing.categorySlug, [...current, listing]);
  });
  return Array.from(grouped.values()).map((group) => buildCandidate(group, query, now));
}

export class DemoTrendingService implements TrendingServiceContract {
  async getTrending(query: TrendingQuery): Promise<TrendingSectionResponse> {
    await simulateNetworkDelay();
    const now = query.now || new Date();
    const config = getTrendingAdminConfig(query.marketCode);
    if (!config.enabled || (query.limit === 0)) {
      return {
        enabled: false,
        generatedAt: now.toISOString(),
        title: config.title,
        subtitle: config.subtitle,
        topics: [],
      };
    }

    const { listings } = await listingRepository.getListings({ marketCode: query.marketCode, limit: 1000 });
    // The adapter owns demo personalization. The homepage only supplies the
    // account identity; favorite state is resolved from the same account-scoped
    // store used by the rest of the product, so switching personas cannot leak
    // one user's preferences into another user's ranking.
    const effectiveQuery: TrendingQuery = {
      ...query,
      personalization: {
        ...query.personalization,
        favoriteListingIds: query.personalization?.favoriteListingIds || storageService.getFavorites(),
      },
    };
    const candidates = buildDemoTrendingCandidates(listings, effectiveQuery, now);
    const ranked = rankTrendingCandidates(candidates, config, now);
    const selected = selectDiverseCandidates(ranked, { ...config, maxTopics: Math.min(query.limit || config.maxTopics, config.maxTopics) });
    const topics = toPublicTopics(selected, config, now);
    const expiresAt = new Date(now.getTime() + config.cacheTtlMinutes * 60 * 1000).toISOString();

    return {
      enabled: config.enabled,
      generatedAt: now.toISOString(),
      expiresAt,
      title: config.title,
      subtitle: config.subtitle,
      topics,
    };
  }
}

export const demoTrendingService = new DemoTrendingService();
