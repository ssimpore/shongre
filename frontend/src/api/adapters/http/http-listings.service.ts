import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import { activeDataLocale } from "../../../i18n/localized";
import { apiOperation } from "./generated-api-operation";
import {
  BulkListingImportTemplate,
  BulkListingImportRow,
  ListingPriceEstimate,
  ListingRemovalOutcome,
  ListingsServiceContract,
  ParseBulkListingImportInput,
  PublishBulkListingsInput,
} from "../../contracts/listings.contract";
import {
  DeliveryType,
  Listing,
  ListingPricePresentation,
  ListingStatus,
  SearchFilters,
} from "../../../types";
import { PublicationDraftState } from "../../../domains/publication/publication.types";
import { publicListingCardsRequestSchema } from "@shongre/contracts/listings";
import type { components, operations } from "@shongre/contracts/openapi";
import { majorToMinorAmount } from "@shongre/shared/money";
import { AppError } from "../../errors/app-error";

export type BackendListing = components["schemas"]["PublicListing"];
type BackendListingCollection =
  operations["getListings"]["responses"][200]["content"]["application/json"];
type BackendListingDetail =
  operations["getListingsById"]["responses"][200]["content"]["application/json"];
type BackendListingCardsResult =
  operations["postListingsCards"]["responses"][200]["content"]["application/json"];
type BackendListingSearchResult =
  operations["postListingsSearch"]["responses"][200]["content"]["application/json"];
type BackendOwnedListingCollection =
  operations["getAccountListings"]["responses"][200]["content"]["application/json"];
type BackendSoldListing =
  operations["postListingsByIdMarkSold"]["responses"][200]["content"]["application/json"];

const PUBLIC_LISTING_CARD_BATCH_SIZE = 100;

const frontendStatus = (status: string): ListingStatus =>
  status === "published"
    ? "active"
    : ((["draft", "reserved", "sold", "archived", "expired"].includes(status)
        ? status
        : "pending_review") as ListingStatus);

const RECURRING_PRICE_PERIODS = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  rent_plus_charges: "month",
  total: "total",
} as const satisfies Record<
  string,
  NonNullable<ListingPricePresentation["period"]>
>;

function mapPricePresentation(
  listing: BackendListing,
  priceType: unknown,
): ListingPricePresentation | undefined {
  if (listing.pricePresentation) return listing.pricePresentation;
  if (priceType === "on_request") {
    return {
      kind: "price",
      visibility: "undisclosed",
      currency: listing.currency,
    };
  }
  if (
    typeof priceType !== "string" ||
    !(priceType in RECURRING_PRICE_PERIODS)
  ) {
    return undefined;
  }
  const amountMinor = majorToMinorAmount(listing.price, listing.currency);
  return {
    kind: priceType === "rent_plus_charges" ? "rent" : "service_rate",
    visibility: "public",
    minimumAmountMinor: amountMinor,
    maximumAmountMinor: amountMinor,
    currency: listing.currency,
    period:
      RECURRING_PRICE_PERIODS[
        priceType as keyof typeof RECURRING_PRICE_PERIODS
      ],
  };
}

export const mapBackendListing = (listing: BackendListing): Listing => {
  const sellerType = listing.publisherType
    ? listing.publisherType === "professional"
      ? "pro"
      : "individual"
    : listing.seller?.accountType === "professional"
      ? "pro"
      : "individual";
  const locale = activeDataLocale();
  const priceType = listing.attributes?.price_type;
  const attributes = {
    ...(listing.attributes ?? {}),
    ...(typeof listing.brand === "string" && listing.brand.trim()
      ? { brand: listing.brand }
      : {}),
  };
  const marketPublication = listing.marketPublications?.find(
    (publication) => publication.marketCode === listing.marketCode,
  );
  const availableServices = marketPublication?.availableServices;
  const reservationType =
    availableServices?.reservation_type === "instant" ||
    availableServices?.reservation_type === "request"
      ? availableServices.reservation_type
      : undefined;
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    originalPrice: listing.originalPrice,
    currency: listing.currency,
    isNegotiable: priceType === "negotiable",
    isFreeDonation: priceType === "free",
    pricePresentation: mapPricePresentation(listing, priceType),
    fulfillmentTypes: [...(listing.fulfillmentTypes ?? [])],
    requiresPhysicalDelivery: listing.requiresPhysicalDelivery,
    productVersion: listing.productVersion,
    taxonomy: listing.taxonomy,
    categorySlug: listing.taxonomy?.rootSlug ?? "",
    subCategorySlug: listing.taxonomy?.categorySlug ?? "",
    categoryLabel: localizeTaxonomyLabels(listing.taxonomy?.rootLabels, locale),
    subCategoryLabel: localizeTaxonomyLabels(
      listing.taxonomy?.categoryLabels,
      locale,
    ),
    listingTypeId: listing.listingTypeId,
    listingIntent: listing.listingIntent,
    condition: listing.condition as Listing["condition"],
    sellerId: listing.sellerId,
    sellerProfile: listing.seller,
    sellerName: listing.seller?.name || "Vendeur",
    sellerType,
    publisherType: listing.publisherType,
    publisherUserId: listing.publisherUserId,
    publisherOrganizationId: listing.publisherOrganizationId,
    publisherBranchId: listing.publisherBranchId,
    publisherVerificationStatus: listing.publisherVerificationStatus,
    sellerAvatarUrl: listing.seller?.avatarUrl,
    sellerRating: Number(listing.seller?.rating || 0),
    sellerReviewCount: Number(listing.seller?.reviewCount || 0),
    sellerIsVerified: Boolean(
      listing.seller?.isVerified || listing.seller?.isBusinessVerified,
    ),
    sellerResponseTimeLabel: listing.seller?.responseTimeText,
    sellerCity: listing.seller?.city || listing.city,
    sellerPostalCode: listing.postalCode,
    city: listing.city,
    postalCode: listing.postalCode,
    department: listing.department || "",
    region: listing.region || "",
    latitude: listing.latitude,
    longitude: listing.longitude,
    photos: (listing.images ?? []).map((url, index) => ({
      id: `${listing.id}:media:${index}`,
      url,
      isCover: index === 0,
    })),
    coverImageUrl: listing.images?.[0] || "",
    deliveryOptions: (listing.allowedDelivery ?? [])
      .filter((type) =>
        [
          "hand_delivery",
          "relay_point",
          "home_delivery",
          "custom_carrier",
          "cocolis",
          "express",
          "digital",
        ].includes(type),
      )
      .map((type) => ({
        type,
        available: true,
        price: type === "hand_delivery" ? 0 : listing.shippingCost,
      })),
    isOnlinePaymentAvailable: availableServices?.online_payment === true,
    isReservable: availableServices?.reservation === true,
    reservationType,
    attributes,
    status: frontendStatus(listing.status),
    viewsCount: listing.viewCount,
    viewCount: listing.viewCount,
    favoritesCount: listing.favoriteCount,
    contactCount: 0,
    isBoosted: Boolean(listing.isUrgent || listing.isFeatured),
    promotionState: listing.promotionState,
    promotionType: listing.promotionType,
    promotionSource: listing.promotionSource,
    promotionSourceId: listing.promotionSourceId,
    promotionLabel: listing.promotionLabel,
    promotionStartAt: listing.promotionStartAt,
    promotionEndAt: listing.promotionEndAt,
    discovery: listing.discovery,
    publishedAt: listing.publishedAt,
    marketCode: listing.marketCode,
    marketCodes: [listing.marketCode],
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    expiresAt: listing.expiresAt,
    autoRenew: listing.autoRenew,
    scheduledPublishAt: listing.scheduledPublishAt,
  };
};

export class HttpListingsService implements ListingsServiceContract {
  async getListings(filter?: SearchFilters) {
    const result = await apiOperation<BackendListingCollection, "getListings">(
      "getListings",
      {
        query: filter as Record<string, string | number | boolean | undefined>,
      },
    );
    return { ...result, listings: result.listings.map(mapBackendListing) };
  }

  async getListingById(id: string): Promise<Listing | null> {
    try {
      const listing = await apiOperation<
        BackendListingDetail,
        "getListingsById"
      >("getListingsById", { path: { id: id } });
      return listing ? mapBackendListing(listing) : null;
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  }

  async getCharacteristics(id: string, marketCode: string, locale: string) {
    return apiOperation<
      components["schemas"]["ListingCharacteristics"],
      "getListingCharacteristics"
    >("getListingCharacteristics", {
      path: { id },
      query: { locale },
      headers: { "X-Shongre-Market": marketCode },
    });
  }

  async getPriceQuote(id: string, deliveryMethod?: DeliveryType) {
    return apiOperation<
      components["schemas"]["ListingPriceQuote"],
      "getListingPriceQuote"
    >("getListingPriceQuote", {
      path: { id },
      ...(deliveryMethod ? { query: { deliveryMethod } } : {}),
    });
  }

  async getOwnListings(marketCode: string) {
    const result = await apiOperation<
      BackendOwnedListingCollection,
      "getAccountListings"
    >("getAccountListings", { headers: { "X-Shongre-Market": marketCode } });
    return { ...result, listings: result.listings.map(mapBackendListing) };
  }

  async getPublicListingsByIds(
    listingIds: readonly string[],
    marketCode: string,
  ): Promise<Listing[]> {
    // Browser-stale data must not make a production UUID batch
    // fail as a whole. Invalid identifiers are simply not public projections.
    const uniqueIds = [...new Set(listingIds)].filter(
      (listingId) =>
        publicListingCardsRequestSchema.safeParse({
          listingIds: [listingId],
        }).success,
    );
    const batches = Array.from(
      { length: Math.ceil(uniqueIds.length / PUBLIC_LISTING_CARD_BATCH_SIZE) },
      (_, index) =>
        uniqueIds.slice(
          index * PUBLIC_LISTING_CARD_BATCH_SIZE,
          (index + 1) * PUBLIC_LISTING_CARD_BATCH_SIZE,
        ),
    );
    const results = await Promise.all(
      batches.map((batch) =>
        apiOperation<BackendListingCardsResult, "postListingsCards">(
          "postListingsCards",
          {
            body: { listingIds: batch },
            headers: { "X-Shongre-Market": marketCode },
          },
        ),
      ),
    );
    return results.flatMap((result) => result.listings.map(mapBackendListing));
  }

  async searchListings(params: SearchFilters) {
    const result = await apiOperation<
      BackendListingSearchResult,
      "postListingsSearch"
    >("postListingsSearch", {
      body: params,
      ...(params.marketCode
        ? { headers: { "X-Shongre-Market": params.marketCode } }
        : {}),
    });
    return { ...result, items: result.items.map(mapBackendListing) };
  }

  async createListingDraft(marketCode: string): Promise<PublicationDraftState> {
    return apiOperation<PublicationDraftState, "postListingDrafts">(
      "postListingDrafts",
      { headers: { "X-Shongre-Market": marketCode } },
    );
  }

  async getListingDraft(
    marketCode: string,
  ): Promise<PublicationDraftState | null> {
    return apiOperation<
      PublicationDraftState | null,
      "getListingDraftsCurrent"
    >("getListingDraftsCurrent", {
      headers: { "X-Shongre-Market": marketCode },
    });
  }

  async saveListingDraft(draft: PublicationDraftState): Promise<void> {
    await apiOperation<void, "putListingDraftsCurrent">(
      "putListingDraftsCurrent",
      { body: draft, headers: { "X-Shongre-Market": draft.marketCode } },
    );
  }

  async publishListing(draft: PublicationDraftState): Promise<Listing> {
    const { publicationPayload } = await import("./publication-payload");
    const listing = await apiOperation<BackendListing, "postListingsPublish">(
      "postListingsPublish",
      {
        body: {
          draft: publicationPayload(draft),
        },
      },
    );
    return mapBackendListing(listing);
  }

  async uploadListingPhoto(file: File) {
    const prepared = await apiOperation<
      { assetId: string; signedUrl: string; contentType: string },
      "postMediaListingsUploads"
    >("postMediaListingsUploads", {
      body: {
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
    });
    const uploaded = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": prepared.contentType },
      body: file,
    });
    if (!uploaded.ok) {
      throw new Error("Le téléversement de la photo a échoué.");
    }
    return apiOperation<
      { assetId: string; url: string },
      "postMediaListingsUploadsByIdComplete"
    >("postMediaListingsUploadsByIdComplete", {
      path: { id: prepared.assetId },
    });
  }

  async getBulkImportTemplate(
    locale: string,
  ): Promise<BulkListingImportTemplate> {
    return apiOperation<
      BulkListingImportTemplate,
      "getListingsBulkimportTemplate"
    >("getListingsBulkimportTemplate", { query: { locale } });
  }

  async parseBulkImportCsv(
    input: ParseBulkListingImportInput,
  ): Promise<BulkListingImportRow[]> {
    return apiOperation<BulkListingImportRow[], "postListingsBulkimportParse">(
      "postListingsBulkimportParse",
      { body: input },
    );
  }

  async publishBulkListings(
    input: PublishBulkListingsInput,
  ): Promise<Listing[]> {
    const listings = await apiOperation<
      BackendListing[],
      "postListingsBulkimportPublish"
    >("postListingsBulkimportPublish", {
      body: { marketCode: input.marketCode, rows: input.rows },
    });
    return listings.map(mapBackendListing);
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const listing = await apiOperation<BackendListing, "putListingsById">(
      "putListingsById",
      {
        path: { id: id },
        body: {
          title: updates.title,
          description: updates.description,
          price: updates.price,
          condition: updates.condition,
          city: updates.city,
          postalCode: updates.postalCode,
          attributes: updates.attributes,
          autoRenew: updates.autoRenew,
        },
      },
    );
    return mapBackendListing(listing);
  }

  async estimatePrice(input: {
    categoryId: string;
    brand?: string;
    model?: string;
    condition?: string;
  }): Promise<ListingPriceEstimate> {
    return apiOperation<ListingPriceEstimate, "getListingsPriceEstimate">(
      "getListingsPriceEstimate",
      {
        query: {
          categoryId: input.categoryId,
          ...(input.brand ? { brand: input.brand } : {}),
          ...(input.model ? { model: input.model } : {}),
          ...(input.condition ? { condition: input.condition } : {}),
        },
      },
    );
  }

  async markListingSold(id: string): Promise<Listing> {
    const listing = await apiOperation<
      BackendSoldListing,
      "postListingsByIdMarkSold"
    >("postListingsByIdMarkSold", { path: { id: id } });
    return mapBackendListing(listing);
  }

  async deleteListing(id: string): Promise<ListingRemovalOutcome> {
    const result = await apiOperation("deleteListingsById", {
      path: { id: id },
    });
    return result.outcome;
  }

  async setFavorite(
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await apiOperation("putListingsByIdFavorite", {
      path: { id: listingId },
      body: { isFavorite },
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.isFavorite;
  }

  async getFavoriteCollection(marketCode: string) {
    const result = await apiOperation("getFavorites", {
      headers: { "X-Shongre-Market": marketCode },
    });
    return {
      listingIds: [...result.listingIds],
      listings: result.listings.map(mapBackendListing),
    };
  }
}

export const httpListingsService = new HttpListingsService();
