import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import { currenciesService } from "../currencies.service.js";

export function registerCurrenciesRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/currencies", PUBLIC, async () =>
    currenciesService.getPublicCatalog(),
  );
}
