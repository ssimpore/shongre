import { ListingsServiceContract } from "../../contracts/listings.contract";
import { httpClient } from "./http-client";
import { Listing, SearchFilters } from "../../../types";
import { PublicationDraftState } from "../../../domains/publication/publication.types";

export class HttpListingsService implements ListingsServiceContract {
  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }> {
    return httpClient.get<{ listings: Listing[]; total: number }>("/listings", {
      params: filter as Record<string, string | number | boolean | undefined>,
    });
  }

  async getListingById(id: string): Promise<Listing | null> {
    return httpClient.get<Listing>(`/listings/${id}`);
  }

  async searchListings(params: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return httpClient.post<{
      items: Listing[];
      total: number;
      page: number;
      totalPages: number;
    }>("/listings/search", params);
  }

  async createListingDraft(userId?: string): Promise<PublicationDraftState> {
    return httpClient.post<PublicationDraftState>("/listings/drafts", {
      userId,
    });
  }

  async saveListingDraft(
    draft: PublicationDraftState,
    userId?: string,
  ): Promise<void> {
    return httpClient.put<void>(`/listings/drafts/${userId || "me"}`, draft);
  }

  async publishListing(
    draft: PublicationDraftState,
    sellerId: string,
  ): Promise<Listing> {
    return httpClient.post<Listing>("/listings/publish", { draft, sellerId });
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    return httpClient.put<Listing>(`/listings/${id}`, updates);
  }

  async deleteListing(id: string): Promise<boolean> {
    await httpClient.delete(`/listings/${id}`);
    return true;
  }

  async toggleFavorite(listingId: string): Promise<boolean> {
    const res = await httpClient.post<{ isFavorite: boolean }>(
      `/listings/${listingId}/favorite`,
    );
    return res.isFavorite;
  }

  async getFavorites(): Promise<string[]> {
    const res = await httpClient.get<{ listingIds: string[] }>("/favorites");
    return res.listingIds;
  }
}

export const httpListingsService = new HttpListingsService();
