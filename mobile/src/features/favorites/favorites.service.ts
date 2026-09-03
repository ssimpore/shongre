import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface FavoritesService {
  list(userId: string, marketCode: string): Promise<string[]>;
  toggle(
    userId: string,
    marketCode: string,
    listingId: string,
  ): Promise<boolean>;
}

export class DemoFavoritesService implements FavoritesService {
  private readonly byAccountAndMarket = new Map<string, Set<string>>([
    ["user_thomas::FR", new Set(["list_1"])],
  ]);

  async list(userId: string, marketCode: string): Promise<string[]> {
    return [
      ...(this.byAccountAndMarket.get(this.key(userId, marketCode)) ||
        new Set()),
    ];
  }

  async toggle(
    userId: string,
    marketCode: string,
    listingId: string,
  ): Promise<boolean> {
    const key = this.key(userId, marketCode);
    const current = this.byAccountAndMarket.get(key) || new Set<string>();
    const isFavorite = !current.has(listingId);
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
  async list(_userId: string, marketCode: string): Promise<string[]> {
    const result = await apiRequest<{ listingIds: string[] }>(
      "/favorites",
      {},
      marketCode,
    );
    return result.listingIds;
  }

  async toggle(
    _userId: string,
    marketCode: string,
    listingId: string,
  ): Promise<boolean> {
    const result = await apiRequest<{ isFavorite: boolean }>(
      `/listings/${encodeURIComponent(listingId)}/favorite`,
      { method: "POST", body: JSON.stringify({}) },
      marketCode,
    );
    return result.isFavorite;
  }
}

export const favoritesService: FavoritesService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoFavoritesService()
    : new HttpFavoritesService();
