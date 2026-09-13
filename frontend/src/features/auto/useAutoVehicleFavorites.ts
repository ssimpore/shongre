import { services } from "../../api/client/service-registry";
import {
  useScopedResourceFavorites,
  type ScopedFavoritesAdapter,
} from "../favorites/useScopedResourceFavorites";

const autoVehicleFavoritesAdapter: ScopedFavoritesAdapter = {
  load: (_accountId, marketCode) =>
    services.auto.getFavoriteVehicleIds(marketCode),
  set: (_accountId, vehicleId, marketCode, isFavorite) =>
    services.auto.setFavoriteVehicle(vehicleId, marketCode, isFavorite),
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
