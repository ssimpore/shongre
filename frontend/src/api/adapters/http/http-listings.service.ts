import {
  BulkListingImportTemplate,
  BulkListingImportRow,
  ListingsServiceContract,
  ParseBulkListingImportInput,
  PublishBulkListingsInput,
} from "../../contracts/listings.contract";
import { httpClient } from "./http-client";
import { Listing, ListingStatus, SearchFilters } from "../../../types";
import { PublicationDraftState } from "../../../domains/publication/publication.types";
import { toTaxonomyV4ItemCondition } from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";

export type BackendListing = {
  id: string;
  sellerId: string;
  seller?: {
    name?: string;
    accountType?: "individual" | "professional";
    avatarUrl?: string;
    city?: string;
    rating?: number;
    reviewCount?: number;
    isVerified?: boolean;
    isBusinessVerified?: boolean;
  };
  categoryId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  status: string;
  condition: Listing["condition"];
  marketCode: string;
  city: string;
  postalCode: string;
  department?: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  allowedDelivery: Listing["deliveryOptions"][number]["type"][];
  shippingCost?: number;
  fulfillmentTypes?: import("@shongre/contracts/digital-products").FulfillmentType[];
  requiresPhysicalDelivery?: boolean;
  productVersion?: string;
  images: string[];
  attributes: Record<string, unknown>;
  isUrgent?: boolean;
  isFeatured?: boolean;
  promotionState?: Listing["promotionState"];
  promotionType?: Listing["promotionType"];
  promotionLabel?: string;
  promotionStartAt?: string;
  promotionEndAt?: string;
  publishedAt?: string;
  bumpedAt?: string;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

const frontendStatus = (status: string): ListingStatus =>
  status === "published"
    ? "active"
    : ((["draft", "reserved", "sold", "archived", "expired"].includes(status)
        ? status
        : "pending_review") as ListingStatus);

export const mapBackendListing = (listing: BackendListing): Listing => {
  const sellerType =
    listing.seller?.accountType === "professional" ? "pro" : "individual";
  const categoryParts = listing.categoryId.split(".");
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    originalPrice: listing.originalPrice,
    currency: listing.currency,
    isNegotiable: false,
    isFreeDonation: listing.price === 0,
    fulfillmentTypes: listing.fulfillmentTypes,
    requiresPhysicalDelivery: listing.requiresPhysicalDelivery,
    productVersion: listing.productVersion,
    categorySlug: categoryParts[0] || listing.categoryId,
    subCategorySlug: listing.categoryId,
    categoryLabel: categoryParts[0] || "Annonce",
    subCategoryLabel: categoryParts.at(-1) || "Annonce",
    condition: listing.condition,
    sellerId: listing.sellerId,
    sellerName: listing.seller?.name || "Vendeur",
    sellerType,
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
    isOnlinePaymentAvailable: true,
    attributes: listing.attributes ?? {},
    status: frontendStatus(listing.status),
    viewsCount: listing.viewCount,
    viewCount: listing.viewCount,
    favoritesCount: listing.favoriteCount,
    contactCount: 0,
    isBoosted: Boolean(listing.isUrgent || listing.isFeatured),
    promotionState: listing.promotionState,
    promotionType: listing.promotionType,
    promotionLabel: listing.promotionLabel,
    promotionStartAt: listing.promotionStartAt,
    promotionEndAt: listing.promotionEndAt,
    publishedAt: listing.publishedAt,
    marketCode: listing.marketCode,
    marketCodes: [listing.marketCode],
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    expiresAt: listing.expiresAt,
  };
};

const taxonomyV4Bundle = getTaxonomyV4PublicBundle();

const publicationPayload = (draft: PublicationDraftState) => {
  const acceptsItemCondition = taxonomyV4Bundle.bindings.some(
    (binding) =>
      binding.categoryId === draft.taxonomyNodeId &&
      binding.listingTypeId === draft.listingTypeId &&
      binding.attributeId === "item_condition",
  );
  const itemCondition = acceptsItemCondition
    ? toTaxonomyV4ItemCondition(draft.condition)
    : undefined;

  return {
    title: draft.title,
    description: draft.description,
    price: draft.pricing.isFreeDonation ? 0 : draft.pricing.amount,
    priceModel: draft.pricing.priceModel,
    categoryId: draft.taxonomyNodeId,
    marketCode: draft.marketCode,
    city: draft.location.city,
    postalCode: draft.location.postalCode,
    images: [...draft.photos]
      .sort((left, right) => Number(right.isCover) - Number(left.isCover))
      .map((photo) => photo.url),
    listingTypeId: draft.listingTypeId,
    intent: draft.listingIntent,
    taxonomyVersion: draft.taxonomyVersion,
    attributes: {
      ...draft.attributes,
      ...(itemCondition ? { item_condition: itemCondition } : {}),
      title: draft.title,
      description: draft.description,
      images: draft.photos.map((photo) => photo.url),
      price: Math.round(draft.pricing.amount * 100),
      currency: draft.pricing.currency,
      location_country: draft.location.countryCode,
      location_postcode: draft.location.postalCode,
      location_city: draft.location.city,
    },
    allowedDelivery: [
      ...(draft.digitalFulfillment
        ? ["digital"]
        : [
            ...(draft.fulfillment.allowHandDelivery ? ["hand_delivery"] : []),
            ...(draft.fulfillment.allowParcelShipping ? ["home_delivery"] : []),
          ]),
    ],
    fulfillmentTypes: draft.fulfillmentTypes ?? ["PHYSICAL"],
    digitalFulfillment: draft.digitalFulfillment,
    condition: draft.condition,
  };
};

export class HttpListingsService implements ListingsServiceContract {
  async getListings(filter?: SearchFilters) {
    const result = await httpClient.get<{
      listings: BackendListing[];
      total: number;
    }>("/listings", {
      params: filter as Record<string, string | number | boolean | undefined>,
    });
    return { ...result, listings: result.listings.map(mapBackendListing) };
  }

  async getListingById(id: string): Promise<Listing | null> {
    const listing = await httpClient.get<BackendListing | null>(
      `/listings/${id}`,
    );
    return listing ? mapBackendListing(listing) : null;
  }

  async searchListings(params: SearchFilters) {
    const result = await httpClient.post<{
      items: BackendListing[];
      total: number;
      page: number;
      totalPages: number;
    }>("/listings/search", params);
    return { ...result, items: result.items.map(mapBackendListing) };
  }

  async createListingDraft(): Promise<PublicationDraftState> {
    return httpClient.post<PublicationDraftState>("/listing-drafts");
  }

  async getListingDraft(): Promise<PublicationDraftState | null> {
    return httpClient.get<PublicationDraftState | null>(
      "/listing-drafts/current",
    );
  }

  async saveListingDraft(draft: PublicationDraftState): Promise<void> {
    await httpClient.put("/listing-drafts/current", draft);
  }

  async publishListing(draft: PublicationDraftState): Promise<Listing> {
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

  async deleteListing(id: string): Promise<boolean> {
    await httpClient.delete(`/listings/${id}`);
    return true;
  }

  async toggleFavorite(listingId: string): Promise<boolean> {
    const result = await httpClient.post<{ isFavorite: boolean }>(
      `/listings/${listingId}/favorite`,
    );
    return result.isFavorite;
  }

  async getFavorites(): Promise<string[]> {
    const result = await httpClient.get<{ listingIds: string[] }>("/favorites");
    return result.listingIds;
  }
}

export const httpListingsService = new HttpListingsService();
