import {
  homepageConfigurationSchema,
  resolveHomepageConfiguration,
  type HomepageConfiguration,
  type HomepageOfferOverride,
  type HomepageSectionSettings,
  type ResolvedHomepageSection,
} from "@shongre/contracts/homepage";
import { majorToMinorAmount } from "@shongre/shared";
import type {
  IHomepageRepository,
  IListingRepository,
} from "../../infrastructure/database/repositories/index.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import type { Listing, PublicListing } from "../../shared/types/index.js";
import { toPublicListing } from "../../shared/public-projections.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  trendingService,
  type TrendingService,
} from "../trending/trending.service.js";
import type { TrendingSectionResponse } from "../trending/trending.types.js";

export interface HomepageQuery {
  marketCode: string;
  locale: string;
  country?: string;
  region?: string;
  city?: string;
  now?: Date;
}

export interface HomepageDealItem {
  listing: PublicListing;
  offer: {
    type:
      | "verified_price_reduction"
      | "marketplace_deal"
      | "time_limited_promotion"
      | "professional_discount";
    state: "active";
    currentPrice: { amountMinor: number; currency: string };
    originalPrice: { amountMinor: number; currency: string };
    discountAmount: { amountMinor: number; currency: string };
    discountBps: number;
    startsAt?: string;
    endsAt?: string;
  };
}

export interface HomepageSectionView extends ResolvedHomepageSection {
  status: "ready" | "empty" | "error";
  errorCode?:
    "TRENDING_UNAVAILABLE" | "DEALS_UNAVAILABLE" | "LISTINGS_UNAVAILABLE";
  trending?: TrendingSectionResponse;
  deals?: HomepageDealItem[];
  listings?: PublicListing[];
}

const normalizeScope = (query: HomepageQuery): HomepageQuery => {
  const marketCode = query.marketCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketCode) || !query.locale.trim()) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Marché ou langue de page d’accueil invalide.",
    });
  }
  return { ...query, marketCode, locale: query.locale.trim() };
};

const activeOverride = (override: HomepageOfferOverride, now: Date) =>
  (!override.startsAt || new Date(override.startsAt) <= now) &&
  (!override.endsAt || new Date(override.endsAt) > now);

const listingBelongsToMarket = (listing: Listing, marketCode: string) => {
  const publication = listing.marketPublications?.find(
    (candidate) => candidate.marketCode.toUpperCase() === marketCode,
  );
  if (publication) return publication.status === "active";
  return (
    listing.marketCode.toUpperCase() === marketCode ||
    listing.marketCodes?.some((code) => code.toUpperCase() === marketCode)
  );
};

export function selectHomepageDeals(
  listings: Listing[],
  marketCode: string,
  settings: HomepageSectionSettings,
  limit: number,
  now = new Date(),
): HomepageDealItem[] {
  if (
    settings.allowedMarkets?.length &&
    !settings.allowedMarkets.includes(marketCode)
  ) {
    return [];
  }
  const selectionMode = settings.selectionMode ?? "hybrid";
  const overrides = new Map(
    (settings.offerOverrides || [])
      .filter((override) => activeOverride(override, now))
      .map((override) => [override.listingId, override]),
  );

  return listings
    .flatMap((listing): HomepageDealItem[] => {
      const override = overrides.get(listing.id);
      if (
        (selectionMode === "manual" && !override) ||
        (selectionMode !== "automatic" && override?.isHidden) ||
        listing.status !== "published" ||
        !listingBelongsToMarket(listing, marketCode) ||
        (!settings.includeProfessionalSellers &&
          listing.publisherType === "professional") ||
        (settings.taxonomyBranches?.length &&
          !settings.taxonomyBranches.some(
            (branch) =>
              listing.categoryId === branch ||
              listing.categoryId.startsWith(`${branch}.`),
          )) ||
        listing.originalPrice === undefined
      ) {
        return [];
      }
      if (
        listing.promotionState &&
        !["active", "inactive"].includes(listing.promotionState)
      ) {
        return [];
      }
      if (
        listing.promotionStartAt &&
        new Date(listing.promotionStartAt) > now
      ) {
        return [];
      }
      if (listing.promotionEndAt && new Date(listing.promotionEndAt) <= now) {
        return [];
      }
      const publication = listing.marketPublications?.find(
        (candidate) => candidate.marketCode === marketCode,
      );
      const currency = publication?.currency || listing.currency;
      const currentPrice =
        publication?.priceMinor ?? majorToMinorAmount(listing.price, currency);
      const originalPrice = majorToMinorAmount(listing.originalPrice, currency);
      if (originalPrice <= currentPrice || currentPrice < 0) return [];
      const discountAmount = originalPrice - currentPrice;
      const discountBps = Math.floor((discountAmount * 10_000) / originalPrice);
      if (discountBps < (settings.minimumDiscountBps ?? 0)) return [];
      const type =
        listing.publisherType === "professional"
          ? "professional_discount"
          : listing.promotionEndAt
            ? "time_limited_promotion"
            : "verified_price_reduction";
      if (
        settings.eligibleOfferTypes?.length &&
        !settings.eligibleOfferTypes.includes(type)
      ) {
        return [];
      }
      return [
        {
          listing: toPublicListing(listing),
          offer: {
            type,
            state: "active",
            currentPrice: { amountMinor: currentPrice, currency },
            originalPrice: { amountMinor: originalPrice, currency },
            discountAmount: { amountMinor: discountAmount, currency },
            discountBps,
            startsAt: listing.promotionStartAt,
            endsAt: listing.promotionEndAt,
          },
        },
      ];
    })
    .sort((left, right) => {
      if (selectionMode !== "automatic") {
        const leftOverride = overrides.get(left.listing.id);
        const rightOverride = overrides.get(right.listing.id);
        const pinned =
          Number(Boolean(rightOverride?.isPinned)) -
          Number(Boolean(leftOverride?.isPinned));
        if (pinned) return pinned;
        const order =
          (leftOverride?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (rightOverride?.sortOrder ?? Number.MAX_SAFE_INTEGER);
        if (order) return order;
      }
      return (
        right.offer.discountBps - left.offer.discountBps ||
        new Date(right.listing.updatedAt).getTime() -
          new Date(left.listing.updatedAt).getTime() ||
        left.listing.id.localeCompare(right.listing.id)
      );
    })
    .slice(0, limit);
}

export class HomepageService {
  constructor(
    private readonly homepageRepo: IHomepageRepository = repositories.homepage,
    private readonly listingRepo: IListingRepository = repositories.listings,
    private readonly trends: TrendingService = trendingService,
  ) {}

  getDraft(marketCode: string, locale: string): Promise<HomepageConfiguration> {
    return this.homepageRepo.getDraft(marketCode.toUpperCase(), locale);
  }

  saveDraft(input: {
    configuration: HomepageConfiguration;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration> {
    const configuration = homepageConfigurationSchema.parse(
      input.configuration,
    );
    if (configuration.state !== "draft") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Seul un brouillon peut être enregistré.",
      });
    }
    return this.homepageRepo.saveDraft({ ...input, configuration });
  }

  publish(input: {
    marketCode: string;
    locale: string;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration> {
    if (input.changeReason.trim().length < 3) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le motif de publication est obligatoire.",
      });
    }
    return this.homepageRepo.publish({
      ...input,
      marketCode: input.marketCode.toUpperCase(),
    });
  }

  async preview(configuration: HomepageConfiguration, query: HomepageQuery) {
    return this.resolve(
      homepageConfigurationSchema.parse(configuration),
      query,
    );
  }

  async getPublished(query: HomepageQuery) {
    const scope = normalizeScope(query);
    return this.resolve(
      await this.homepageRepo.getPublished(scope.marketCode, scope.locale),
      scope,
    );
  }

  private async resolve(
    configuration: HomepageConfiguration,
    input: HomepageQuery,
  ) {
    const query = normalizeScope(input);
    if (
      configuration.marketCode !== query.marketCode ||
      configuration.locale !== query.locale
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le brouillon ne correspond pas au marché demandé.",
      });
    }
    const resolved = resolveHomepageConfiguration(
      configuration,
      query.now || new Date(),
    );
    const needsListings = resolved.sections.some((section) =>
      ["deals", "recent_listings"].includes(section.type),
    );
    const listingPromise = needsListings
      ? this.listingRepo.search({
          marketCode: query.marketCode,
          city: query.city,
          region: query.region,
          sortBy: "date_desc",
          limit: 1_000,
        })
      : Promise.resolve({ items: [], total: 0, page: 1, totalPages: 0 });
    let listings: Awaited<typeof listingPromise> = {
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    let listingsUnavailable = false;
    try {
      listings = await listingPromise;
    } catch {
      listingsUnavailable = true;
    }
    const sections = await Promise.all(
      resolved.sections.map(async (section): Promise<HomepageSectionView> => {
        try {
          if (section.type === "trending") {
            const trending = await this.trends.getSection({
              marketCode: query.marketCode,
              locale: query.locale,
              region: query.region,
              city: query.city,
              limit: section.maxItems,
            });
            return {
              ...section,
              status:
                trending.enabled && trending.topics.length ? "ready" : "empty",
              trending,
            };
          }
          if (section.type === "deals") {
            if (listingsUnavailable) throw new Error("Listings unavailable");
            const deals = selectHomepageDeals(
              listings.items,
              query.marketCode,
              section.settings,
              section.maxItems,
              query.now,
            );
            return {
              ...section,
              status: deals.length ? "ready" : "empty",
              deals,
            };
          }
          if (section.type === "recent_listings") {
            if (listingsUnavailable) throw new Error("Listings unavailable");
            const recent = listings.items
              .filter(
                (listing) =>
                  listing.status === "published" &&
                  listingBelongsToMarket(listing, query.marketCode),
              )
              .slice(0, section.maxItems)
              .map(toPublicListing);
            return {
              ...section,
              status: recent.length ? "ready" : "empty",
              listings: recent,
            };
          }
          return { ...section, status: "ready" };
        } catch {
          return {
            ...section,
            status: "error",
            errorCode:
              section.type === "trending"
                ? "TRENDING_UNAVAILABLE"
                : section.type === "deals"
                  ? "DEALS_UNAVAILABLE"
                  : "LISTINGS_UNAVAILABLE",
          };
        }
      }),
    );
    return { ...resolved, sections };
  }
}

export const homepageService = new HomepageService();
