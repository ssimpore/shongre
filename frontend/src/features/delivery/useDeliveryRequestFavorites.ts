import { services } from "../../api/client/service-registry";
import {
  useScopedResourceFavorites,
  type ScopedFavoritesAdapter,
} from "../favorites/useScopedResourceFavorites";

const deliveryRequestFavoritesAdapter: ScopedFavoritesAdapter = {
  load: (accountId, marketCode) =>
    services.delivery.getFavoriteRequestIds(accountId, marketCode),
  set: (accountId, requestId, marketCode, isFavorite) =>
    services.delivery.setFavoriteRequest(
      accountId,
      requestId,
      marketCode,
      isFavorite,
    ),
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
