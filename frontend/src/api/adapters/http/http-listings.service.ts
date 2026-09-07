import {
  BulkListingImportTemplate,
  BulkListingImportRow,
  ListingsServiceContract,
  ParseBulkListingImportInput,
  PublishBulkListingsInput,
} from "../../contracts/listings.contract";
import { httpClient } from "./http-client";
import {
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
type BackendFavoriteCollection =
  operations["getFavorites"]["responses"][200]["content"]["application/json"];
type BackendFavoriteStateResult =
  operations["putListingsByIdFavorite"]["responses"][200]["content"]["application/json"];
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
  const categoryParts = listing.categoryId.split(".");
  const priceType = listing.attributes?.price_type;
  const attributes = {
    ...(listing.attributes ?? {}),
    ...(typeof listing.brand === "string" && listing.brand.trim()
      ? { brand: listing.brand }
      : {}),
  };
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    originalPrice: listing.originalPrice,
    currency: listing.currency,
    isNegotiable: false,
    isFreeDonation: priceType === "free",
    pricePresentation: mapPricePresentation(listing, priceType),
    fulfillmentTypes: [...(listing.fulfillmentTypes ?? [])],
    requiresPhysicalDelivery: listing.requiresPhysicalDelivery,
    productVersion: listing.productVersion,
    categorySlug: categoryParts[0] || listing.categoryId,
    subCategorySlug: listing.categoryId,
    categoryLabel: categoryParts[0] || "Annonce",
    subCategoryLabel: categoryParts.at(-1) || "Annonce",
    condition: listing.condition as Listing["condition"],
    sellerId: listing.sellerId,
    sellerProfile: listing.seller,
    sellerName: listing.seller?.name || "Vendeur",
    sellerType,
    publisherType: listing.publisherType,
    sellerAvatarUrl: listing.seller?.avatarUrl,
    sellerRating: Number(listing.seller?.rating || 0),
    sellerReviewCount: Number(listing.seller?.reviewCount || 0),
    sellerIsVerified: Boolean(
      listing.seller?.isVerified || listing.seller?.isBusinessVerified,
    ),
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
        ["hand_delivery", "home_delivery", "custom_carrier"].includes(type),
      )
      .map((type) => ({
        type,
        available: true,
        price: type === "hand_delivery" ? 0 : listing.shippingCost,
      })),
    isOnlinePaymentAvailable: Boolean(
      listing.marketPublications?.some(
        (publication) => publication.availableServices?.online_payment === true,
      ),
    ),
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
  };
};

export class HttpListingsService implements ListingsServiceContract {
  async getListings(filter?: SearchFilters) {
    const result = await httpClient.get<BackendListingCollection>("/listings", {
      params: filter as Record<string, string | number | boolean | undefined>,
    });
    return { ...result, listings: result.listings.map(mapBackendListing) };
  }

  async getListingById(id: string): Promise<Listing | null> {
    try {
      const listing = await httpClient.get<BackendListingDetail>(
        `/listings/${id}`,
      );
      return listing ? mapBackendListing(listing) : null;
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  }

  async getOwnListings(_userId: string, marketCode: string) {
    const result = await httpClient.get<BackendOwnedListingCollection>(
      "/account/listings",
      { headers: { "X-Shongre-Market": marketCode } },
    );
    return { ...result, listings: result.listings.map(mapBackendListing) };
  }

  async getPublicListingsByIds(
    listingIds: readonly string[],
    marketCode: string,
  ): Promise<Listing[]> {
    // Browser-local demo or stale data must not make a production UUID batch
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
        httpClient.post<BackendListingCardsResult>(
          "/listings/cards",
          { listingIds: batch },
          { headers: { "X-Shongre-Market": marketCode } },
        ),
      ),
    );
    return results.flatMap((result) => result.listings.map(mapBackendListing));
  }

  async searchListings(params: SearchFilters) {
    const result = await httpClient.post<BackendListingSearchResult>(
      "/listings/search",
      params,
      params.marketCode
        ? { headers: { "X-Shongre-Market": params.marketCode } }
        : undefined,
    );
    return { ...result, items: result.items.map(mapBackendListing) };
  }

  async createListingDraft(marketCode: string): Promise<PublicationDraftState> {
    return httpClient.post<PublicationDraftState>(
      "/listing-drafts",
      undefined,
      {
        headers: { "X-Shongre-Market": marketCode },
      },
    );
  }

  async getListingDraft(
    marketCode: string,
  ): Promise<PublicationDraftState | null> {
    return httpClient.get<PublicationDraftState | null>(
      "/listing-drafts/current",
      { headers: { "X-Shongre-Market": marketCode } },
    );
  }

  async saveListingDraft(draft: PublicationDraftState): Promise<void> {
    await httpClient.put("/listing-drafts/current", draft, {
      headers: { "X-Shongre-Market": draft.marketCode },
    });
  }

  async publishListing(draft: PublicationDraftState): Promise<Listing> {
    const { publicationPayload } = await import("./publication-payload");
    const listing = await httpClient.post<BackendListing>("/listings/publish", {
      draft: publicationPayload(draft),
    });
    return mapBackendListing(listing);
  }

  async uploadListingPhoto(file: File) {
    const prepared = await httpClient.post<{
      assetId: string;
      signedUrl: string;
      contentType: string;
    }>("/media/listings/uploads", {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    const uploaded = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": prepared.contentType },
      body: file,
    });
    if (!uploaded.ok) {
      throw new Error("Le téléversement de la photo a échoué.");
    }
    return httpClient.post<{ assetId: string; url: string }>(
      `/media/listings/uploads/${prepared.assetId}/complete`,
    );
  }

  async getBulkImportTemplate(
    locale: string,
  ): Promise<BulkListingImportTemplate> {
    return httpClient.get<BulkListingImportTemplate>(
      "/listings/bulk-import/template",
      { params: { locale } },
    );
  }

  async parseBulkImportCsv(
    input: ParseBulkListingImportInput,
  ): Promise<BulkListingImportRow[]> {
    return httpClient.post<BulkListingImportRow[]>(
      "/listings/bulk-import/parse",
      input,
    );
  }

  async publishBulkListings(
    input: PublishBulkListingsInput,
  ): Promise<Listing[]> {
    const listings = await httpClient.post<BackendListing[]>(
      "/listings/bulk-import/publish",
      { marketCode: input.marketCode, rows: input.rows },
    );
    return listings.map(mapBackendListing);
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const listing = await httpClient.put<BackendListing>(`/listings/${id}`, {
      title: updates.title,
      description: updates.description,
      price: updates.price,
      condition: updates.condition,
      city: updates.city,
      postalCode: updates.postalCode,
      attributes: updates.attributes,
    });
    return mapBackendListing(listing);
  }

  async markListingSold(id: string): Promise<Listing> {
    const listing = await httpClient.post<BackendSoldListing>(
      `/listings/${id}/mark-sold`,
    );
    return mapBackendListing(listing);
  }

  async deleteListing(id: string): Promise<boolean> {
    await httpClient.delete(`/listings/${id}`);
    return true;
  }

  async setFavorite(
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await httpClient.put<BackendFavoriteStateResult>(
      `/listings/${listingId}/favorite`,
      { isFavorite },
      { headers: { "X-Shongre-Market": marketCode } },
    );
    return result.isFavorite;
  }

  async getFavoriteCollection(marketCode: string) {
    const result = await httpClient.get<BackendFavoriteCollection>(
      "/favorites",
      { headers: { "X-Shongre-Market": marketCode } },
    );
    return {
      listingIds: [...result.listingIds],
      listings: result.listings.map(mapBackendListing),
    };
  }
}

export const httpListingsService = new HttpListingsService();
