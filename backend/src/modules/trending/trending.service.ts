import type { IListingRepository } from "../../infrastructure/database/repositories/listing.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { AppError } from "../../shared/errors/app-error.js";
import { selectTrendingTopics } from "./trending.engine.js";
import type {
  TrendCandidate,
  TrendingActivitySignals,
  TrendingAdminConfig,
  TrendingQuery,
  TrendingSectionResponse,
  TrendingTopicOverride,
} from "./trending.types.js";
import type { ITrendingRepository } from "../../infrastructure/database/repositories/trending.repository.js";
import type { ITaxonomyRepository } from "../../infrastructure/database/repositories/taxonomy.repository.js";
import { config as runtimeConfig } from "../../app/config/index.js";

const MAX_LIMIT = 12;

function withoutInternalScores(
  response: TrendingSectionResponse,
): TrendingSectionResponse {
  return {
    ...response,
    topics: response.topics.map((topic) => ({
      ...topic,
      trend: { direction: topic.trend.direction },
    })),
  };
}

function normalizeQuery(query: TrendingQuery): TrendingQuery {
  const marketCode = (query.marketCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketCode)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Marché invalide.",
    });
  }
  return {
    ...query,
    marketCode,
    limit: Math.min(MAX_LIMIT, Math.max(1, query.limit || 4)),
  };
}

function titleFromCategory(
  categoryId: string,
  labels?: Record<string, string>,
  locale = "fr-FR",
): string {
  const language = locale.split("-")[0];
  const localized =
    labels?.[locale] ||
    Object.entries(labels || {}).find(
      ([key]) => key.split("-")[0] === language,
    )?.[1] ||
    labels?.["fr-FR"];
  if (localized) return localized;
  return categoryId
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export class TrendingService {
  constructor(
    private readonly trendRepo: ITrendingRepository = repositories.trending,
    private readonly listingRepo: IListingRepository = repositories.listings,
    private readonly taxonomyRepo: ITaxonomyRepository = repositories.taxonomy,
  ) {}

  async getSection(
    input: TrendingQuery,
    options: { bypassCache?: boolean } = {},
  ): Promise<TrendingSectionResponse> {
    const query = normalizeQuery(input);
    const config = await this.trendRepo.getConfig(query.marketCode);
    const generatedAt = new Date();
    if (!config.enabled)
      return {
        enabled: false,
        generatedAt: generatedAt.toISOString(),
        title: config.title,
        subtitle: config.subtitle,
        topics: [],
      };

    if (
      !options.bypassCache &&
      (!query.locale || query.locale.startsWith("fr"))
    ) {
      const cached = await this.trendRepo.getCachedSection(query);
      if (cached) return withoutInternalScores(cached);
    }
    // Production request paths read only the worker-maintained cache. A cache
    // miss must not turn a homepage hit into an unbounded event aggregation.
    if (runtimeConfig.dataMode === "database" && !options.bypassCache) {
      return {
        enabled: true,
        generatedAt: generatedAt.toISOString(),
        title: config.title,
        subtitle: config.subtitle,
        topics: [],
      };
    }

    const result = await this.listingRepo.search({
      marketCode: query.marketCode,
      city: query.city,
      region: query.region,
      limit: 1000,
      sortBy: "relevance",
    });
    const activitySignals = await this.trendRepo.getActivitySignals(
      query.marketCode,
      new Date(
        generatedAt.getTime() - config.displayPeriodDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    );
    const groups = new Map<string, typeof result.items>();
    result.items
      .filter(
        (listing) =>
          listing.status === "published" || listing.status === "reserved",
      )
      .forEach((listing) => {
        const group = groups.get(listing.categoryId) || [];
        groups.set(listing.categoryId, [...group, listing]);
      });

    const candidates: TrendCandidate[] = await Promise.all(
      Array.from(groups.entries()).map(async ([categoryId, listings]) => {
        const taxonomyNode =
          (await this.taxonomyRepo.getNodeById(categoryId)) ||
          (await this.taxonomyRepo.getNodeBySlug(categoryId));
        const categoryTitle = titleFromCategory(
          categoryId,
          taxonomyNode?.labels,
          query.locale,
        );
        const activity: TrendingActivitySignals = activitySignals.get(
          categoryId,
        ) || {
          views: 0,
          uniqueViews: 0,
          searches: 0,
          searchClicks: 0,
          favorites: 0,
          shares: 0,
          contacts: 0,
          offers: 0,
          reservations: 0,
          transactions: 0,
        };
        const views =
          listings.reduce((sum, listing) => sum + listing.viewCount, 0) +
          activity.views;
        const favorites =
          listings.reduce((sum, listing) => sum + listing.favoriteCount, 0) +
          activity.favorites;
        const contacts = activity.contacts;
        const newlyPublished = listings.filter(
          (listing) =>
            Date.now() - new Date(listing.createdAt).getTime() <
            config.displayPeriodDays * 24 * 60 * 60 * 1000,
        ).length;
        const cityMatches = query.city
          ? listings.filter((listing) =>
              listing.city.toLowerCase().includes(query.city!.toLowerCase()),
            ).length
          : 0;
        const eventDemand =
          activity.searches +
          activity.searchClicks +
          activity.contacts +
          activity.reservations;
        const demandGrowth =
          eventDemand > 0
            ? Math.min(
                1,
                0.5 + eventDemand / Math.max(20, listings.length * 20),
              )
            : Math.min(
                1,
                0.5 + newlyPublished / Math.max(2, listings.length * 2),
              );
        return {
          id: `category:${categoryId}`,
          key: categoryId,
          parentKey: categoryId,
          title: categoryTitle,
          href: `/categorie/${taxonomyNode?.slug || categoryId}`,
          image: listings[0]?.images[0]
            ? { src: listings[0].images[0], alt: categoryTitle }
            : undefined,
          listings,
          signals: {
            activeListings: listings.length,
            newlyPublished,
            views,
            favorites,
            contacts,
            demandGrowth,
            supplyGrowth: Math.min(
              1,
              newlyPublished / Math.max(1, listings.length),
            ),
            conversionRate: 0,
            publicationVelocity: Math.min(
              1,
              newlyPublished / Math.max(1, listings.length),
            ),
            geographicRelevance: query.city
              ? cityMatches > 0
                ? 0.9
                : 0.15
              : 0.45,
            seasonalRelevance: 0.5,
            editorialBoost: 0,
            lastActivityAt: listings[0]?.updatedAt,
          },
        };
      }),
    );

    const overrides = config.overrides.reduce(
      (map, override) => map.set(override.topicKey, override),
      new Map<string, TrendingTopicOverride>(),
    );
    const withOverrides = candidates.map((candidate) => ({
      ...candidate,
      override: overrides.get(candidate.key),
    }));
    const response: TrendingSectionResponse = {
      enabled: true,
      generatedAt: generatedAt.toISOString(),
      expiresAt: new Date(
        generatedAt.getTime() + config.cacheTtlMinutes * 60 * 1000,
      ).toISOString(),
      title: config.title,
      subtitle: config.subtitle,
      topics: selectTrendingTopics(withOverrides, config, generatedAt).slice(
        0,
        query.limit,
      ),
    };
    // The current cache key is market-wide. Keep local requests out of it until
    // a geographic scope is part of the persisted key, otherwise a city request
    // could overwrite the global homepage cache for every visitor.
    if (
      response.topics.length > 0 &&
      !query.city &&
      !query.region &&
      (!query.locale || query.locale.startsWith("fr"))
    ) {
      await this.trendRepo.saveCachedSection(query.marketCode, response);
    }
    return withoutInternalScores(response);
  }

  refreshActivityWindow(
    marketCode: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<void> {
    return this.trendRepo.refreshActivityWindow(
      marketCode.toUpperCase(),
      windowStart,
      windowEnd,
    );
  }

  /** Recomputes a market-wide section for the scheduled cache refresh worker. */
  refreshSection(input: TrendingQuery): Promise<TrendingSectionResponse> {
    return this.getSection(input, { bypassCache: true });
  }

  getConfig(marketCode: string): Promise<TrendingAdminConfig> {
    return this.trendRepo.getConfig(marketCode.toUpperCase());
  }

  saveConfig(
    marketCode: string,
    updates: Partial<TrendingAdminConfig>,
  ): Promise<TrendingAdminConfig> {
    return this.trendRepo.saveConfig(marketCode.toUpperCase(), updates);
  }

  upsertOverride(
    marketCode: string,
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    return this.trendRepo.upsertOverride(marketCode.toUpperCase(), override);
  }
}

export const trendingService = new TrendingService();
