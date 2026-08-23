import { randomUUID } from "node:crypto";
import type { DiscoveryDocument, DiscoveryRequest } from "@shongre/shared";
import {
  DEFAULT_DISCOVERY_CONFIGURATION,
  runUnifiedDiscovery,
  scoreOrganicListing,
} from "@shongre/shared";
import {
  discoveryConfigurationSchema,
  type DiscoveryConfiguration,
  type PublisherVerificationStatus,
} from "@shongre/contracts";
import type {
  Listing,
  SearchFilters,
  UserProfile,
} from "../../shared/types/index.js";
import {
  IListingRepository,
  IDiscoveryConfigurationRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface DiscoverySearchResult {
  items: Listing[];
  total: number;
  page: number;
  totalPages: number;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
  requestId: string;
  rankingVersion: string;
}

function verificationStatus(listing: Listing): PublisherVerificationStatus {
  if (listing.publisherVerificationStatus)
    return listing.publisherVerificationStatus;
  const seller = listing.seller;
  if (seller?.status === "suspended") return "suspended";
  if (listing.publisherType === "professional" && seller?.isBusinessVerified) {
    return "business_verified";
  }
  if (seller?.isIdentityVerified) return "identity_verified";
  if (seller?.isPhoneVerified) return "phone_verified";
  if (seller?.isEmailVerified) return "email_verified";
  return "unverified";
}

function accountAgeDays(seller?: UserProfile): number | undefined {
  if (!seller?.createdAt) return undefined;
  return Math.max(
    0,
    (Date.now() - new Date(seller.createdAt).getTime()) / 86_400_000,
  );
}

export function toDiscoveryDocument(listing: Listing): DiscoveryDocument {
  const publisherType =
    listing.publisherType ||
    (listing.publisherOrganizationId ||
    listing.seller?.accountType === "professional"
      ? "professional"
      : "private");
  const attributes = Object.values(listing.attributes || {}).filter(
    (value): value is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof value),
  );
  const recommendedTotal = Number(
    listing.attributes?.recommendedFieldCount || attributes.length,
  );
  const recommendedComplete = Number(
    listing.attributes?.recommendedFieldCompleteCount ||
      attributes.filter(Boolean).length,
  );
  const promotionState = listing.promotionState || "inactive";
  const promotion = listing.promotionType
    ? {
        state: promotionState,
        type: listing.promotionType,
        source: listing.promotionSource,
        sourceId: listing.promotionSourceId,
        startsAt: listing.promotionStartAt,
        endsAt: listing.promotionEndAt,
        promotedAt: listing.promotedAt,
        label: listing.promotionLabel,
      }
    : undefined;
  return {
    id: listing.id,
    publisherId:
      listing.publisherOrganizationId ||
      listing.publisherUserId ||
      listing.sellerId,
    publisherType,
    marketCodes: Array.isArray(listing.attributes?.marketCodes)
      ? listing.attributes.marketCodes.map(String)
      : [listing.marketCode],
    categoryId: listing.categoryId,
    categoryPath: Array.isArray(listing.attributes?.categoryPath)
      ? listing.attributes.categoryPath.map(String)
      : undefined,
    title: listing.title,
    description: listing.description,
    searchableAttributes: attributes,
    priceMinor: Math.round(listing.price * 100),
    currency: listing.currency,
    city: listing.city,
    status: listing.status,
    availability:
      listing.status === "published"
        ? "available"
        : listing.status === "reserved"
          ? "reserved"
          : listing.status === "sold"
            ? "sold"
            : "unavailable",
    moderationStatus:
      listing.status === "flagged"
        ? "pending"
        : listing.status === "rejected"
          ? "rejected"
          : "approved",
    publisherStatus:
      listing.publisherStatus ||
      (listing.seller?.status === "active" || !listing.seller
        ? "active"
        : listing.seller.status === "suspended"
          ? "suspended"
          : "deleted"),
    createdAt: listing.createdAt,
    publishedAt: listing.publishedAt || listing.createdAt,
    materiallyUpdatedAt: listing.materiallyUpdatedAt,
    organicFreshnessAt:
      listing.organicFreshnessAt || listing.publishedAt || listing.createdAt,
    externalStockId: listing.externalStockId,
    duplicateGroupId: listing.duplicateGroupId,
    quality: {
      requiredFieldsComplete: Boolean(
        listing.title &&
        listing.description &&
        listing.categoryId &&
        listing.city,
      ),
      recommendedFieldRatio:
        recommendedTotal > 0 ? recommendedComplete / recommendedTotal : 0.5,
      descriptionLength: listing.description.length,
      imageCount: listing.images.length,
      mediaQuality: Number(
        listing.attributes?.mediaQualityScore ||
          (listing.images.length ? 0.7 : 0),
      ),
      taxonomyValid: listing.attributes?.taxonomyValid !== false,
      pricePlausibility: Number(
        listing.attributes?.pricePlausibilityScore || 0.7,
      ),
    },
    trust: {
      verificationStatus: verificationStatus(listing),
      accountAgeDays: accountAgeDays(listing.seller),
      rating: listing.seller?.rating,
      reviewCount: listing.seller?.reviewCount,
      responseRate: listing.seller?.responseRatePercent,
      successfulActivityCount: Number(
        listing.attributes?.successfulActivityCount || 0,
      ),
      confirmedReportCount: Number(
        listing.attributes?.confirmedReportCount || 0,
      ),
    },
    promotion,
  };
}

function normalizePublisherType(
  value: SearchFilters["sellerType"] | undefined,
): DiscoveryRequest["publisherType"] {
  if (value === "individual") return "private";
  if (value === "pro") return "professional";
  return value;
}

function normalizeSort(
  sort: SearchFilters["sortBy"],
): DiscoveryRequest["sort"] {
  if (sort === "date_desc") return "recent";
  if (sort === "distance") return "relevance";
  return sort;
}

/**
 * One pipeline for private and professional inventory. Repositories retrieve
 * eligible candidates; this service owns organic scoring, duplicate
 * suppression, diversity and controlled sponsored insertion.
 */
export class UnifiedDiscoveryService {
  constructor(
    private readonly listingRepository: IListingRepository = repositories.listings,
    private readonly configurationRepository: IDiscoveryConfigurationRepository = repositories.discoveryConfiguration,
    private readonly fallbackConfiguration: DiscoveryConfiguration = DEFAULT_DISCOVERY_CONFIGURATION,
  ) {}

  async getEffectiveConfiguration(
    marketCode = "FR",
    categoryId?: string,
    context: DiscoveryConfiguration["context"] = "search",
  ): Promise<DiscoveryConfiguration> {
    return (
      (await this.configurationRepository.getActive(
        marketCode,
        categoryId,
        context,
      )) || { ...this.fallbackConfiguration, marketCode, categoryId, context }
    );
  }

  async explainListing(listingId: string, filters: SearchFilters = {}) {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) return null;
    const configuration = await this.getEffectiveConfiguration(
      filters.marketCode || listing.marketCode,
      filters.categoryId || listing.categoryId,
      "search",
    );
    return {
      listingId,
      publisherType:
        listing.publisherType ||
        (listing.publisherOrganizationId ? "professional" : "private"),
      rankingVersion: configuration.version,
      explanation: scoreOrganicListing(
        toDiscoveryDocument(listing),
        {
          requestId: `admin-explain:${listingId}`,
          marketCode: filters.marketCode || listing.marketCode,
          query: filters.query,
          categoryId: filters.categoryId,
          city: filters.city,
        },
        configuration,
      ),
      excludedSignals: [
        "subscriptionTier",
        "subscriptionPrice",
        "promotionSpend",
        "publisherType",
      ],
    };
  }

  async saveConfigurationVersion(
    rawConfiguration: unknown,
    input: { actorUserId: string; changeReason: string; activate: boolean },
  ): Promise<DiscoveryConfiguration> {
    const configuration = discoveryConfigurationSchema.parse(rawConfiguration);
    if (!input.changeReason?.trim()) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de modification est requis.",
      });
    }
    return this.configurationRepository.saveVersion(configuration, {
      ...input,
      changeReason: input.changeReason.trim(),
    });
  }

  async getMetrics(marketCode = "FR", since?: string) {
    return this.configurationRepository.getMetrics(marketCode, since);
  }

  async search(filters: SearchFilters = {}): Promise<DiscoverySearchResult> {
    const startedAt = Date.now();
    const requestId = randomUUID();
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.max(1, Math.min(50, Number(filters.limit || 20)));
    // Bounded retrieval avoids loading the catalog while keeping ranking and
    // diversification stable across the first discovery pages.
    const candidates = await this.listingRepository.search({
      ...filters,
      sellerType: undefined,
      sortBy: "recent",
      page: 1,
      limit: 500,
    });
    const request: DiscoveryRequest = {
      requestId,
      marketCode: filters.marketCode || "FR",
      query: filters.query,
      categoryId: filters.categoryId || filters.categorySlug,
      city: filters.city,
      publisherType: normalizePublisherType(filters.sellerType),
      sort: normalizeSort(filters.sortBy) || "relevance",
      page,
      pageSize,
    };
    const configuration = await this.getEffectiveConfiguration(
      request.marketCode,
      request.categoryId,
      "search",
    );
    const ranked = runUnifiedDiscovery(
      candidates.items.map(toDiscoveryDocument),
      request,
      configuration,
    );
    const listingsById = new Map(
      candidates.items.map((listing) => [listing.id, listing]),
    );
    const items = ranked.items.flatMap((item) => {
      const listing = listingsById.get(item.document.id);
      return listing ? [{ ...listing, discovery: item.presentation }] : [];
    });
    logger.info("unified_discovery_completed", ranked.event);
    try {
      await this.configurationRepository.recordEvent(ranked.event, {
        categoryId: request.categoryId,
        appliedFilterKeys: Object.entries(filters)
          .filter(
            ([, value]) =>
              value !== undefined && value !== null && value !== "",
          )
          .map(([key]) => key),
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      logger.error("unified_discovery_event_persist_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    return {
      items,
      total: ranked.totalResults,
      page: ranked.page,
      totalPages: ranked.totalPages,
      pageInfo: {
        hasNextPage: ranked.hasNextPage,
        nextCursor: ranked.nextCursor,
      },
      requestId,
      rankingVersion: ranked.event.rankingVersion,
    };
  }
}

export const unifiedDiscoveryService = new UnifiedDiscoveryService();
