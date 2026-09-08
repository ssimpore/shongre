import { createHash, randomUUID } from "node:crypto";
import type { DiscoveryDocument, DiscoveryRequest } from "@shongre/shared";
import {
  DEFAULT_DISCOVERY_CONFIGURATION,
  majorToMinorAmount,
  minorToMajorAmount,
  runUnifiedDiscovery,
  scoreOrganicListing,
} from "@shongre/shared";
import { taxonomyV4Service } from "../taxonomy/taxonomy.runtime.js";
import {
  discoveryConfigurationSchema,
  discoveryChangeReasonSchema,
  getCountryConfig,
  type DiscoveryConfiguration,
  type PublisherVerificationStatus,
} from "@shongre/contracts";
import {
  DELIVERY_FEATURE_FLAG_KEY,
  DELIVERY_TAXONOMY_CATEGORY_ID,
  deliveryDiscoveryListingId,
  deliveryMarketActivationIssues,
  type DeliveryPublicRequest,
} from "@shongre/contracts/delivery";
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
import type { DeliveryRepository } from "../../infrastructure/database/repositories/delivery.repository.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMarketCode } from "../../shared/market/market-code.js";
import {
  featureFlagService,
  type FeatureFlagService,
} from "../feature-flags/feature-flag.service.js";
import { GUEST_PRINCIPAL } from "../../shared/auth/principal.js";

export interface DiscoverySearchResult {
  items: Listing[];
  total: number;
  page: number;
  totalPages: number;
  totalRelation: "exact" | "lower_bound";
  snapshotAt: string;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
  requestId: string;
  rankingVersion: string;
}

interface DiscoveryCursorPayload {
  version: 1;
  snapshotAt: string;
  filterHash: string;
  page: number;
  windowPage: number;
  after?: { sortDate: string; listingId: string; priceMinor?: number };
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(stableJsonValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableJsonValue(nested)]),
    );
  }
  return value;
}

function discoveryFilterHash(filters: SearchFilters): string {
  const { cursor: _cursor, page: _page, ...stableFilters } = filters;
  return createHash("sha256")
    .update(JSON.stringify(stableJsonValue(stableFilters)))
    .digest("base64url")
    .slice(0, 22);
}

function encodeDiscoveryCursor(payload: DiscoveryCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeDiscoveryCursor(
  cursor: string | undefined,
  expectedFilterHash: string,
): DiscoveryCursorPayload | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as DiscoveryCursorPayload;
    const snapshot = Date.parse(parsed.snapshotAt);
    if (
      parsed.version !== 1 ||
      parsed.filterHash !== expectedFilterHash ||
      !Number.isInteger(parsed.page) ||
      parsed.page < 1 ||
      !Number.isInteger(parsed.windowPage) ||
      parsed.windowPage < 1 ||
      !Number.isFinite(snapshot) ||
      snapshot > Date.now() + 300_000 ||
      (parsed.after &&
        (!parsed.after.listingId ||
          !Number.isFinite(Date.parse(parsed.after.sortDate)) ||
          (parsed.after.priceMinor !== undefined &&
            !Number.isFinite(parsed.after.priceMinor))))
    ) {
      throw new Error("invalid cursor payload");
    }
    return parsed;
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message:
        "Le curseur de recherche est invalide ou ne correspond plus aux filtres.",
    });
  }
}

function matchesDiscoveryAttributes(
  listing: Listing,
  attributes: SearchFilters["attributes"],
): boolean {
  if (!attributes) return true;
  return Object.entries(attributes).every(([key, criterion]) => {
    const actual = listing.attributes?.[key];
    if (actual === undefined || actual === null) return false;
    if (Array.isArray(criterion)) {
      const actualValues = Array.isArray(actual) ? actual : [actual];
      return criterion.some((value) =>
        actualValues.some((entry) => String(entry) === String(value)),
      );
    }
    if (criterion && typeof criterion === "object") {
      const range = criterion as { min?: number; max?: number };
      const numeric = Number(actual);
      return (
        Number.isFinite(numeric) &&
        (range.min === undefined || numeric >= range.min) &&
        (range.max === undefined || numeric <= range.max)
      );
    }
    return String(actual) === String(criterion);
  });
}

function matchesDiscoveryFilters(
  listing: Listing,
  filters: SearchFilters,
  snapshotAt: string,
): boolean {
  if (filters.postalCode && listing.postalCode !== filters.postalCode) {
    return false;
  }
  if (
    filters.conditions?.length &&
    !filters.conditions.includes(listing.condition)
  ) {
    return false;
  }
  if (
    filters.publishedToday &&
    Date.parse(
      listing.publishedAt || listing.organicFreshnessAt || listing.createdAt,
    ) <
      Date.parse(snapshotAt) - 86_400_000
  ) {
    return false;
  }
  if (
    filters.deliveryAvailable &&
    !listing.allowedDelivery.some((method) => method !== "hand_delivery")
  ) {
    return false;
  }
  if (
    filters.onlinePaymentAvailable &&
    !listing.marketPublications?.some(
      (publication) => publication.availableServices?.online_payment === true,
    )
  ) {
    return false;
  }
  if (
    filters.onlyDeals &&
    !(listing.originalPrice && listing.originalPrice > listing.price)
  ) {
    return false;
  }
  return matchesDiscoveryAttributes(listing, filters.attributes);
}

export function deliveryRequestToDiscoveryListing(
  request: DeliveryPublicRequest,
): Listing {
  const lifecycleReference = request.publishedAt || request.expiresAt;
  const currency =
    request.budget?.currency || getCountryConfig(request.marketCode)?.currency;
  if (!currency) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le marché de cette demande de livraison est invalide.",
    });
  }
  return {
    id: deliveryDiscoveryListingId(request.id),
    sellerId: `delivery-requester:${request.id}`,
    publisherType: "private",
    publisherVerificationStatus: request.requester.verified
      ? "identity_verified"
      : "unverified",
    publisherStatus: "active",
    categoryId: DELIVERY_TAXONOMY_CATEGORY_ID,
    listingTypeId: `${DELIVERY_TAXONOMY_CATEGORY_ID}.request`,
    listingIntent: "SERVICE_REQUEST",
    title: request.title,
    description: request.description,
    price: minorToMajorAmount(request.budget?.amountMinor ?? 0, currency),
    currency,
    status: "published",
    condition: "not_applicable",
    marketCode: request.marketCode,
    marketCodes: [request.marketCode],
    city: request.pickupLocality.city,
    postalCode: request.pickupLocality.postalCode,
    department: "",
    region: "",
    country: request.marketCode,
    allowedDelivery: [],
    images: [],
    attributes: {
      verticalType: "delivery",
      verticalEntityId: request.id,
      canonicalPath: `/livraison/demande/${request.id}`,
      categoryPath: [
        "services",
        "services.local_services",
        DELIVERY_TAXONOMY_CATEGORY_ID,
      ],
      originType: request.origin,
      pickupCity: request.pickupLocality.city,
      pickupPostalCode: request.pickupLocality.postalCode,
      dropoffCity: request.dropoffLocality.city,
      dropoffPostalCode: request.dropoffLocality.postalCode,
      packageType: request.package.type,
      approximateWeightGrams: request.package.approximateWeightGrams,
      handlingRequirements: request.package.handlingRequirements,
      requiredVehicleType: request.package.requiredVehicleType,
      applicationCount: request.applicationCount,
      price_type: request.budget ? "fixed" : "on_request",
      taxonomyValid: true,
    },
    publishedAt: request.publishedAt,
    organicFreshnessAt: lifecycleReference,
    createdAt: lifecycleReference,
    updatedAt: lifecycleReference,
    expiresAt: request.expiresAt,
    viewCount: 0,
    favoriteCount: 0,
  };
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
    priceMinor: majorToMinorAmount(listing.price, listing.currency),
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
    private readonly deliveryRepository: DeliveryRepository = repositories.delivery,
    private readonly flags: FeatureFlagService = featureFlagService,
  ) {}

  private async getDeliveryCandidates(
    filters: SearchFilters,
  ): Promise<Listing[]> {
    const marketCode = requireMarketCode(filters.marketCode);
    const country = getCountryConfig(marketCode);
    if (!country || deliveryMarketActivationIssues(country).length) return [];
    const flag = await this.flags.evaluatePublic(
      GUEST_PRINCIPAL,
      DELIVERY_FEATURE_FLAG_KEY,
      { marketCode },
    );
    if (!flag.enabled) return [];
    const page = await this.deliveryRepository.searchPublic({
      marketCode,
      pickupPostalCode: filters.postalCode,
      limit: 50,
    });
    return page.items
      .filter((request) => {
        const price = minorToMajorAmount(
          request.budget?.amountMinor ?? 0,
          request.budget?.currency || country.currency,
        );
        if (filters.minPrice !== undefined && price < filters.minPrice)
          return false;
        if (filters.maxPrice !== undefined && price > filters.maxPrice)
          return false;
        if (filters.condition && filters.condition !== "not_applicable")
          return false;
        return true;
      })
      .map(deliveryRequestToDiscoveryListing);
  }

  async getEffectiveConfiguration(
    marketCode: string,
    categoryId?: string,
    context: DiscoveryConfiguration["context"] = "search",
  ): Promise<DiscoveryConfiguration> {
    const resolvedMarketCode = requireMarketCode(marketCode);
    return (
      (await this.configurationRepository.getActive(
        resolvedMarketCode,
        categoryId,
        context,
      )) || {
        ...this.fallbackConfiguration,
        marketCode: resolvedMarketCode,
        categoryId,
        context,
      }
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
    const reason = discoveryChangeReasonSchema.safeParse(input.changeReason);
    if (!reason.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de modification détaillé est requis.",
      });
    }
    return this.configurationRepository.saveVersion(configuration, {
      ...input,
      changeReason: reason.data,
    });
  }

  async getMetrics(marketCode: string, since?: string) {
    return this.configurationRepository.getMetrics(
      requireMarketCode(marketCode),
      since,
    );
  }

  async search(filters: SearchFilters = {}): Promise<DiscoverySearchResult> {
    const startedAt = Date.now();
    const requestId = randomUUID();
    const pageSize = Math.max(1, Math.min(50, Number(filters.limit || 20)));
    const filterHash = discoveryFilterHash(filters);
    const cursor = decodeDiscoveryCursor(filters.cursor, filterHash);
    const page = cursor?.page || Math.max(1, Number(filters.page || 1));
    const windowPage = cursor?.windowPage || page;
    const marketCode = requireMarketCode(filters.marketCode);
    const snapshotAt = cursor?.snapshotAt || new Date().toISOString();
    const requestedCategory =
      filters.categoryId || filters.subCategorySlug || filters.categorySlug;
    const taxonomy = await taxonomyV4Service.snapshot();
    const categoryId = requestedCategory
      ? (taxonomy.findCategory(requestedCategory)?.id ?? requestedCategory)
      : undefined;
    const candidateFilters: SearchFilters = {
      ...filters,
      categoryId,
      page: undefined,
      cursor: undefined,
    };
    const request: DiscoveryRequest = {
      requestId,
      marketCode,
      query: filters.query,
      categoryId,
      city: filters.city,
      publisherType: normalizePublisherType(filters.sellerType),
      sort: normalizeSort(filters.sortBy) || "relevance",
      page: windowPage,
      pageSize,
      now: snapshotAt,
    };

    // The database returns a narrow, stable and strictly bounded projection.
    // Only the final page IDs are hydrated below.
    const [candidates, deliveryCandidates, configuration] = await Promise.all([
      this.listingRepository.searchDiscoveryCandidates(candidateFilters, {
        limit: config.performance.discoveryCandidateLimit,
        snapshotAt,
        after: cursor?.after,
      }),
      cursor?.after ? Promise.resolve([]) : this.getDeliveryCandidates(filters),
      this.getEffectiveConfiguration(marketCode, request.categoryId, "search"),
    ]);
    const filteredCandidates = candidates.items.filter((listing) =>
      matchesDiscoveryFilters(listing, candidateFilters, snapshotAt),
    );
    const filteredDeliveryCandidates = deliveryCandidates.filter((listing) =>
      matchesDiscoveryFilters(listing, candidateFilters, snapshotAt),
    );
    const ranked = runUnifiedDiscovery(
      [...filteredCandidates, ...filteredDeliveryCandidates].map(
        toDiscoveryDocument,
      ),
      request,
      configuration,
    );
    const deliveryById = new Map(
      filteredDeliveryCandidates.map((listing) => [listing.id, listing]),
    );
    const databaseIds = ranked.items
      .map((item) => item.document.id)
      .filter((id) => !deliveryById.has(id));
    const hydratedListings = await this.listingRepository.findPublicByIds(
      databaseIds,
      marketCode,
    );
    const listingsById = new Map([
      ...hydratedListings.map((listing) => [listing.id, listing] as const),
      ...deliveryById.entries(),
    ]);
    const items = ranked.items.flatMap((item) => {
      const listing = listingsById.get(item.document.id);
      return listing ? [{ ...listing, discovery: item.presentation }] : [];
    });
    const hasNextPage = ranked.hasNextPage || candidates.hasMore;
    const nextCursor = hasNextPage
      ? encodeDiscoveryCursor({
          version: 1,
          snapshotAt: candidates.snapshotAt,
          filterHash,
          page: page + 1,
          windowPage: ranked.hasNextPage ? windowPage + 1 : 1,
          after: ranked.hasNextPage ? cursor?.after : candidates.lastCandidate,
        })
      : undefined;
    const previousWindowPages = Math.max(0, page - windowPage);
    const totalRelation =
      Boolean(cursor?.after) ||
      candidates.hasMore ||
      filteredDeliveryCandidates.length === 50
        ? "lower_bound"
        : "exact";
    const total =
      previousWindowPages * pageSize +
      ranked.totalResults +
      (candidates.hasMore ? 1 : 0);
    const totalPages = Math.max(
      page,
      previousWindowPages + ranked.totalPages + (candidates.hasMore ? 1 : 0),
    );
    logger.info("unified_discovery_completed", {
      ...ranked.event,
      candidateProjection: "narrow",
      hydratedCount: hydratedListings.length,
      candidateWindowHasMore: candidates.hasMore,
      totalRelation,
    });
    try {
      await this.configurationRepository.enqueueEvent(ranked.event, {
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
      logger.error("unified_discovery_event_enqueue_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    return {
      items,
      total,
      page,
      totalPages,
      totalRelation,
      snapshotAt: candidates.snapshotAt,
      pageInfo: {
        hasNextPage,
        nextCursor,
      },
      requestId,
      rankingVersion: ranked.event.rankingVersion,
    };
  }
}

export const unifiedDiscoveryService = new UnifiedDiscoveryService();
