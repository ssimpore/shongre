import { apiOperation } from "@/api/generated-api-operation";
import type { ListingCardView } from "@shongre/contracts";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
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
    const result = await apiOperation("getFavorites", {}, marketCode);
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
    const result = await apiOperation(
      "putListingsByIdFavorite",
      {
        path: { id: listingId },
        body: { isFavorite },
      },
      marketCode,
    );
    return result.isFavorite;
  }
}

export const favoritesService: FavoritesService = new HttpFavoritesService();
