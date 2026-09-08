import { Listing, SearchFilters } from "../../types";
import { PublicationDraftState } from "../../domains/publication/publication.types";
import type { Money } from "@shongre/contracts";
import type { components } from "@shongre/contracts/openapi";

export type ListingCharacteristicsData =
  components["schemas"]["ListingCharacteristics"];

export type BulkImportValidationCode =
  "TITLE_REQUIRED" | "TITLE_TOO_SHORT" | "TITLE_TOO_LONG" | "PRICE_INVALID";

export interface BulkListingImportRow {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  subCategorySlug: string;
  price: Money;
  condition: string;
  stock: number;
  city: string;
  postalCode: string;
  isValid: boolean;
  validationErrorCode?: BulkImportValidationCode;
}

export interface BulkListingImportTemplate {
  fileName: string;
  content: string;
}

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
