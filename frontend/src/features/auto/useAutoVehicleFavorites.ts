import { services } from "../../api/client/service-registry";
import {
  useScopedResourceFavorites,
  type ScopedFavoritesAdapter,
} from "../favorites/useScopedResourceFavorites";

const autoVehicleFavoritesAdapter: ScopedFavoritesAdapter = {
  load: (accountId, marketCode) =>
    services.auto.getFavoriteVehicleIds(accountId, marketCode),
  set: (accountId, vehicleId, marketCode, isFavorite) =>
    services.auto.setFavoriteVehicle(
      accountId,
      vehicleId,
      marketCode,
      isFavorite,
    ),
};

/** Account-and-market scoped favorite authority shared by Auto surfaces. */
export function useAutoVehicleFavorites(
  accountId: string | undefined,
  marketCode: string,
) {
  return useScopedResourceFavorites(
    accountId,
    marketCode,
    autoVehicleFavoritesAdapter,
  );
}
