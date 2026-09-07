import { apiRequest } from "@/api/http-client";
import type { ListingCardView } from "@shongre/contracts";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import type { operations } from "@shongre/contracts/openapi";
import { mapBackendListing } from "@/features/listings/listing.mapper";
import { deliveryService } from "@/features/delivery/delivery.service";

type BackendFavoriteCollection =
  operations["getFavorites"]["responses"][200]["content"]["application/json"];
type BackendFavoriteState =
  operations["putListingsByIdFavorite"]["responses"][200]["content"]["application/json"];
type BackendFavoriteSetRequest =
  operations["putListingsByIdFavorite"]["requestBody"]["content"]["application/json"];

export interface FavoriteListingCollection {
  listingIds: string[];
  listings: ListingCardView[];
}

export interface FavoritesService {
  list(userId: string, marketCode: string): Promise<FavoriteListingCollection>;
  setFavorite(
    userId: string,
    marketCode: string,
    listingId: string,
    isFavorite: boolean,
  ): Promise<boolean>;
}

export class HttpFavoritesService implements FavoritesService {
  async list(
    _userId: string,
    marketCode: string,
  ): Promise<FavoriteListingCollection> {
    const result = await apiRequest<BackendFavoriteCollection>(
      "/favorites",
      {},
      marketCode,
    );
    return {
      listingIds: [...result.listingIds],
      listings: result.listings.map(mapBackendListing),
    };
  }

  async setFavorite(
    userId: string,
    marketCode: string,
    listingId: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const deliveryRequestId =
      deliveryRequestIdFromDiscoveryListingId(listingId);
    if (deliveryRequestId) {
      return deliveryService.setFavoriteRequest(
        userId,
        deliveryRequestId,
        marketCode,
        isFavorite,
      );
    }
    const payload: BackendFavoriteSetRequest = { isFavorite };
    const result = await apiRequest<BackendFavoriteState>(
      `/listings/${encodeURIComponent(listingId)}/favorite`,
      { method: "PUT", body: JSON.stringify(payload) },
      marketCode,
    );
    return result.isFavorite;
  }
}

export const favoritesService: FavoritesService = new HttpFavoritesService();
