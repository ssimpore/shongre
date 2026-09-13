import { services } from "../../api/client/service-registry";
import {
  useScopedResourceFavorites,
  type ScopedFavoritesAdapter,
} from "../favorites/useScopedResourceFavorites";

const deliveryRequestFavoritesAdapter: ScopedFavoritesAdapter = {
  load: (_accountId, marketCode) =>
    services.delivery.getFavoriteRequestIds(marketCode),
  set: (_accountId, requestId, marketCode, isFavorite) =>
    services.delivery.setFavoriteRequest(requestId, marketCode, isFavorite),
};

export function resolveDeliveryFavoriteAccountId(
  accountId: string | undefined,
  isReadOnlyStaff: boolean,
): string | undefined {
  return isReadOnlyStaff ? undefined : accountId;
}

export function useDeliveryRequestFavorites(
  accountId: string | undefined,
  marketCode: string,
) {
  return useScopedResourceFavorites(
    accountId,
    marketCode,
    deliveryRequestFavoritesAdapter,
  );
}
