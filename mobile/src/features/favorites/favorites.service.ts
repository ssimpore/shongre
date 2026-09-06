import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";
import type { ListingCardView } from "@shongre/contracts";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import type { operations } from "@shongre/contracts/openapi";
import {
  mapBackendListing,
  mapDeliveryRequestListing,
} from "@/features/listings/listing.mapper";
import { listingsService } from "@/features/listings/listings.service";
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

export class DemoFavoritesService implements FavoritesService {
  private readonly byAccountAndMarket = new Map<string, Set<string>>([
    ["user_thomas::FR", new Set(["list_1"])],
  ]);

  async list(
    userId: string,
    marketCode: string,
  ): Promise<FavoriteListingCollection> {
    const genericListingIds = [
      ...(this.byAccountAndMarket.get(this.key(userId, marketCode)) ||
        new Set()),
    ];
    const deliveryRequestIds = await deliveryService.getFavoriteRequestIds(
      userId,
      marketCode,
    );
    const targetIds = new Set(genericListingIds);
    const byId = new Map(
      (await listingsService.list(marketCode))
        .filter((listing) => targetIds.has(listing.id))
        .map((listing) => [listing.id, listing] as const),
    );
    const genericListings = genericListingIds.flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [listing] : [];
    });
    const deliveryListings = (
      await Promise.all(
        deliveryRequestIds.map((requestId) =>
          deliveryService
            .getPublicRequest(requestId, marketCode)
            .then(mapDeliveryRequestListing)
            .catch(() => null),
        ),
      )
    ).filter((listing): listing is ListingCardView => listing !== null);
    const listings = [...genericListings, ...deliveryListings];
    return {
      listingIds: listings.map((listing) => listing.id),
      listings,
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
    const key = this.key(userId, marketCode);
    const current = this.byAccountAndMarket.get(key) || new Set<string>();
    if (isFavorite) current.add(listingId);
    else current.delete(listingId);
    this.byAccountAndMarket.set(key, current);
    return isFavorite;
  }

  private key(userId: string, marketCode: string): string {
    return `${userId}::${marketCode.toUpperCase()}`;
  }
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
    _userId: string,
    marketCode: string,
    listingId: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const deliveryRequestId =
      deliveryRequestIdFromDiscoveryListingId(listingId);
    if (deliveryRequestId) {
      return deliveryService.setFavoriteRequest(
        _userId,
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

export const favoritesService: FavoritesService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoFavoritesService()
    : new HttpFavoritesService();
