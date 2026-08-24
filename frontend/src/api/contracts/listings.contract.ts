import { Listing, SearchFilters } from "../../types";
import { PublicationDraftState } from "../../domains/publication/publication.types";

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
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;
  deleteListing(id: string): Promise<boolean>;
  toggleFavorite(listingId: string): Promise<boolean>;
  getFavorites(): Promise<string[]>;
}
