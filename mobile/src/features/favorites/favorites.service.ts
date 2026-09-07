import { apiRequest } from "@/api/http-client";
import type { ListingCardView } from "@shongre/contracts";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import {
  getFavorites,
  putListingsByIdFavorite,
} from "@shongre/contracts/api-client";
import { mapBackendListing } from "@/features/listings/listing.mapper";
import { deliveryService } from "@/features/delivery/delivery.service";

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
    const result = await getFavorites(
      (path, init) => apiRequest(path, init, marketCode),
      {},
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
    const result = await putListingsByIdFavorite(
      (path, init) => apiRequest(path, init, marketCode),
      {
        path: { id: listingId },
        body: { isFavorite },
      },
    );
    return result.isFavorite;
  }
}

export const favoritesService: FavoritesService = new HttpFavoritesService();
