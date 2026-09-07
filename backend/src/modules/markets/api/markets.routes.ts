import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { marketsService } from "../markets.service.js";
import { marketDetectionService } from "../market-detection.service.js";

export function registerMarketsRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/markets", PUBLIC, async () =>
    marketsService.getAllMarkets(),
  );
  routes.addRoute("GET", "/markets/detection", PUBLIC, async ({ req }) =>
    marketDetectionService.detectFromHeaders(req.headers),
  );
  routes.addRoute(
    "POST",
    "/markets/detection/coordinates",
    PUBLIC,
    async ({ body }) => marketDetectionService.detectFromCoordinates(body),
  );
  routes.addRoute("GET", "/markets/active", PUBLIC, async () =>
    marketsService.getActiveMarket(),
  );
  routes.addRoute(
    "POST",
    "/markets/active",
    permission("market.manage"),
    async ({ body }) => marketsService.setActiveMarket(body?.code),
  );
  routes.addRoute("GET", "/markets/:code", PUBLIC, async ({ params }) =>
    marketsService.getMarketByCode(params.code),
  );
  routes.addRoute(
    "GET",
    "/markets/effective/:code",
    PUBLIC,
    async ({ params }) => marketsService.getEffectiveMarketConfig(params.code),
  );
}
