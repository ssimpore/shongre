import { DeliveryType, Listing, SearchFilters } from "../../types";
import { PublicationDraftState } from "../../domains/publication/publication.types";
import type { components } from "@shongre/contracts/openapi";

/** The buyer-facing price breakdown, as the contract defines it. */
export type ListingPriceQuote = components["schemas"]["ListingPriceQuote"];

export type ListingCharacteristicsData =
  components["schemas"]["ListingCharacteristics"];

export type BulkListingImportRow =
  components["schemas"]["BulkListingImportRow"];
export type BulkImportValidationCode = NonNullable<
  BulkListingImportRow["validationErrorCode"]
>;
export type BulkListingImportTemplate =
  components["schemas"]["BulkListingImportTemplate"];

export interface ParseBulkListingImportInput {
  content: string;
  marketCode: string;
  defaultCity: string;
  defaultPostalCode: string;
}

export interface PublishBulkListingsInput {
  sellerId: string;
  marketCode: string;
  rows: BulkListingImportRow[];
}

export interface FavoriteListingCollection {
  listingIds: string[];
  /** Public projections visible in the exact requested market. */
  listings: Listing[];
}

export interface ListingsServiceContract {
  getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }>;
  getListingById(id: string): Promise<Listing | null>;
  getCharacteristics(
    id: string,
    marketCode: string,
    locale: string,
  ): Promise<ListingCharacteristicsData>;
  /**
   * The buyer-facing price breakdown for display before checkout.
   *
   * Separate from `orders.quoteDirectPurchase`, which needs a signed-in buyer
   * because it also decides whether that buyer may purchase. The listing page
   * has to disclose a total to a signed-out visitor, and the fee is market
   * policy rather than buyer-specific, so this read carries no buyer context.
   */
  getPriceQuote(
    id: string,
    deliveryMethod?: DeliveryType,
  ): Promise<ListingPriceQuote>;
  getOwnListings(
    userId: string,
    marketCode: string,
  ): Promise<{ listings: Listing[]; total: number }>;
  /** Public, market-scoped card projections used for guest-owned local sets. */
  getPublicListingsByIds(
    listingIds: readonly string[],
    marketCode: string,
  ): Promise<Listing[]>;
  searchListings(params: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  createListingDraft(
    marketCode: string,
    userId?: string,
  ): Promise<PublicationDraftState>;
  getListingDraft(marketCode: string): Promise<PublicationDraftState | null>;
  saveListingDraft(
    draft: PublicationDraftState,
    userId?: string,
  ): Promise<void>;
  publishListing(
    draft: PublicationDraftState,
    sellerId: string,
  ): Promise<Listing>;
  uploadListingPhoto(file: File): Promise<{ assetId: string; url: string }>;
  getBulkImportTemplate(locale: string): Promise<BulkListingImportTemplate>;
  parseBulkImportCsv(
    input: ParseBulkListingImportInput,
  ): Promise<BulkListingImportRow[]>;
  publishBulkListings(input: PublishBulkListingsInput): Promise<Listing[]>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;
  markListingSold(id: string): Promise<Listing>;
  deleteListing(id: string): Promise<boolean>;
  setFavorite(
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  getFavoriteCollection(marketCode: string): Promise<FavoriteListingCollection>;
}
