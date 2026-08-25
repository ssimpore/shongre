import { Listing, SearchFilters } from "../../types";
import { PublicationDraftState } from "../../domains/publication/publication.types";
import type { Money } from "@shongre/contracts";

export type BulkImportValidationCode =
  "TITLE_REQUIRED" | "TITLE_TOO_SHORT" | "PRICE_INVALID";

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

export interface ListingsServiceContract {
  getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }>;
  getListingById(id: string): Promise<Listing | null>;
  searchListings(params: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  createListingDraft(userId?: string): Promise<PublicationDraftState>;
  getListingDraft(): Promise<PublicationDraftState | null>;
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
  deleteListing(id: string): Promise<boolean>;
  toggleFavorite(listingId: string): Promise<boolean>;
  getFavorites(): Promise<string[]>;
}
