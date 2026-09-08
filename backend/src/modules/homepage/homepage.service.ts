import {
  homepageConfigurationSchema,
  resolveHomepageConfiguration,
  type HomepageConfiguration,
  type HomepageOfferOverride,
  type HomepageSectionSettings,
  type HomepageUniverseSubsection,
  type ResolvedHomepageSection,
} from "@shongre/contracts/homepage";
import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import type { TaxonomyV1Service } from "../taxonomy/taxonomy.v1.service.js";
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
  eligibleListingCount?: number;
  suppressed?: boolean;
  suppressionReason?: "BELOW_MINIMUM_LISTINGS";
  errorCode?:
    "TRENDING_UNAVAILABLE" | "DEALS_UNAVAILABLE" | "LISTINGS_UNAVAILABLE";
  trending?: TrendingSectionResponse;
  deals?: HomepageDealItem[];
  listings?: PublicListing[];
  universeGroups?: HomepageUniverseGroup[];
}

export interface HomepageUniverseGroup extends HomepageUniverseSubsection {
  status: "ready" | "empty";
  eligibleListingCount: number;
  suppressed: boolean;
  listings: PublicListing[];
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

const listingBelongsToCategory = (
  listing: Listing,
  categoryId: string,
  taxonomy: TaxonomyV1Service,
) => taxonomy.isDescendant(listing.categoryId, categoryId);

function validateConfiguration(
  input: HomepageConfiguration,
  taxonomy: TaxonomyV1Service,
): HomepageConfiguration {
  const configuration = homepageConfigurationSchema.parse(input);
  for (const section of configuration.sections) {
    if (section.type !== "universe_explorer") continue;
    for (const subsection of section.settings.universeSubsections || []) {
      const category = taxonomy.findCategory(subsection.categoryId);
      if (!category || category.parentId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Chaque sous-section d’univers doit cibler une catégorie racine active.",
        });
      }
      if (!subsection.marketCodes.includes(configuration.marketCode)) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Une sous-section d’univers doit inclure le marché de sa configuration.",
        });
      }
    }
  }
  return configuration;
}

const thresholdMetadata = (eligibleListingCount: number, minimum: number) => {
  const suppressed = eligibleListingCount < minimum;
  return {
    eligibleListingCount,
    suppressed,
    suppressionReason: suppressed
      ? ("BELOW_MINIMUM_LISTINGS" as const)
      : undefined,
  };
};

function selectHomepageDeals(
  listings: Listing[],
  marketCode: string,
  settings: HomepageSectionSettings,
  limit: number,
  taxonomy: TaxonomyV1Service,
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
          listing: toPublicListing(listing, taxonomy),
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

  async saveDraft(input: {
    configuration: HomepageConfiguration;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration> {
    const configuration = validateConfiguration(
      input.configuration,
      await taxonomyV1Service.snapshot(),
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
      validateConfiguration(configuration, await taxonomyV1Service.snapshot()),
      query,
      true,
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
    includeSuppressed = false,
  ) {
    const query = normalizeScope(input);
    const taxonomy = await taxonomyV1Service.snapshot();
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
      ["deals", "recent_listings", "universe_explorer"].includes(section.type),
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
            const topics = trending.topics.filter(
              (topic) => topic.listings.length >= section.minimumListingCount,
            );
            const eligibleListingCount = new Set(
              topics.flatMap((topic) =>
                topic.listings.map((listing) => listing.id),
              ),
            ).size;
            const threshold = thresholdMetadata(
              eligibleListingCount,
              section.minimumListingCount,
            );
            return {
              ...section,
              status:
                trending.enabled && topics.length && !threshold.suppressed
                  ? "ready"
                  : "empty",
              ...threshold,
              trending: { ...trending, topics },
            };
          }
          if (section.type === "deals") {
            if (listingsUnavailable) throw new Error("Listings unavailable");
            const eligibleDeals = selectHomepageDeals(
              listings.items,
              query.marketCode,
              section.settings,
              Math.max(section.maxItems, section.minimumListingCount),
              taxonomy,
              query.now,
            );
            const threshold = thresholdMetadata(
              eligibleDeals.length,
              section.minimumListingCount,
            );
            return {
              ...section,
              status:
                eligibleDeals.length && !threshold.suppressed
                  ? "ready"
                  : "empty",
              ...threshold,
              deals: threshold.suppressed
                ? []
                : eligibleDeals.slice(0, section.maxItems),
            };
          }
          if (section.type === "recent_listings") {
            if (listingsUnavailable) throw new Error("Listings unavailable");
            const eligible = listings.items.filter(
              (listing) =>
                listing.status === "published" &&
                listingBelongsToMarket(listing, query.marketCode),
            );
            const threshold = thresholdMetadata(
              eligible.length,
              section.minimumListingCount,
            );
            return {
              ...section,
              status:
                eligible.length && !threshold.suppressed ? "ready" : "empty",
              ...threshold,
              listings: threshold.suppressed
                ? []
                : eligible
                    .slice(0, section.maxItems)
                    .map((listing) => toPublicListing(listing, taxonomy)),
            };
          }
          if (section.type === "universe_explorer") {
            if (listingsUnavailable) throw new Error("Listings unavailable");
            const eligible = listings.items.filter(
              (listing) =>
                listing.status === "published" &&
                listingBelongsToMarket(listing, query.marketCode),
            );
            const allGroups = (section.settings.universeSubsections || [])
              .filter(
                (subsection) =>
                  subsection.enabled &&
                  subsection.marketCodes.includes(query.marketCode),
              )
              .sort((left, right) => left.order - right.order)
              .slice(0, section.maxItems)
              .map((subsection): HomepageUniverseGroup => {
                const matching = eligible.filter((listing) =>
                  listingBelongsToCategory(
                    listing,
                    subsection.categoryId,
                    taxonomy,
                  ),
                );
                const suppressed =
                  matching.length < subsection.minimumListingCount;
                return {
                  ...subsection,
                  status: matching.length ? "ready" : "empty",
                  eligibleListingCount: matching.length,
                  suppressed,
                  listings: suppressed
                    ? []
                    : matching
                        .slice(0, subsection.maxItems)
                        .map((listing) => toPublicListing(listing, taxonomy)),
                };
              });
            const universeGroups = includeSuppressed
              ? allGroups
              : allGroups.filter((group) => !group.suppressed);
            const eligibleListingCount = allGroups.reduce(
              (total, group) => total + group.eligibleListingCount,
              0,
            );
            const threshold = thresholdMetadata(
              eligibleListingCount,
              section.minimumListingCount,
            );
            const hasEligibleGroup = allGroups.some(
              (group) => !group.suppressed,
            );
            const suppressed = threshold.suppressed || !hasEligibleGroup;
            return {
              ...section,
              status:
                hasEligibleGroup && !threshold.suppressed ? "ready" : "empty",
              ...threshold,
              suppressed,
              suppressionReason: suppressed
                ? "BELOW_MINIMUM_LISTINGS"
                : undefined,
              universeGroups,
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
    return {
      ...resolved,
      sections: includeSuppressed
        ? sections
        : sections.filter((section) => !section.suppressed),
    };
  }
}

export const homepageService = new HomepageService();
