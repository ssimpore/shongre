import {
  Listing,
  ListingMarketPublication,
  SearchFilters,
  DeliveryType,
} from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import { databaseFailure } from "./repository-error.js";
import {
  getCurrencyMinorUnitDigits,
  minorToMajorAmount,
  normalizeSearchText,
  SEARCH_VOCABULARY_STOPWORDS,
  searchVocabularyTerms,
  trigramSimilarity,
} from "@shongre/shared";
import { getCountryConfig } from "@shongre/contracts";
import {
  boundingBoxContains,
  distanceKmBetween,
  isValidCoordinate,
} from "@shongre/contracts/geospatial";
import { logger } from "../../logging/logger.js";
import { retryDatabaseSerializationFailure } from "../serialization-retry.js";

const FEATURED_PROMOTION_TYPES = new Set([
  "featured",
  "top_placement",
  "sponsored_search",
  "homepage_spotlight",
  "category_spotlight",
  "local_spotlight",
  "seller_spotlight",
]);

function isEffectiveMarketPromotion(
  publication: ListingMarketPublication | undefined,
): publication is ListingMarketPublication & {
  promotionState: "active";
  promotionType: NonNullable<Listing["promotionType"]>;
  promotionSource: NonNullable<Listing["promotionSource"]>;
  promotionSourceId: string;
  promotionStartAt: string;
  promotionEndAt: string;
} {
  if (
    publication?.promotionState !== "active" ||
    !publication.promotionType ||
    !publication.promotionSource ||
    !publication.promotionSourceId?.trim() ||
    !publication.promotionStartAt ||
    !publication.promotionEndAt
  ) {
    return false;
  }
  const now = Date.now();
  const startsAt = new Date(publication.promotionStartAt).getTime();
  const endsAt = new Date(publication.promotionEndAt).getTime();
  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt <= now &&
    endsAt > now
  );
}

export interface ListingPriceEstimate {
  basis: "sold" | "asking";
  sampleSize: number;
  currency: string;
  p25Minor: number;
  medianMinor: number;
  p75Minor: number;
  /** Which of brand, model and condition the sample was narrowed by. */
  narrowedBy: Array<"brand" | "model" | "condition">;
}

export interface SearchTermSuggestion {
  /** Unaccented lower-case key the visitor's typing was matched against. */
  term: string;
  /** The catalogue's own spelling, shown back to the visitor. */
  label: string;
  listingCount: number;
  matchKind: "prefix" | "fuzzy";
}

/*
 * The fixture ranks the way `suggest_listing_search_terms` and
 * `correct_listing_search_query` do, with the same thresholds, so the browser
 * suite exercises the same behaviour production has.
 */
const SUGGESTION_SIMILARITY_THRESHOLD = 0.35;
const CORRECTION_SIMILARITY_THRESHOLD = 0.4;

export interface IListingRepository {
  findById(id: string): Promise<Listing | null>;
  findOwnedBySeller(
    sellerId: string,
    marketCode: string,
  ): Promise<{ items: Listing[]; total: number }>;
  findPublicById(id: string, marketCode: string): Promise<Listing | null>;
  findPublicByIds(
    ids: readonly string[],
    marketCode: string,
  ): Promise<Listing[]>;
  search(filter: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  searchDiscoveryCandidates(
    filter: SearchFilters,
    options: {
      limit: number;
      snapshotAt?: string;
      after?: {
        sortDate: string;
        listingId: string;
        priceMinor?: number;
      };
    },
  ): Promise<{
    items: Listing[];
    snapshotAt: string;
    hasMore: boolean;
    lastCandidate?: {
      sortDate: string;
      listingId: string;
      priceMinor?: number;
    };
  }>;
  save(listing: Listing): Promise<Listing>;
  update(id: string, updates: Partial<Listing>): Promise<Listing>;
  delete(id: string): Promise<boolean>;
  setFavorite(
    userId: string,
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  getFavorites(userId: string, marketCode: string): Promise<string[]>;
  /**
   * Applies pending `listing_viewed` analytics events to `listings.view_count`.
   *
   * Views are counted here rather than on the listing response because the
   * read path must not carry a write, and rather than by recomputing from the
   * event ledger because analytics retention prunes it. The database owns the
   * watermark, so repeated calls are safe and a partial batch resumes.
   */
  rollUpViewCounts(
    limit?: number,
  ): Promise<{ processedEvents: number; updatedListings: number }>;
  /**
   * Completions for the word being typed, from the market's catalogue
   * vocabulary (migration 00142): prefix matches first, then trigram matches
   * so a misspelt word still completes to something that exists.
   */
  suggestSearchTerms(input: {
    marketCode: string;
    query: string;
    limit: number;
  }): Promise<SearchTermSuggestion[]>;
  /**
   * The nearest known spelling of a query, or null when every word already
   * exists in the market's vocabulary. Meant for a search that found nothing.
   */
  correctSearchQuery(input: {
    marketCode: string;
    query: string;
  }): Promise<string | null>;
  /** Rebuilds one market's vocabulary from its discoverable listings. */
  refreshSearchVocabulary(marketCode: string): Promise<number>;
  /**
   * Extends the expiry of opted-in listings that just expired, up to
   * `maxCycles` renewals each. Answers what was renewed, for the sellers'
   * notifications.
   */
  renewExpiringListings(input: { maxCycles: number; limit: number }): Promise<
    Array<{
      id: string;
      sellerId: string;
      title: string;
      marketCode: string;
      expiresAt: string;
    }>
  >;
  /**
   * What comparable items sold for (or, in a thin market, were listed at):
   * percentiles in minor units over the given categories, narrowed by brand,
   * model and condition while the sample stays meaningful (00145).
   */
  estimatePrice(input: {
    marketCode: string;
    categoryIds: readonly string[];
    brand?: string;
    model?: string;
    condition?: string;
  }): Promise<ListingPriceEstimate | null>;
  /** Publishes drafts whose scheduled time has come. */
  publishScheduledListings(limit: number): Promise<
    Array<{
      id: string;
      sellerId: string;
      title: string;
      marketCode: string;
      status: string;
    }>
  >;
  createDraft(userId: string, marketCode: string): Promise<any>;
  saveDraft(draft: any, userId: string, marketCode: string): Promise<void>;
  getDraft(userId: string, marketCode: string): Promise<any | null>;
}

export const CANONICAL_DEMO_LISTINGS: Record<string, Listing> = {
  list_1: {
    id: "list_1",
    sellerId: "user_camille",
    categoryId: "bicycles",
    title: "Vélo Gravel Specialized Diverge E5",
    description: "Vélo gravel très bon état, révisé en atelier pro.",
    price: 250,
    currency: "EUR",
    status: "published",
    condition: "tres-bon-etat",
    brand: "Specialized",
    model: "Diverge E5",
    marketCode: "FR",
    marketCodes: ["FR", "BE"],
    marketPublications: [
      {
        marketCode: "FR",
        status: "active",
        isPrimary: true,
        priceMinor: 25_000,
        currency: "EUR",
        complianceState: "approved",
        availableServices: { handDelivery: true, relayPoint: true },
        sortDate: "2026-08-24T09:00:00.000Z",
        publishedAt: "2026-08-24T09:00:00.000Z",
      },
      {
        marketCode: "BE",
        status: "active",
        isPrimary: false,
        priceMinor: 26_500,
        currency: "EUR",
        complianceState: "approved",
        availableServices: { handDelivery: true, relayPoint: true },
        sortDate: "2026-08-25T09:00:00.000Z",
        publishedAt: "2026-08-25T09:00:00.000Z",
      },
    ],
    city: "Lyon",
    postalCode: "69002",
    department: "69 - Rhône",
    region: "Auvergne-Rhône-Alpes",
    country: "FR",
    allowedDelivery: ["hand_delivery", "relay_point"],
    shippingCost: 8.5,
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    ],
    isUrgent: false,
    isFeatured: true,
    viewCount: 312,
    favoriteCount: 24,
    attributes: { frame_size: "M", speed_count: 11 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  list_be_1: {
    id: "list_be_1",
    sellerId: "user_camille",
    categoryId: "bicycles",
    title: "Vélo urbain électrique — Bruxelles",
    description: "Vélo électrique entretenu, retrait possible à Bruxelles.",
    price: 1_450,
    currency: "EUR",
    status: "published",
    condition: "tres-bon-etat",
    brand: "Cowboy",
    model: "Classic",
    marketCode: "BE",
    marketCodes: ["BE"],
    marketPublications: [
      {
        marketCode: "BE",
        status: "active",
        isPrimary: true,
        priceMinor: 145_000,
        currency: "EUR",
        complianceState: "approved",
        availableServices: { handDelivery: true },
        sortDate: "2026-08-25T10:00:00.000Z",
        publishedAt: "2026-08-25T10:00:00.000Z",
      },
    ],
    city: "Bruxelles",
    postalCode: "1000",
    region: "Bruxelles-Capitale",
    country: "BE",
    allowedDelivery: ["hand_delivery"],
    shippingCost: 0,
    images: [
      "https://images.unsplash.com/photo-1571333250630-f0230c320b6d?auto=format&fit=crop&w=800&q=80",
    ],
    isUrgent: false,
    isFeatured: false,
    viewCount: 87,
    favoriteCount: 9,
    attributes: { assistance: "electric" },
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
    expiresAt: "2026-10-24T10:00:00.000Z",
  },
  /*
   * Switzerland is an open market that had no inventory in either scenario, so
   * its discovery path had never been rendered — a market sweep found it by
   * opening /ch/recherche and getting an empty page. Its own listing rather
   * than a cross-publication of the canonical one, because `list_1`'s market
   * boundary is itself a fixture: several tests use "not published to CH" as
   * their example of a market a listing is not in.
   */
  list_ch_1: {
    id: "list_ch_1",
    sellerId: "user_camille",
    categoryId: "bicycles",
    title: "Vélo de route carbone — Lausanne",
    description: "Vélo de route révisé, retrait possible à Lausanne.",
    price: 1_890,
    currency: "CHF",
    status: "published",
    condition: "tres-bon-etat",
    brand: "Scott",
    model: "Addict",
    marketCode: "CH",
    marketCodes: ["CH"],
    marketPublications: [
      {
        marketCode: "CH",
        status: "active",
        isPrimary: true,
        priceMinor: 189_000,
        currency: "CHF",
        complianceState: "approved",
        availableServices: { handDelivery: true },
        sortDate: "2026-08-26T10:00:00.000Z",
        publishedAt: "2026-08-26T10:00:00.000Z",
      },
    ],
    city: "Lausanne",
    postalCode: "1000",
    region: "Vaud",
    country: "CH",
    allowedDelivery: ["hand_delivery"],
    shippingCost: 0,
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    ],
    isUrgent: false,
    isFeatured: false,
    viewCount: 64,
    favoriteCount: 5,
    attributes: { frame_size: "M" },
    createdAt: "2026-08-26T10:00:00.000Z",
    updatedAt: "2026-08-26T10:00:00.000Z",
    expiresAt: "2026-10-25T10:00:00.000Z",
  },
  list_digital_file: {
    id: "list_digital_file",
    sellerId: "user_camille",
    categoryId: "digital_products.downloads.documents",
    listingTypeId: "digital_products.downloads.documents.listing",
    listingIntent: "SELL",
    title: "Guide PDF — organisation du studio",
    description:
      "Scénario de démonstration d’un produit téléchargeable après confirmation du paiement.",
    price: 29,
    currency: "EUR",
    status: "published",
    condition: "new",
    marketCode: "FR",
    marketCodes: ["FR"],
    marketPublications: [
      {
        marketCode: "FR",
        status: "active",
        isPrimary: true,
        priceMinor: 2_900,
        currency: "EUR",
        complianceState: "approved",
        availableServices: { digital: true },
        sortDate: "2026-09-01T08:00:00.000Z",
        publishedAt: "2026-09-01T08:00:00.000Z",
      },
    ],
    city: "En ligne",
    postalCode: "00000",
    country: "FR",
    allowedDelivery: ["digital"],
    shippingCost: 0,
    fulfillmentModel: "FILE_DOWNLOAD",
    digitalFulfillmentVersionId: "40000000-0000-4000-8000-000000000001",
    productVersion: "2026.09-demo",
    images: [
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=800&q=80",
    ],
    isUrgent: false,
    isFeatured: false,
    viewCount: 41,
    favoriteCount: 6,
    attributes: { simulated: true },
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    publishedAt: "2026-09-01T08:00:00.000Z",
    expiresAt: "2026-10-31T08:00:00.000Z",
  },
};

function projectMarketPublication(
  listing: Listing,
  publication: ListingMarketPublication,
  restrictToPublication = false,
): Listing {
  const usesUnambiguousLegacyPromotion = Boolean(
    publication.promotionState === undefined &&
    listing.marketPublications?.length === 1 &&
    listing.marketCode === publication.marketCode,
  );
  const scopedPublication: ListingMarketPublication =
    usesUnambiguousLegacyPromotion
      ? {
          ...publication,
          promotionState:
            listing.promotionState === "active" ? "active" : "inactive",
          promotionType: listing.promotionType,
          promotionSource: listing.promotionSource,
          promotionSourceId: listing.promotionSourceId,
          promotionLabel: listing.promotionLabel,
          promotionStartAt: listing.promotionStartAt,
          promotionEndAt: listing.promotionEndAt,
          promotedAt: listing.promotedAt,
        }
      : publication;
  const hasEffectivePromotion = isEffectiveMarketPromotion(scopedPublication);
  const legacyInactiveLifecycle =
    usesUnambiguousLegacyPromotion && listing.promotionState !== "active"
      ? listing.promotionState
      : undefined;
  const effectivePublication: ListingMarketPublication = {
    ...scopedPublication,
    promotionState: hasEffectivePromotion ? "active" : "inactive",
    promotionType: hasEffectivePromotion
      ? scopedPublication.promotionType
      : undefined,
    promotionSource: hasEffectivePromotion
      ? scopedPublication.promotionSource
      : undefined,
    promotionSourceId: hasEffectivePromotion
      ? scopedPublication.promotionSourceId
      : undefined,
    promotionLabel: hasEffectivePromotion
      ? scopedPublication.promotionLabel
      : undefined,
    promotionStartAt: hasEffectivePromotion
      ? scopedPublication.promotionStartAt
      : undefined,
    promotionEndAt: hasEffectivePromotion
      ? scopedPublication.promotionEndAt
      : undefined,
    promotedAt: hasEffectivePromotion
      ? scopedPublication.promotedAt
      : undefined,
  };
  return {
    ...listing,
    marketCode: publication.marketCode,
    marketPublications: restrictToPublication
      ? [effectivePublication]
      : listing.marketPublications,
    price: minorToMajorAmount(publication.priceMinor, publication.currency),
    currency: publication.currency,
    publishedAt: publication.publishedAt,
    organicFreshnessAt: publication.sortDate,
    isUrgent:
      hasEffectivePromotion &&
      scopedPublication.promotionType === "urgent_badge",
    isFeatured:
      hasEffectivePromotion &&
      FEATURED_PROMOTION_TYPES.has(scopedPublication.promotionType),
    promotionState: hasEffectivePromotion
      ? "active"
      : legacyInactiveLifecycle || "inactive",
    promotionType: hasEffectivePromotion
      ? scopedPublication.promotionType
      : undefined,
    promotionSource: hasEffectivePromotion
      ? scopedPublication.promotionSource
      : undefined,
    promotionSourceId: hasEffectivePromotion
      ? scopedPublication.promotionSourceId
      : undefined,
    promotionLabel: hasEffectivePromotion
      ? scopedPublication.promotionLabel
      : undefined,
    promotionStartAt: hasEffectivePromotion
      ? scopedPublication.promotionStartAt
      : undefined,
    promotionEndAt: hasEffectivePromotion
      ? scopedPublication.promotionEndAt
      : undefined,
    promotedAt: hasEffectivePromotion
      ? scopedPublication.promotedAt
      : undefined,
  };
}

export class DemoListingRepository implements IListingRepository {
  private listings: Map<string, Listing> = new Map();
  private favorites: Map<string, Set<string>> = new Map(); // userId:marketCode -> listing ids
  private drafts: Map<string, any> = new Map(); // userId -> draft

  constructor(
    initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS,
  ) {
    this.reset(initialListings);
  }

  reset(initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS) {
    this.listings.clear();
    this.favorites.clear();
    this.drafts.clear();
    Object.values(initialListings).forEach((l) =>
      this.listings.set(l.id, { ...l }),
    );
    this.favorites.set("user_thomas:FR", new Set(["list_1"]));
  }

  async findById(id: string): Promise<Listing | null> {
    const item = this.listings.get(id);
    if (!item) return null;
    const primaryPublication = item.marketPublications?.find(
      (publication) => publication.isPrimary,
    );
    return primaryPublication
      ? projectMarketPublication(item, primaryPublication)
      : { ...item };
  }

  async findOwnedBySeller(
    sellerId: string,
    marketCode: string,
  ): Promise<{ items: Listing[]; total: number }> {
    const requestedMarketCode = requireMarketCode(marketCode);
    const items = Array.from(this.listings.values())
      .filter(
        (listing) =>
          listing.sellerId === sellerId &&
          (listing.marketCode === requestedMarketCode ||
            listing.marketPublications?.some(
              (publication) => publication.marketCode === requestedMarketCode,
            )),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      )
      .map((listing) => ({ ...listing }));
    return { items, total: items.length };
  }

  async findPublicById(
    id: string,
    marketCode: string,
  ): Promise<Listing | null> {
    const item = await this.findById(id);
    if (!item || !["published", "reserved", "sold"].includes(item.status))
      return null;
    const requestedMarketCode = requireMarketCode(marketCode);
    const publication = item.marketPublications?.find(
      (entry) =>
        entry.marketCode === requestedMarketCode &&
        entry.status === "active" &&
        entry.complianceState === "approved",
    );
    if (item.marketPublications?.length && !publication) return null;
    if (!publication && item.marketCode !== requestedMarketCode) return null;
    return publication
      ? projectMarketPublication(item, publication, true)
      : item;
  }

  async findPublicByIds(
    ids: readonly string[],
    marketCode: string,
  ): Promise<Listing[]> {
    const listings = await Promise.all(
      [...new Set(ids)].map((id) => this.findPublicById(id, marketCode)),
    );
    return listings.filter((listing): listing is Listing => Boolean(listing));
  }

  async search(filters: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let result = Array.from(this.listings.values()).filter(
      (listing) => listing.status === "published",
    );

    if (filters.marketCode) {
      const marketCode = requireMarketCode(filters.marketCode);
      result = result.flatMap((listing) => {
        const publication = listing.marketPublications?.find(
          (entry) =>
            entry.marketCode === marketCode &&
            entry.status === "active" &&
            entry.complianceState === "approved",
        );
        if (listing.marketPublications?.length && !publication) return [];
        if (!publication && listing.marketCode !== marketCode) return [];
        return [
          publication
            ? projectMarketPublication(listing, publication, true)
            : listing,
        ];
      });
    }
    if (filters.categoryIds || filters.categoryId) {
      const categoryIds = filters.categoryIds ?? [filters.categoryId!];
      result = result.filter((listing) =>
        categoryIds.includes(listing.categoryId),
      );
    }
    if (filters.sellerId) {
      result = result.filter((l) => l.sellerId === filters.sellerId);
    }
    if (filters.publisherOrganizationId) {
      result = result.filter(
        (l) => l.publisherOrganizationId === filters.publisherOrganizationId,
      );
    }
    if (filters.minPrice !== undefined) {
      result = result.filter((l) => l.price >= (filters.minPrice || 0));
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter((l) => l.price <= (filters.maxPrice || Infinity));
    }
    if (filters.city) {
      const cityQ = normalizeSearchText(filters.city);
      result = result.filter((l) =>
        normalizeSearchText(l.city).includes(cityQ),
      );
    }
    if (filters.query) {
      /*
       * Folded on both sides, because the PostgreSQL path unaccents the search
       * vector and the query. A fixture that only lower-cased answered a
       * different question than production and made "cafe" miss "café".
       */
      const q = normalizeSearchText(filters.query);
      result = q
        ? result.filter(
            (l) =>
              normalizeSearchText(l.title).includes(q) ||
              normalizeSearchText(l.description).includes(q),
          )
        : result;
    }
    /*
     * The same spatial contract the Postgres repository fulfils with PostGIS.
     *
     * Filtering in memory is only correct because this repository holds a
     * fixture, not a market; the browser suite runs against it, so a geographic
     * search that works in production has to be exercisable here too. Distances
     * are attached for the same reason: a caller must not be able to tell the
     * two repositories apart by the shape of what comes back.
     */
    const geoCenter = filters.center;
    if (geoCenter && isValidCoordinate(geoCenter)) {
      result = result.flatMap((listing) => {
        const coordinate = {
          latitude: listing.latitude ?? Number.NaN,
          longitude: listing.longitude ?? Number.NaN,
        };
        if (!isValidCoordinate(coordinate)) return [];
        const distanceKm = distanceKmBetween(geoCenter, coordinate);
        if (filters.radiusKm !== undefined && distanceKm > filters.radiusKm)
          return [];
        return [{ ...listing, distanceKm }];
      });
    }
    if (filters.boundingBox) {
      const box = filters.boundingBox;
      result = result.filter((listing) => {
        const coordinate = {
          latitude: listing.latitude ?? Number.NaN,
          longitude: listing.longitude ?? Number.NaN,
        };
        return (
          isValidCoordinate(coordinate) && boundingBoxContains(box, coordinate)
        );
      });
    }

    if (filters.sortBy === "distance" && geoCenter) {
      result.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );
    } else if (filters.sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(500, filters.limit || 20);
    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    return {
      items: paginated.map((l) => ({ ...l })),
      total: result.length,
      page,
      totalPages: Math.max(1, Math.ceil(result.length / limit)),
    };
  }

  async searchDiscoveryCandidates(
    filters: SearchFilters,
    options: {
      limit: number;
      snapshotAt?: string;
      after?: {
        sortDate: string;
        listingId: string;
        priceMinor?: number;
      };
    },
  ): Promise<{
    items: Listing[];
    snapshotAt: string;
    hasMore: boolean;
    lastCandidate?: {
      sortDate: string;
      listingId: string;
      priceMinor?: number;
    };
  }> {
    const snapshotAt = options.snapshotAt || new Date().toISOString();
    const result = await this.search({
      ...filters,
      page: 1,
      limit: 500,
    });
    const priceAscending = filters.sortBy === "price_asc";
    const priceDescending = filters.sortBy === "price_desc";
    const candidatePool = result.items.filter((listing) => {
      const sortDate =
        listing.marketPublications?.[0]?.sortDate ||
        listing.organicFreshnessAt ||
        listing.publishedAt ||
        listing.createdAt;
      if (sortDate > snapshotAt) return false;
      if (!options.after) return true;
      if (
        (priceAscending || priceDescending) &&
        options.after.priceMinor !== undefined
      ) {
        const factor = 10 ** getCurrencyMinorUnitDigits(listing.currency);
        const priceMinor = Math.round(listing.price * factor);
        return priceAscending
          ? priceMinor > options.after.priceMinor ||
              (priceMinor === options.after.priceMinor &&
                listing.id > options.after.listingId)
          : priceMinor < options.after.priceMinor ||
              (priceMinor === options.after.priceMinor &&
                listing.id < options.after.listingId);
      }
      return (
        sortDate < options.after.sortDate ||
        (sortDate === options.after.sortDate &&
          listing.id < options.after.listingId)
      );
    });
    const eligible = candidatePool.slice(0, options.limit);
    const tail = eligible.at(-1);
    const tailSortDate = tail
      ? tail.marketPublications?.[0]?.sortDate ||
        tail.organicFreshnessAt ||
        tail.publishedAt ||
        tail.createdAt
      : undefined;
    return {
      items: eligible,
      snapshotAt,
      hasMore:
        candidatePool.length > options.limit ||
        result.total > result.items.length,
      lastCandidate:
        tail && tailSortDate
          ? {
              sortDate: tailSortDate,
              listingId: tail.id,
              ...(priceAscending || priceDescending
                ? {
                    priceMinor: Math.round(
                      tail.price *
                        10 ** getCurrencyMinorUnitDigits(tail.currency),
                    ),
                  }
                : {}),
            }
          : undefined,
    };
  }

  async save(listing: Listing): Promise<Listing> {
    this.listings.set(listing.id, { ...listing });
    return { ...listing };
  }

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const existing = this.listings.get(id);
    if (!existing) {
      throw new Error(`Listing ${id} not found in Demo repository`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.listings.delete(id);
  }

  async setFavorite(
    userId: string,
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const normalizedMarketCode = requireMarketCode(marketCode);
    const listing = await this.findPublicById(listingId, normalizedMarketCode);
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    }
    const scopeKey = `${userId}:${normalizedMarketCode}`;
    let userFavs = this.favorites.get(scopeKey);
    if (!userFavs) {
      userFavs = new Set();
      this.favorites.set(scopeKey, userFavs);
    }
    if (!isFavorite) {
      if (userFavs.delete(listingId)) {
        this.adjustFavoriteCount(listingId, userId, -1);
      }
      return false;
    }
    if (!userFavs.has(listingId)) {
      userFavs.add(listingId);
      this.adjustFavoriteCount(listingId, userId, 1);
    }
    return true;
  }

  /**
   * Mirrors the database trigger, which counts one favourite per
   * (user, listing) pair however many markets it was saved in.
   */
  private adjustFavoriteCount(
    listingId: string,
    userId: string,
    delta: 1 | -1,
  ): void {
    const stored = this.listings.get(listingId);
    if (!stored) return;
    // Called after the set mutation, so this is the post-change number of
    // markets in which this user holds the listing. The pair starts counting
    // at its first market and stops when the last one is removed.
    const marketsHolding = [...this.favorites.entries()].filter(
      ([scopeKey, ids]) =>
        scopeKey.startsWith(`${userId}:`) && ids.has(listingId),
    ).length;
    if (delta === 1 ? marketsHolding === 1 : marketsHolding === 0) {
      stored.favoriteCount = Math.max(0, (stored.favoriteCount || 0) + delta);
    }
  }

  async getFavorites(userId: string, marketCode: string): Promise<string[]> {
    const userFavs = this.favorites.get(
      `${userId}:${requireMarketCode(marketCode)}`,
    );
    return userFavs ? Array.from(userFavs) : [];
  }

  async rollUpViewCounts(): Promise<{
    processedEvents: number;
    updatedListings: number;
  }> {
    // The fixture has no analytics ledger to roll up; its counters are seeded.
    return { processedEvents: 0, updatedListings: 0 };
  }

  /** The vocabulary `refresh_listing_search_terms` would build for a market. */
  private searchVocabulary(
    marketCode: string,
  ): Map<string, { label: string; listingCount: number }> {
    const market = requireMarketCode(marketCode);
    const vocabulary = new Map<
      string,
      { label: string; listingCount: number; labels: Map<string, number> }
    >();
    for (const listing of this.listings.values()) {
      if (listing.status !== "published") continue;
      const publication = listing.marketPublications?.find(
        (entry) =>
          entry.marketCode === market &&
          entry.status === "active" &&
          entry.complianceState === "approved",
      );
      if (listing.marketPublications?.length && !publication) continue;
      if (!publication && listing.marketCode !== market) continue;
      for (const { term, label } of searchVocabularyTerms(
        [listing.title, listing.brand, listing.model].filter(Boolean).join(" "),
      )) {
        const entry = vocabulary.get(term) ?? {
          label,
          listingCount: 0,
          labels: new Map(),
        };
        entry.listingCount += 1;
        entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1);
        vocabulary.set(term, entry);
      }
    }
    return new Map(
      Array.from(vocabulary, ([term, entry]) => {
        // `mode()`: the most common spelling wins, ties broken alphabetically.
        const [label] = Array.from(entry.labels).sort(
          ([leftLabel, leftCount], [rightLabel, rightCount]) =>
            rightCount - leftCount || leftLabel.localeCompare(rightLabel),
        )[0]!;
        return [term, { label, listingCount: entry.listingCount }];
      }),
    );
  }

  async suggestSearchTerms(input: {
    marketCode: string;
    query: string;
    limit: number;
  }): Promise<SearchTermSuggestion[]> {
    const query = normalizeSearchText(input.query);
    if (!query) return [];
    const ranked: Array<SearchTermSuggestion & { score: number }> = [];
    for (const [term, entry] of this.searchVocabulary(input.marketCode)) {
      if (term.startsWith(query)) {
        ranked.push({ term, ...entry, matchKind: "prefix", score: 1 });
        continue;
      }
      if (query.length < 3) continue;
      const score = trigramSimilarity(term, query);
      if (score >= SUGGESTION_SIMILARITY_THRESHOLD) {
        ranked.push({ term, ...entry, matchKind: "fuzzy", score });
      }
    }
    return ranked
      .sort(
        (left, right) =>
          Number(right.matchKind === "prefix") -
            Number(left.matchKind === "prefix") ||
          right.score - left.score ||
          right.listingCount - left.listingCount ||
          left.term.localeCompare(right.term),
      )
      .slice(0, Math.min(Math.max(input.limit, 1), 20))
      .map(({ score: _score, ...suggestion }) => suggestion);
  }

  async correctSearchQuery(input: {
    marketCode: string;
    query: string;
  }): Promise<string | null> {
    const vocabulary = this.searchVocabulary(input.marketCode);
    let changed = false;
    const words = normalizeSearchText(input.query)
      .split(" ")
      .filter(Boolean)
      .map((word) => {
        if (
          word.length < 3 ||
          SEARCH_VOCABULARY_STOPWORDS.has(word) ||
          vocabulary.has(word)
        ) {
          return word;
        }
        let best: {
          label: string;
          score: number;
          listingCount: number;
        } | null = null;
        for (const [term, entry] of vocabulary) {
          const score = trigramSimilarity(term, word);
          if (score < CORRECTION_SIMILARITY_THRESHOLD) continue;
          if (
            !best ||
            score > best.score ||
            (score === best.score && entry.listingCount > best.listingCount)
          ) {
            best = {
              label: entry.label,
              score,
              listingCount: entry.listingCount,
            };
          }
        }
        if (!best) return word;
        changed = true;
        return best.label;
      });
    return changed ? words.join(" ") : null;
  }

  async refreshSearchVocabulary(marketCode: string): Promise<number> {
    // The fixture derives its vocabulary on read; nothing to persist.
    return this.searchVocabulary(marketCode).size;
  }

  /**
   * Mirrors `set_seller_away` / `clear_seller_away` for the fixture: only
   * publications paused for the absence resume with it.
   */
  setSellerPublicationsPaused(sellerId: string, paused: boolean): number {
    let changed = 0;
    for (const listing of this.listings.values()) {
      if (listing.sellerId !== sellerId || listing.status !== "published")
        continue;
      for (const publication of listing.marketPublications ?? []) {
        if (paused && publication.status === "active") {
          publication.status = "paused";
          publication.pausedReason = "seller_away";
          changed += 1;
        } else if (
          !paused &&
          publication.status === "paused" &&
          publication.pausedReason === "seller_away"
        ) {
          publication.status = "active";
          publication.pausedReason = undefined;
          changed += 1;
        }
      }
    }
    return changed;
  }

  async renewExpiringListings(input: { maxCycles: number; limit: number }) {
    const now = Date.now();
    const renewed: Array<{
      id: string;
      sellerId: string;
      title: string;
      marketCode: string;
      expiresAt: string;
    }> = [];
    for (const listing of this.listings.values()) {
      if (renewed.length >= input.limit) break;
      if (
        listing.status !== "published" ||
        !listing.autoRenew ||
        (listing.renewalCount ?? 0) >= input.maxCycles ||
        Date.parse(listing.expiresAt) > now
      )
        continue;
      // Mirrors `renew_expiring_listings`: the original window, 7 to 90 days.
      const window = listing.publishedAt
        ? Date.parse(listing.expiresAt) - Date.parse(listing.publishedAt)
        : 60 * 86_400_000;
      const bounded = Math.min(
        Math.max(window, 7 * 86_400_000),
        90 * 86_400_000,
      );
      const stamp = new Date(now).toISOString();
      listing.expiresAt = new Date(now + bounded).toISOString();
      listing.renewalCount = (listing.renewalCount ?? 0) + 1;
      listing.lastRenewedAt = stamp;
      listing.updatedAt = stamp;
      renewed.push({
        id: listing.id,
        sellerId: listing.sellerId,
        title: listing.title,
        marketCode: listing.marketCode,
        expiresAt: listing.expiresAt,
      });
    }
    return renewed;
  }

  async estimatePrice(input: {
    marketCode: string;
    categoryIds: readonly string[];
    brand?: string;
    model?: string;
    condition?: string;
  }): Promise<ListingPriceEstimate | null> {
    const market = requireMarketCode(input.marketCode);
    const categories = new Set(input.categoryIds);
    const brand = input.brand?.trim().toLocaleLowerCase("fr-FR") || undefined;
    const model = input.model?.trim().toLocaleLowerCase("fr-FR") || undefined;
    const condition = input.condition?.trim() || undefined;
    const inMarket = (listing: Listing) =>
      listing.marketCode === market && categories.has(listing.categoryId);
    const percentiles = (
      amounts: number[],
      basis: ListingPriceEstimate["basis"],
      narrowedBy: ListingPriceEstimate["narrowedBy"],
      currency: string,
    ): ListingPriceEstimate => {
      const sorted = [...amounts].sort((left, right) => left - right);
      // percentile_cont: linear interpolation between neighbours.
      const at = (fraction: number) => {
        const position = (sorted.length - 1) * fraction;
        const lower = Math.floor(position);
        const upper = Math.ceil(position);
        return Math.round(
          sorted[lower]! +
            (sorted[upper]! - sorted[lower]!) * (position - lower),
        );
      };
      return {
        basis,
        sampleSize: sorted.length,
        currency,
        p25Minor: at(0.25),
        medianMinor: at(0.5),
        p75Minor: at(0.75),
        narrowedBy,
      };
    };
    const minorOf = (listing: Listing) =>
      listing.marketPublications?.find((p) => p.isPrimary)?.priceMinor ??
      Math.round(listing.price * 100);
    const sold = Array.from(this.listings.values()).filter(
      (listing) =>
        listing.status === "sold" && inMarket(listing) && minorOf(listing) > 0,
    );
    for (let step = 0; step <= 3; step += 1) {
      const sample = sold.filter(
        (listing) =>
          (step >= 1 ||
            !brand ||
            listing.brand?.toLocaleLowerCase("fr-FR") === brand) &&
          (step >= 2 ||
            !model ||
            listing.model?.toLocaleLowerCase("fr-FR") === model) &&
          (step >= 3 || !condition || listing.condition === condition),
      );
      if (sample.length >= 5) {
        return percentiles(
          sample.map(minorOf),
          "sold",
          [
            ...(step < 1 && brand ? ["brand" as const] : []),
            ...(step < 2 && model ? ["model" as const] : []),
            ...(step < 3 && condition ? ["condition" as const] : []),
          ],
          sample[0]!.currency,
        );
      }
    }
    const asking = Array.from(this.listings.values()).filter(
      (listing) =>
        listing.status === "published" &&
        inMarket(listing) &&
        minorOf(listing) > 0,
    );
    return asking.length >= 3
      ? percentiles(asking.map(minorOf), "asking", [], asking[0]!.currency)
      : null;
  }

  async publishScheduledListings(limit: number) {
    const now = Date.now();
    const published: Array<{
      id: string;
      sellerId: string;
      title: string;
      marketCode: string;
      status: string;
    }> = [];
    for (const listing of this.listings.values()) {
      if (published.length >= limit) break;
      if (
        listing.status !== "draft" ||
        !listing.scheduledPublishAt ||
        Date.parse(listing.scheduledPublishAt) > now
      )
        continue;
      const stamp = new Date(now).toISOString();
      listing.status =
        (listing.safetyRiskScore ?? 0) >= 50 ? "flagged" : "published";
      listing.publishedAt = stamp;
      listing.organicFreshnessAt = stamp;
      listing.scheduledPublishAt = undefined;
      listing.updatedAt = stamp;
      if (listing.status === "published") {
        for (const publication of listing.marketPublications ?? []) {
          if (publication.status === "draft") {
            publication.status = "active";
            publication.publishedAt = stamp;
            publication.sortDate = stamp;
          }
        }
      }
      published.push({
        id: listing.id,
        sellerId: listing.sellerId,
        title: listing.title,
        marketCode: listing.marketCode,
        status: listing.status,
      });
    }
    return published;
  }

  async createDraft(userId: string, marketCode: string): Promise<any> {
    const draft = {
      step: "category",
      categoryId: "",
      title: "",
      description: "",
      price: 0,
      condition: "bon-etat",
      photos: [],
      marketCode: requireMarketCode(marketCode),
      allowedDelivery: ["hand_delivery"],
    };
    if (userId) {
      this.drafts.set(`${userId}:${draft.marketCode}`, draft);
    }
    return draft;
  }

  async saveDraft(
    draft: any,
    userId: string,
    marketCode: string,
  ): Promise<void> {
    this.drafts.set(`${userId}:${requireMarketCode(marketCode)}`, draft);
  }

  async getDraft(userId: string, marketCode: string): Promise<any | null> {
    return (
      this.drafts.get(`${userId}:${requireMarketCode(marketCode)}`) || null
    );
  }
}

export class PostgresListingRepository implements IListingRepository {
  private static readonly LISTING_PROJECTION = [
    "id",
    "seller_id",
    "store_id",
    "publisher_type",
    "publisher_user_id",
    "publisher_organization_id",
    "publisher_branch_id",
    "publisher_verification_status",
    "publication_offer_id",
    "subscription_id",
    "entitlement_snapshot",
    "category_id",
    "listing_type_id",
    "listing_intent",
    "title",
    "description",
    "price",
    "original_price",
    "currency",
    "status",
    "condition",
    "brand",
    "model",
    "market_code",
    "city",
    "postal_code",
    "department",
    "region",
    "country",
    "latitude",
    "longitude",
    "administrative_area",
    "location_precision",
    "allowed_delivery",
    "shipping_cost",
    "fulfillment_model",
    "digital_fulfillment_version_id",
    "product_version",
    "is_urgent",
    "is_featured",
    "urgent_expires_at",
    "featured_expires_at",
    "bumped_at",
    "promotion_state",
    "promotion_type",
    "promotion_source",
    "promotion_source_id",
    "promotion_label",
    "promotion_start_at",
    "promotion_end_at",
    "published_at",
    "materially_updated_at",
    "organic_freshness_at",
    "promoted_at",
    "external_stock_id",
    "duplicate_group_id",
    "view_count",
    "favorite_count",
    "safety_risk_score",
    "attributes",
    "auto_renew",
    "renewal_count",
    "last_renewed_at",
    "scheduled_publish_at",
    "created_at",
    "updated_at",
    "expires_at",
  ].join(", ");

  private static readonly SELLER_PROJECTION =
    "id, slug, email, name, account_type, account_family, primary_role, status, avatar_url, city, postal_code, country, bio, is_verified, is_identity_verified, is_phone_verified, is_email_verified, is_business_verified, rating, review_count, response_rate_percent, response_time_text, away_until, away_message, created_at";

  private static readonly MARKET_PUBLICATION_PROJECTION =
    "market_code, status, is_primary, price_minor, currency, localized_content, available_services, compliance_state, paused_reason, published_at, sort_date, promotion_state, promotion_type, promotion_source, promotion_source_id, promotion_label, promotion_start_at, promotion_end_at, promoted_at";

  /**
   * Ranking projection only. Full listing, media URL and seller hydration is
   * deliberately deferred until the ranked page IDs are known.
   */
  private static readonly DISCOVERY_CANDIDATE_PROJECTION = [
    "id",
    "seller_id",
    "publisher_type",
    "publisher_user_id",
    "publisher_organization_id",
    "publisher_verification_status",
    "category_id",
    "title",
    "description",
    "price",
    "original_price",
    "currency",
    "status",
    "condition",
    "market_code",
    "city",
    "country",
    "allowed_delivery",
    "published_at",
    "materially_updated_at",
    "organic_freshness_at",
    "external_stock_id",
    "duplicate_group_id",
    "attributes",
    "created_at",
    "updated_at",
    "expires_at",
  ].join(", ");

  private static readonly DISCOVERY_SELLER_PROJECTION =
    "id, account_type, account_family, status, country, is_verified, is_identity_verified, is_phone_verified, is_email_verified, is_business_verified, rating, review_count, response_rate_percent, created_at";

  private static readonly DISCOVERY_MARKET_PUBLICATION_PROJECTION =
    "market_code, status, is_primary, price_minor, currency, available_services, compliance_state, published_at, sort_date, promotion_state, promotion_type, promotion_source, promotion_source_id, promotion_label, promotion_start_at, promotion_end_at, promoted_at";

  private toMarketPublicationRows(listing: Listing, listingId: string) {
    const defaultStatus: ListingMarketPublication["status"] =
      listing.status === "published" ||
      listing.status === "reserved" ||
      listing.status === "sold"
        ? "active"
        : listing.status === "flagged"
          ? "pending_review"
          : listing.status === "rejected"
            ? "rejected"
            : listing.status === "archived"
              ? "expired"
              : "draft";
    const configured = listing.marketPublications?.length
      ? listing.marketPublications
      : [
          {
            marketCode: listing.marketCode,
            status: defaultStatus,
            isPrimary: true,
            priceMinor: Math.round(
              listing.price *
                10 ** getCurrencyMinorUnitDigits(listing.currency),
            ),
            currency: listing.currency,
            complianceState:
              listing.status === "flagged" ? "pending" : "approved",
            availableServices: Object.fromEntries(
              listing.allowedDelivery.map((method) => [method, true]),
            ),
            publishedAt: listing.publishedAt,
            sortDate:
              listing.organicFreshnessAt ||
              listing.publishedAt ||
              listing.createdAt,
          } satisfies ListingMarketPublication,
        ];
    if (configured.filter((publication) => publication.isPrimary).length !== 1)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une annonce doit avoir exactement un marché principal.",
      });
    return configured.map((publication) => ({
      listing_id: listingId,
      market_code: requireMarketCode(publication.marketCode),
      status: publication.status,
      is_primary: publication.isPrimary,
      price_minor: publication.priceMinor,
      currency: publication.currency.toUpperCase(),
      localized_content: publication.localizedContent || {},
      available_services: publication.availableServices || {},
      compliance_state: publication.complianceState,
      published_at: publication.publishedAt || null,
      sort_date: publication.sortDate,
      updated_at: listing.updatedAt,
    }));
  }

  private mapRowToListing(row: any, requestedMarketCode?: string): Listing {
    const profile = row.profiles;
    const marketPublications: ListingMarketPublication[] = Array.isArray(
      row.listing_market_publications,
    )
      ? row.listing_market_publications.map((publication: any) => ({
          marketCode: requireMarketCode(publication.market_code),
          status: publication.status,
          isPrimary: Boolean(publication.is_primary),
          priceMinor: Number(publication.price_minor),
          currency: String(publication.currency).toUpperCase(),
          localizedContent: publication.localized_content || {},
          availableServices: publication.available_services || {},
          complianceState: publication.compliance_state,
          pausedReason: publication.paused_reason || undefined,
          publishedAt: publication.published_at || undefined,
          sortDate: publication.sort_date,
          promotionState: publication.promotion_state || "inactive",
          promotionType: publication.promotion_type || undefined,
          promotionSource: publication.promotion_source || undefined,
          promotionSourceId: publication.promotion_source_id || undefined,
          promotionLabel: publication.promotion_label || undefined,
          promotionStartAt: publication.promotion_start_at || undefined,
          promotionEndAt: publication.promotion_end_at || undefined,
          promotedAt: publication.promoted_at || undefined,
        }))
      : [];
    const effectivePublication = requestedMarketCode
      ? marketPublications.find(
          (publication) => publication.marketCode === requestedMarketCode,
        )
      : marketPublications.find((publication) => publication.isPrimary);
    const hasEffectivePromotion =
      isEffectiveMarketPromotion(effectivePublication);
    const effectiveMarketPublications: ListingMarketPublication[] =
      requestedMarketCode && effectivePublication
        ? [
            {
              ...effectivePublication,
              promotionState: hasEffectivePromotion ? "active" : "inactive",
              promotionType: hasEffectivePromotion
                ? effectivePublication.promotionType
                : undefined,
              promotionSource: hasEffectivePromotion
                ? effectivePublication.promotionSource
                : undefined,
              promotionSourceId: hasEffectivePromotion
                ? effectivePublication.promotionSourceId
                : undefined,
              promotionLabel: hasEffectivePromotion
                ? effectivePublication.promotionLabel
                : undefined,
              promotionStartAt: hasEffectivePromotion
                ? effectivePublication.promotionStartAt
                : undefined,
              promotionEndAt: hasEffectivePromotion
                ? effectivePublication.promotionEndAt
                : undefined,
              promotedAt: hasEffectivePromotion
                ? effectivePublication.promotedAt
                : undefined,
            },
          ]
        : marketPublications;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id || undefined,
      publisherType:
        row.publisher_type ||
        (row.publisher_organization_id ? "professional" : "private"),
      publisherUserId: row.publisher_user_id || row.seller_id,
      publisherOrganizationId: row.publisher_organization_id || undefined,
      publisherBranchId: row.publisher_branch_id || undefined,
      publisherVerificationStatus:
        row.publisher_verification_status || undefined,
      publisherStatus: row.publisher_organization?.status || undefined,
      publicationOfferId: row.publication_offer_id || undefined,
      subscriptionId: row.subscription_id || undefined,
      entitlementSnapshot: row.entitlement_snapshot || undefined,
      seller: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            email: profile.email,
            name: profile.name,
            accountType:
              profile.account_family ||
              (profile.account_type === "internal"
                ? "staff"
                : profile.account_type),
            primaryRole: profile.primary_role,
            role: profile.primary_role,
            sellerType:
              profile.account_type === "professional" ? "pro" : "individual",
            status: profile.status,
            avatarUrl: profile.avatar_url || undefined,
            city: profile.city || undefined,
            postalCode: profile.postal_code || undefined,
            country: requireMarketCode(profile.country),
            isVerified: Boolean(profile.is_verified),
            isIdentityVerified: Boolean(profile.is_identity_verified),
            isPhoneVerified: Boolean(profile.is_phone_verified),
            isEmailVerified: Boolean(profile.is_email_verified),
            isBusinessVerified: Boolean(profile.is_business_verified),
            rating: Number(profile.rating || 0),
            reviewCount: Number(profile.review_count || 0),
            responseRatePercent: Number(profile.response_rate_percent || 0),
            responseTimeText: profile.response_time_text || undefined,
            awayUntil: profile.away_until || undefined,
            awayMessage: profile.away_message || undefined,
            createdAt: profile.created_at,
          }
        : undefined,
      categoryId: row.category_id,
      listingTypeId: row.listing_type_id || undefined,
      listingIntent: row.listing_intent || undefined,
      title: row.title,
      description: row.description,
      price: effectivePublication
        ? minorToMajorAmount(
            effectivePublication.priceMinor,
            effectivePublication.currency,
          )
        : Number(row.price),
      originalPrice: row.original_price
        ? Number(row.original_price)
        : undefined,
      currency: effectivePublication?.currency || row.currency,
      status: row.status,
      condition: row.condition || "bon-etat",
      brand: row.brand || undefined,
      model: row.model || undefined,
      marketCode:
        effectivePublication?.marketCode || requireMarketCode(row.market_code),
      marketCodes: marketPublications.map(
        (publication) => publication.marketCode,
      ),
      marketPublications: effectiveMarketPublications,
      city: row.city,
      postalCode: row.postal_code,
      department: row.department || undefined,
      region: row.region || undefined,
      country: requireMarketCode(row.country),
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      administrativeArea: row.administrative_area || undefined,
      /*
       * The row's own policy, not a default chosen here. A row written before
       * the column existed reads as `approximate`, which is the safe direction:
       * an unknown policy must never resolve to publishing the real point.
       */
      locationPrecision: row.location_precision || "approximate",
      ...(row.distance_km === undefined || row.distance_km === null
        ? {}
        : { distanceKm: Number(row.distance_km) }),
      allowedDelivery: (row.allowed_delivery as DeliveryType[]) || [
        "hand_delivery",
      ],
      shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
      fulfillmentModel: row.fulfillment_model || "PHYSICAL",
      digitalFulfillmentVersionId:
        row.digital_fulfillment_version_id || undefined,
      productVersion: row.product_version || undefined,
      images: Array.isArray(row.listing_media)
        ? [...row.listing_media]
            .sort(
              (left: any, right: any) =>
                Number(left.sort_order || 0) - Number(right.sort_order || 0),
            )
            .map((media: any) => String(media.url))
        : Array.isArray(row.images)
          ? row.images
          : [],
      isUrgent: effectivePublication
        ? hasEffectivePromotion &&
          effectivePublication.promotionType === "urgent_badge"
        : Boolean(row.is_urgent),
      isFeatured: effectivePublication
        ? hasEffectivePromotion &&
          FEATURED_PROMOTION_TYPES.has(effectivePublication.promotionType)
        : Boolean(row.is_featured),
      urgentExpiresAt: row.urgent_expires_at || undefined,
      featuredExpiresAt: row.featured_expires_at || undefined,
      bumpedAt: row.bumped_at || undefined,
      promotionState: effectivePublication
        ? hasEffectivePromotion
          ? "active"
          : "inactive"
        : row.promotion_state || undefined,
      promotionType: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionType
          : undefined
        : row.promotion_type || undefined,
      promotionSource: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionSource
          : undefined
        : row.promotion_source || undefined,
      promotionSourceId: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionSourceId
          : undefined
        : row.promotion_source_id || undefined,
      promotionLabel: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionLabel
          : undefined
        : row.promotion_label || undefined,
      promotionStartAt: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionStartAt
          : undefined
        : row.promotion_start_at || undefined,
      promotionEndAt: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotionEndAt
          : undefined
        : row.promotion_end_at || undefined,
      publishedAt: effectivePublication?.publishedAt || row.published_at,
      materiallyUpdatedAt: row.materially_updated_at || undefined,
      organicFreshnessAt:
        row.organic_freshness_at || row.published_at || row.created_at,
      promotedAt: effectivePublication
        ? hasEffectivePromotion
          ? effectivePublication.promotedAt
          : undefined
        : row.promoted_at || undefined,
      externalStockId: row.external_stock_id || undefined,
      duplicateGroupId: row.duplicate_group_id || undefined,
      viewCount: Number(row.view_count || 0),
      favoriteCount: Number(row.favorite_count || 0),
      safetyRiskScore:
        row.safety_risk_score !== null ? Number(row.safety_risk_score) : 0,
      attributes: row.attributes || {},
      autoRenew: Boolean(row.auto_renew),
      renewalCount: Number(row.renewal_count || 0),
      lastRenewedAt: row.last_renewed_at || undefined,
      scheduledPublishAt: row.scheduled_publish_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    };
  }

  async findById(id: string): Promise<Listing | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("listings")
        .select(
          `${PostgresListingRepository.LISTING_PROJECTION}, listing_media(url, sort_order), listing_market_publications(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION}), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
        )
        .eq("id", id)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("listings.findById", error);
      }
      if (!data) return null;
      return this.mapRowToListing(data);
    } catch (error) {
      databaseFailure("listings.findById", error);
    }
  }

  async findOwnedBySeller(
    sellerId: string,
    marketCode: string,
  ): Promise<{ items: Listing[]; total: number }> {
    const requestedMarketCode = requireMarketCode(marketCode);
    try {
      const supabase = getSupabaseAdminClient();
      const { data, count, error } = await (supabase as any)
        .from("listings")
        .select(
          `${PostgresListingRepository.LISTING_PROJECTION}, listing_media(url, sort_order), listing_market_publications!inner(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION}), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
          { count: "exact" },
        )
        .eq("seller_id", sellerId)
        .eq("listing_market_publications.market_code", requestedMarketCode)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error || !data) databaseFailure("listings.findOwnedBySeller", error);
      return {
        items: data.map((row: any) =>
          this.mapRowToListing(row, requestedMarketCode),
        ),
        total: count || 0,
      };
    } catch (error) {
      databaseFailure("listings.findOwnedBySeller", error);
    }
  }

  async findPublicById(
    id: string,
    marketCode: string,
  ): Promise<Listing | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const requestedMarketCode = requireMarketCode(marketCode);
      const { data, error } = await ((supabase as any)
        .from("listings")
        .select(
          `${PostgresListingRepository.LISTING_PROJECTION}, listing_media(url, sort_order), listing_market_publications!inner(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION}), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
        )
        .eq("id", id)
        .eq("listing_market_publications.market_code", requestedMarketCode)
        .eq("listing_market_publications.status", "active")
        .eq("listing_market_publications.compliance_state", "approved")
        .in("status", ["published", "reserved", "sold"] as any)
        .maybeSingle() as any);
      if (error) databaseFailure("listings.findPublicById", error);
      if (!data) return null;
      const listing = this.mapRowToListing(data, requestedMarketCode);
      if (
        listing.publisherStatus === "suspended" ||
        listing.seller?.status !== "active"
      ) {
        return null;
      }
      return listing;
    } catch (error) {
      databaseFailure("listings.findPublicById", error);
    }
  }

  async findPublicByIds(
    ids: readonly string[],
    marketCode: string,
  ): Promise<Listing[]> {
    const orderedIds = [...new Set(ids.filter(Boolean))];
    if (orderedIds.length === 0) return [];

    const requestedMarketCode = requireMarketCode(marketCode);
    const rows: any[] = [];
    const batchSize = 100;
    try {
      const supabase = getSupabaseAdminClient();
      for (let offset = 0; offset < orderedIds.length; offset += batchSize) {
        const batch = orderedIds.slice(offset, offset + batchSize);
        const { data, error } = await (supabase as any)
          .from("listings")
          .select(
            `${PostgresListingRepository.LISTING_PROJECTION}, listing_media(url, sort_order), listing_market_publications!inner(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION}), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
          )
          .in("id", batch)
          .eq("listing_market_publications.market_code", requestedMarketCode)
          .eq("listing_market_publications.status", "active")
          .eq("listing_market_publications.compliance_state", "approved")
          .in("status", ["published", "reserved", "sold"] as any);
        if (error || !data) databaseFailure("listings.findPublicByIds", error);
        rows.push(...data);
      }

      const listingsById = new Map(
        rows
          .map((row) => this.mapRowToListing(row, requestedMarketCode))
          .filter(
            (listing) =>
              listing.publisherStatus !== "suspended" &&
              listing.seller?.status === "active",
          )
          .map((listing) => [listing.id, listing] as const),
      );
      return orderedIds.flatMap((id) => {
        const listing = listingsById.get(id);
        return listing ? [listing] : [];
      });
    } catch (error) {
      databaseFailure("listings.findPublicByIds", error);
    }
  }

  async search(filters: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const startedAt = performance.now();
    try {
      const supabase = getSupabaseAdminClient();
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(500, filters.limit || 20);
      const offset = (page - 1) * limit;
      const requestedMarketCode = filters.marketCode
        ? requireMarketCode(filters.marketCode)
        : undefined;
      const publicationJoin = requestedMarketCode
        ? `listing_market_publications!inner(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION})`
        : `listing_market_publications(${PostgresListingRepository.MARKET_PUBLICATION_PROJECTION})`;

      let query = (supabase as any)
        .from("listings")
        .select(
          `${PostgresListingRepository.LISTING_PROJECTION}, listing_media(url, sort_order), ${publicationJoin}, profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
          { count: "exact" },
        )
        .eq("status", "published");

      if (requestedMarketCode) {
        query = query
          .eq("listing_market_publications.market_code", requestedMarketCode)
          .eq("listing_market_publications.status", "active")
          .eq("listing_market_publications.compliance_state", "approved");
      }
      if (filters.categoryIds) {
        query = query.in("category_id", filters.categoryIds);
      } else if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }
      if (filters.publisherOrganizationId) {
        query = query.eq(
          "publisher_organization_id",
          filters.publisherOrganizationId,
        );
      }
      if (filters.minPrice !== undefined) {
        if (requestedMarketCode) {
          const publicationCurrency =
            getCountryConfig(requestedMarketCode)?.currency;
          if (!publicationCurrency)
            throw new AppError({
              code: "VALIDATION_ERROR",
              message: "Devise du marché introuvable.",
            });
          const factor = 10 ** getCurrencyMinorUnitDigits(publicationCurrency);
          query = query.gte(
            "listing_market_publications.price_minor",
            Math.round(filters.minPrice * factor),
          );
        } else query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        if (requestedMarketCode) {
          const publicationCurrency =
            getCountryConfig(requestedMarketCode)?.currency;
          if (!publicationCurrency)
            throw new AppError({
              code: "VALIDATION_ERROR",
              message: "Devise du marché introuvable.",
            });
          const factor = 10 ** getCurrencyMinorUnitDigits(publicationCurrency);
          query = query.lte(
            "listing_market_publications.price_minor",
            Math.round(filters.maxPrice * factor),
          );
        } else query = query.lte("price", filters.maxPrice);
      }
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.query) {
        // The vectors are unaccented `simple` lexemes (00076), so the query
        // must be folded the same way or "vélo" never matches "velo".
        const normalizedQuery = filters.query
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .trim();
        if (normalizedQuery) {
          query = query.textSearch("search_vector", normalizedQuery, {
            type: "websearch",
            config: "simple",
          });
        }
      }

      if (filters.sortBy === "price_asc") {
        query = requestedMarketCode
          ? query.order("price_minor", {
              ascending: true,
              referencedTable: "listing_market_publications",
            })
          : query.order("price", { ascending: true });
      } else if (filters.sortBy === "price_desc") {
        query = requestedMarketCode
          ? query.order("price_minor", {
              ascending: false,
              referencedTable: "listing_market_publications",
            })
          : query.order("price", { ascending: false });
      } else {
        // Promotion never masquerades as organic freshness. Sponsored
        // insertion is handled separately by UnifiedDiscoveryService.
        query = requestedMarketCode
          ? query
              .order("sort_date", {
                ascending: false,
                referencedTable: "listing_market_publications",
              })
              .order("id", { ascending: false })
          : query
              .order("organic_freshness_at", {
                ascending: false,
                nullsFirst: false,
              })
              .order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error || !data) databaseFailure("listings.search", error);

      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const items = data.map((r: any) =>
        this.mapRowToListing(r, requestedMarketCode),
      );

      logger.info("database_query_completed", {
        operation: "listings.search",
        durationMs: Math.round(performance.now() - startedAt),
        rowCount: items.length,
        totalCount: total,
        marketCode: requestedMarketCode || null,
        page,
        limit,
        sortBy: filters.sortBy || "recent",
      });

      return { items, total, page, totalPages };
    } catch (error) {
      databaseFailure("listings.search", error);
    }
  }

  async searchDiscoveryCandidates(
    filters: SearchFilters,
    options: {
      limit: number;
      snapshotAt?: string;
      after?: {
        sortDate: string;
        listingId: string;
        priceMinor?: number;
      };
    },
  ): Promise<{
    items: Listing[];
    snapshotAt: string;
    hasMore: boolean;
    lastCandidate?: {
      sortDate: string;
      listingId: string;
      priceMinor?: number;
    };
  }> {
    const startedAt = performance.now();
    const requestedMarketCode = requireMarketCode(filters.marketCode);
    const snapshotAt = options.snapshotAt || new Date().toISOString();
    const limit = Math.max(1, Math.min(500, options.limit));
    try {
      const supabase = getSupabaseAdminClient();

      /*
       * Spatial filtering runs first, in the database, against the GiST index.
       *
       * The alternative — reading the market's candidate window and measuring
       * distances in Node — is correct at seed scale and a table scan in
       * production, and the difference does not appear until it is expensive.
       * The RPC answers identifiers and distances only; hydration, permissions
       * and projection stay where they already are.
       */
      let distanceByListingId: Map<string, number> | undefined;
      let spatialListingIds: string[] | undefined;
      if (filters.boundingBox || (filters.center && filters.radiusKm)) {
        const { data: spatialRows, error: spatialError } = await (
          supabase as any
        ).rpc("search_listing_ids_spatial", {
          p_market_code: requestedMarketCode,
          p_center_latitude: filters.center?.latitude,
          p_center_longitude: filters.center?.longitude,
          p_radius_km: filters.radiusKm,
          p_north: filters.boundingBox?.north,
          p_east: filters.boundingBox?.east,
          p_south: filters.boundingBox?.south,
          p_west: filters.boundingBox?.west,
          p_limit: Math.min(500, limit * 2),
        });
        if (spatialError)
          databaseFailure("listings.searchCandidates.spatial", spatialError);
        const rows = (spatialRows || []) as Array<{
          id: string;
          distance_km: number | null;
        }>;
        if (!rows.length) {
          return { items: [], snapshotAt, hasMore: false };
        }
        distanceByListingId = new Map(
          rows.flatMap((row) =>
            row.distance_km === null ? [] : [[row.id, row.distance_km]],
          ),
        );
        spatialListingIds = rows.map((row) => row.id);
      }

      let query = (supabase as any)
        .from("listing_market_publications")
        .select(
          `listing_id, ${PostgresListingRepository.DISCOVERY_MARKET_PUBLICATION_PROJECTION}, listings!inner(${PostgresListingRepository.DISCOVERY_CANDIDATE_PROJECTION}, listing_media(id, sort_order), profiles:seller_id(${PostgresListingRepository.DISCOVERY_SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status))`,
        )
        .eq("market_code", requestedMarketCode)
        .eq("status", "active")
        .eq("compliance_state", "approved")
        .eq("listings.status", "published")
        .lte("sort_date", snapshotAt);

      const priceAscending = filters.sortBy === "price_asc";
      const priceDescending = filters.sortBy === "price_desc";
      if (
        options.after &&
        (priceAscending || priceDescending) &&
        options.after.priceMinor !== undefined
      ) {
        const comparison = priceAscending ? "gt" : "lt";
        query = query.or(
          `price_minor.${comparison}.${options.after.priceMinor},and(price_minor.eq.${options.after.priceMinor},listing_id.${comparison}.${options.after.listingId})`,
        );
      } else if (options.after) {
        query = query.or(
          `sort_date.lt.${options.after.sortDate},and(sort_date.eq.${options.after.sortDate},listing_id.lt.${options.after.listingId})`,
        );
      }

      if (filters.categoryIds || filters.categoryId) {
        query = query.in(
          "listings.category_id",
          filters.categoryIds ?? [filters.categoryId!],
        );
      }
      const publisherType =
        filters.sellerType === "individual"
          ? "private"
          : filters.sellerType === "pro"
            ? "professional"
            : filters.sellerType;
      if (publisherType && publisherType !== "all") {
        query = query.eq("listings.publisher_type", publisherType);
      }
      if (filters.verifiedPublishersOnly) {
        query = query.neq(
          "listings.publisher_verification_status",
          "unverified",
        );
      }
      if (filters.sellerId)
        query = query.eq("listings.seller_id", filters.sellerId);
      if (filters.publisherOrganizationId) {
        query = query.eq(
          "listings.publisher_organization_id",
          filters.publisherOrganizationId,
        );
      }
      if (filters.conditions?.length) {
        query = query.in("listings.condition", [
          ...new Set(filters.conditions),
        ]);
      } else if (filters.condition) {
        query = query.eq("listings.condition", filters.condition);
      }
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const publicationCurrency =
          getCountryConfig(requestedMarketCode)?.currency;
        if (!publicationCurrency) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Devise du marché introuvable.",
          });
        }
        const factor = 10 ** getCurrencyMinorUnitDigits(publicationCurrency);
        if (filters.minPrice !== undefined) {
          query = query.gte(
            "price_minor",
            Math.round(filters.minPrice * factor),
          );
        }
        if (filters.maxPrice !== undefined) {
          query = query.lte(
            "price_minor",
            Math.round(filters.maxPrice * factor),
          );
        }
      }
      if (spatialListingIds) {
        query = query.in("listing_id", spatialListingIds);
      }
      if (filters.city) {
        query = query.ilike("listings.city", `%${filters.city}%`);
      }
      if (filters.postalCode) {
        query = query.eq("listings.postal_code", filters.postalCode);
      }
      if (filters.deliveryAvailable) {
        query = query.overlaps("listings.allowed_delivery", [
          "relay_point",
          "home_delivery",
          "cocolis",
          "express",
        ]);
      }
      if (filters.onlinePaymentAvailable) {
        query = query.contains("available_services", {
          online_payment: true,
        });
      }
      if (filters.onlyDeals) {
        query = query.not("listings.original_price", "is", null);
      }
      if (filters.attributes) {
        const exactAttributes = Object.fromEntries(
          Object.entries(filters.attributes).filter(
            ([, value]) =>
              value !== null &&
              !Array.isArray(value) &&
              typeof value !== "object",
          ),
        );
        if (Object.keys(exactAttributes).length) {
          query = query.contains("listings.attributes", exactAttributes);
        }
      }
      if (filters.publishedToday) {
        query = query.gte(
          "published_at",
          new Date(Date.parse(snapshotAt) - 86_400_000).toISOString(),
        );
      }
      if (filters.query) {
        const normalizedQuery = filters.query
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .trim();
        if (normalizedQuery) {
          query = query.textSearch("listings.search_vector", normalizedQuery, {
            type: "websearch",
            config: "simple",
          });
        }
      }

      query = priceAscending
        ? query
            .order("price_minor", { ascending: true })
            .order("listing_id", { ascending: true })
            .limit(limit + 1)
        : priceDescending
          ? query
              .order("price_minor", { ascending: false })
              .order("listing_id", { ascending: false })
              .limit(limit + 1)
          : query
              .order("sort_date", { ascending: false })
              .order("listing_id", { ascending: false })
              .limit(limit + 1);

      const { data, error } = await query;
      if (error || !data) databaseFailure("listings.searchCandidates", error);
      const hasMore = data.length > limit;
      const candidateRows = data.slice(0, limit);
      const items = candidateRows.map((row: any) => {
        const listing = Array.isArray(row.listings)
          ? row.listings[0]
          : row.listings;
        /*
         * The distance came back from the spatial query, so it is measured by
         * PostGIS on the authoritative point rather than recomputed here from a
         * displaced public coordinate — which would be measuring the wrong
         * thing and would drift from the radius that selected the row.
         */
        const distanceKm = distanceByListingId?.get(String(row.listing_id));
        return this.mapRowToListing(
          {
            ...(distanceKm === undefined ? {} : { distance_km: distanceKm }),
            ...listing,
            listing_market_publications: [
              {
                market_code: row.market_code,
                status: row.status,
                is_primary: row.is_primary,
                price_minor: row.price_minor,
                currency: row.currency,
                available_services: row.available_services,
                compliance_state: row.compliance_state,
                published_at: row.published_at,
                sort_date: row.sort_date,
                promotion_state: row.promotion_state,
                promotion_type: row.promotion_type,
                promotion_source: row.promotion_source,
                promotion_source_id: row.promotion_source_id,
                promotion_label: row.promotion_label,
                promotion_start_at: row.promotion_start_at,
                promotion_end_at: row.promotion_end_at,
                promoted_at: row.promoted_at,
              },
            ],
          },
          requestedMarketCode,
        );
      });
      const lastRow = candidateRows.at(-1);

      logger.info("database_query_completed", {
        operation: "listings.searchCandidates",
        durationMs: Math.round(performance.now() - startedAt),
        rowCount: items.length,
        projection: "discovery_candidate",
        hydrated: false,
        hasMore,
        marketCode: requestedMarketCode,
        limit,
      });
      return {
        items,
        snapshotAt,
        hasMore,
        lastCandidate: lastRow
          ? {
              sortDate: String(lastRow.sort_date),
              listingId: String(lastRow.listing_id),
              ...(priceAscending || priceDescending
                ? { priceMinor: Number(lastRow.price_minor) }
                : {}),
            }
          : undefined,
      };
    } catch (error) {
      databaseFailure("listings.searchCandidates", error);
    }
  }

  async save(listing: Listing): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: listing.id.includes("-") ? listing.id : undefined,
      seller_id: listing.sellerId,
      store_id: listing.storeId || null,
      publisher_type: listing.publisherType || "private",
      publisher_user_id: listing.publisherUserId || listing.sellerId,
      publisher_organization_id: listing.publisherOrganizationId || null,
      publisher_branch_id: listing.publisherBranchId || null,
      publisher_verification_status:
        listing.publisherVerificationStatus || "unverified",
      publication_offer_id: listing.publicationOfferId || null,
      subscription_id: listing.subscriptionId || null,
      entitlement_snapshot: listing.entitlementSnapshot || {},
      category_id: listing.categoryId,
      listing_type_id: listing.listingTypeId || null,
      listing_intent: listing.listingIntent || null,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      original_price: listing.originalPrice || null,
      currency: listing.currency,
      status: listing.status,
      condition: listing.condition,
      brand: listing.brand || null,
      model: listing.model || null,
      market_code: listing.marketCode,
      city: listing.city,
      postal_code: listing.postalCode,
      department: listing.department || null,
      region: listing.region || null,
      country: listing.country,
      allowed_delivery: listing.allowedDelivery,
      shipping_cost: listing.shippingCost || 0,
      fulfillment_model: listing.fulfillmentModel || "PHYSICAL",
      digital_fulfillment_version_id:
        listing.digitalFulfillmentVersionId || null,
      product_version: listing.productVersion || null,
      is_urgent: Boolean(listing.isUrgent),
      is_featured: Boolean(listing.isFeatured),
      promotion_state: listing.promotionState || "inactive",
      promotion_type: listing.promotionType || null,
      promotion_source: listing.promotionSource || null,
      promotion_source_id: listing.promotionSourceId || null,
      promotion_label: listing.promotionLabel || null,
      promotion_start_at: listing.promotionStartAt || null,
      promotion_end_at: listing.promotionEndAt || null,
      published_at: listing.publishedAt || listing.createdAt,
      materially_updated_at: listing.materiallyUpdatedAt || null,
      organic_freshness_at:
        listing.organicFreshnessAt || listing.publishedAt || listing.createdAt,
      promoted_at: listing.promotedAt || null,
      external_stock_id: listing.externalStockId || null,
      duplicate_group_id: listing.duplicateGroupId || null,
      view_count: listing.viewCount,
      favorite_count: listing.favoriteCount,
      safety_risk_score: listing.safetyRiskScore || 0,
      attributes: listing.attributes || {},
      auto_renew: Boolean(listing.autoRenew),
      scheduled_publish_at: listing.scheduledPublishAt || null,
      created_at: listing.createdAt,
      updated_at: listing.updatedAt,
      expires_at: listing.expiresAt,
    };

    const { data, error } = await retryDatabaseSerializationFailure<any>(
      () =>
        supabase
          .from("listings")
          .upsert(payload as any)
          .select("id")
          .single() as any,
    );
    if (error || !data) {
      databaseFailure("listings.save", error);
    }
    const publicationRows = this.toMarketPublicationRows(listing, data.id);
    const { error: publicationError } =
      await retryDatabaseSerializationFailure<any>(() =>
        (supabase as any)
          .from("listing_market_publications")
          .upsert(publicationRows, { onConflict: "listing_id,market_code" }),
      );
    if (publicationError)
      databaseFailure("listings.saveMarketPublications", publicationError);
    const persisted = await this.findById(data.id);
    if (!persisted) databaseFailure("listings.saveReload", null);
    return persisted;
  }

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.condition !== undefined) payload.condition = updates.condition;
    if (updates.brand !== undefined) payload.brand = updates.brand;
    if (updates.model !== undefined) payload.model = updates.model;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.postalCode !== undefined)
      payload.postal_code = updates.postalCode;
    if (updates.allowedDelivery !== undefined)
      payload.allowed_delivery = updates.allowedDelivery;
    if (updates.shippingCost !== undefined)
      payload.shipping_cost = updates.shippingCost;
    if (updates.fulfillmentModel !== undefined)
      payload.fulfillment_model = updates.fulfillmentModel;
    if (updates.digitalFulfillmentVersionId !== undefined)
      payload.digital_fulfillment_version_id =
        updates.digitalFulfillmentVersionId || null;
    if (updates.productVersion !== undefined)
      payload.product_version = updates.productVersion || null;
    if (updates.isUrgent !== undefined) payload.is_urgent = updates.isUrgent;
    if (updates.isFeatured !== undefined)
      payload.is_featured = updates.isFeatured;
    if (updates.viewCount !== undefined) payload.view_count = updates.viewCount;
    if (updates.favoriteCount !== undefined)
      payload.favorite_count = updates.favoriteCount;
    if (updates.attributes !== undefined)
      payload.attributes = updates.attributes;
    if (updates.autoRenew !== undefined) payload.auto_renew = updates.autoRenew;
    if (updates.promotionState !== undefined)
      payload.promotion_state = updates.promotionState;
    if (updates.promotionType !== undefined)
      payload.promotion_type = updates.promotionType;
    if (updates.promotionSource !== undefined)
      payload.promotion_source = updates.promotionSource;
    if (updates.promotionSourceId !== undefined)
      payload.promotion_source_id = updates.promotionSourceId;
    if (updates.promotionLabel !== undefined)
      payload.promotion_label = updates.promotionLabel;
    if (updates.promotionStartAt !== undefined)
      payload.promotion_start_at = updates.promotionStartAt;
    if (updates.promotionEndAt !== undefined)
      payload.promotion_end_at = updates.promotionEndAt;
    if (updates.materiallyUpdatedAt !== undefined)
      payload.materially_updated_at = updates.materiallyUpdatedAt;
    if (updates.organicFreshnessAt !== undefined)
      payload.organic_freshness_at = updates.organicFreshnessAt;

    const { data, error } = await retryDatabaseSerializationFailure<any>(
      () =>
        (supabase.from("listings") as any)
          .update(payload)
          .eq("id", id)
          .select("id,currency")
          .single() as any,
    );
    if (error || !data) {
      databaseFailure("listings.update", error);
    }
    if (updates.price !== undefined) {
      const currency = String(updates.currency || data.currency).toUpperCase();
      const priceMinor = Math.round(
        updates.price * 10 ** getCurrencyMinorUnitDigits(currency),
      );
      const { error: publicationError } = await (supabase as any)
        .from("listing_market_publications")
        .update({ price_minor: priceMinor, currency })
        .eq("listing_id", id)
        .eq("is_primary", true);
      if (publicationError)
        databaseFailure("listings.updatePrimaryMarketPrice", publicationError);
    }
    const persisted = await this.findById(id);
    if (!persisted) databaseFailure("listings.updateReload", null);
    return persisted;
  }

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { error } = await retryDatabaseSerializationFailure(() =>
      supabase.from("listings").delete().eq("id", id),
    );
    if (error) databaseFailure("listings.delete", error);
    return !error;
  }

  async setFavorite(
    userId: string,
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc("set_favorite", {
      p_user_id: userId,
      p_listing_id: listingId,
      p_market_code: requireMarketCode(marketCode),
      p_is_favorite: isFavorite,
    });
    if (error) databaseFailure("listings.setFavorite", error);
    return Boolean(data);
  }

  async rollUpViewCounts(limit = 5_000): Promise<{
    processedEvents: number;
    updatedListings: number;
  }> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "roll_up_listing_view_counts",
      { p_limit: limit },
    );
    if (error) databaseFailure("listings.rollUpViewCounts", error);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      processedEvents: Number(row?.processed_events || 0),
      updatedListings: Number(row?.updated_listings || 0),
    };
  }

  async suggestSearchTerms(input: {
    marketCode: string;
    query: string;
    limit: number;
  }): Promise<SearchTermSuggestion[]> {
    const query = input.query.trim();
    if (!query) return [];
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "suggest_listing_search_terms",
      {
        p_market_code: requireMarketCode(input.marketCode),
        p_query: query,
        p_limit: Math.min(Math.max(input.limit, 1), 20),
      },
    );
    if (error) databaseFailure("listings.suggestSearchTerms", error);
    return ((data || []) as any[]).map((row) => ({
      term: String(row.term),
      label: String(row.display_term),
      listingCount: Number(row.listing_count || 0),
      matchKind: row.match_kind === "fuzzy" ? "fuzzy" : "prefix",
    }));
  }

  async correctSearchQuery(input: {
    marketCode: string;
    query: string;
  }): Promise<string | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "correct_listing_search_query",
      {
        p_market_code: requireMarketCode(input.marketCode),
        p_query: input.query,
      },
    );
    if (error) databaseFailure("listings.correctSearchQuery", error);
    return typeof data === "string" && data.trim() ? data : null;
  }

  async refreshSearchVocabulary(marketCode: string): Promise<number> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "refresh_listing_search_terms",
      { p_market_code: requireMarketCode(marketCode) },
    );
    if (error) databaseFailure("listings.refreshSearchVocabulary", error);
    return Number(data || 0);
  }

  async renewExpiringListings(input: { maxCycles: number; limit: number }) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "renew_expiring_listings",
      { p_max_cycles: input.maxCycles, p_limit: input.limit },
    );
    if (error) databaseFailure("listings.renewExpiringListings", error);
    return ((data || []) as any[]).map((row) => ({
      id: String(row.id),
      sellerId: String(row.seller_id),
      title: String(row.title ?? ""),
      marketCode: String(row.market_code),
      expiresAt: String(row.expires_at),
    }));
  }

  async estimatePrice(input: {
    marketCode: string;
    categoryIds: readonly string[];
    brand?: string;
    model?: string;
    condition?: string;
  }): Promise<ListingPriceEstimate | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "estimate_listing_price",
      {
        p_market_code: requireMarketCode(input.marketCode),
        p_category_ids: [...input.categoryIds],
        p_brand: input.brand ?? null,
        p_model: input.model ?? null,
        p_condition: input.condition ?? null,
      },
    );
    if (error) databaseFailure("listings.estimatePrice", error);
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      basis: row.basis === "sold" ? "sold" : "asking",
      sampleSize: Number(row.sample_size || 0),
      currency: String(row.currency),
      p25Minor: Number(row.p25_minor),
      medianMinor: Number(row.median_minor),
      p75Minor: Number(row.p75_minor),
      narrowedBy: Array.isArray(row.narrowed_by) ? row.narrowed_by : [],
    };
  }

  async publishScheduledListings(limit: number) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "publish_scheduled_listings",
      { p_limit: limit },
    );
    if (error) databaseFailure("listings.publishScheduledListings", error);
    return ((data || []) as any[]).map((row) => ({
      id: String(row.id),
      sellerId: String(row.seller_id),
      title: String(row.title ?? ""),
      marketCode: String(row.market_code),
      status: String(row.status),
    }));
  }

  async getFavorites(userId: string, marketCode: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase as any).rpc(
        "list_favorite_listing_ids",
        {
          p_user_id: userId,
          p_market_code: requireMarketCode(marketCode),
        },
      );
      if (error || !data) databaseFailure("listings.getFavorites", error);
      return data.map((f: any) => f.listing_id);
    } catch (error) {
      databaseFailure("listings.getFavorites", error);
    }
  }

  async createDraft(userId: string, marketCode: string): Promise<any> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const draft = {
      step: "category",
      categoryId: "",
      title: "",
      description: "",
      price: 0,
      condition: "bon-etat",
      photos: [],
      marketCode: requireMarketCode(marketCode),
      allowedDelivery: ["hand_delivery"],
    };
    await this.saveDraft(draft, userId, draft.marketCode);
    return draft;
  }

  async saveDraft(
    draft: any,
    userId: string,
    marketCode: string,
  ): Promise<void> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const supabase = getSupabaseAdminClient();
    const resolvedMarketCode = requireMarketCode(marketCode);
    const { error } = await (
      supabase.from("listing_drafts" as any) as any
    ).upsert(
      {
        user_id: userId,
        market_code: resolvedMarketCode,
        draft_data: { ...draft, marketCode: resolvedMarketCode },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,market_code" },
    );
    if (error) databaseFailure("listings.saveDraft", error);
  }

  async getDraft(userId: string, marketCode: string): Promise<any | null> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (
      supabase.from("listing_drafts" as any) as any
    )
      .select("draft_data")
      .eq("user_id", userId)
      .eq("market_code", requireMarketCode(marketCode))
      .maybeSingle();
    if (error) databaseFailure("listings.getDraft", error);
    return data?.draft_data ?? null;
  }
}
