import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { requestMetadata } from "../../../shared/auth/http-session.js";
import { analyticsService } from "../analytics.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";
import { createHash } from "node:crypto";
import { requireOwnership } from "../../../shared/auth/principal.js";

export function registerAnalyticsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/analytics/events",
    PUBLIC,
    async ({ body, principal, marketCode, requestId, req }) => {
      const requestInfo = requestMetadata(req);
      return analyticsService.ingest(body, principal, {
        marketCode: requireApiRequestMarket(marketCode),
        requestId,
        userAgent: String(req.headers["user-agent"] || ""),
        rateLimitKey: createHash("sha256")
          .update(
            `${requestInfo.ipPrefix || "unknown"}:${requestInfo.userAgentFamily}`,
          )
          .digest("hex"),
      });
    },
  );
  routes.addRoute(
    "GET",
    "/analytics/overview",
    permission("analytics.platform.read"),
    async ({ query }) =>
      analyticsService.overview(analyticsService.parseQuery(query)),
  );
  routes.addRoute(
    "GET",
    "/analytics/acquisition",
    permission("analytics.marketing.read"),
    async ({ query }) =>
      analyticsService.acquisition(analyticsService.parseQuery(query)),
  );
  routes.addRoute(
    "GET",
    "/analytics/search",
    permission("analytics.marketing.read"),
    async ({ query }) =>
      analyticsService.search(analyticsService.parseQuery(query)),
  );
  routes.addRoute(
    "GET",
    "/analytics/monetization",
    permission("analytics.finance.read"),
    async ({ query }) =>
      analyticsService.monetization(analyticsService.parseQuery(query)),
  );
  routes.addRoute(
    "GET",
    "/analytics/seo",
    permission("analytics.marketing.read"),
    async ({ query }) =>
      analyticsService.seo(analyticsService.parseQuery(query)),
  );
  routes.addRoute(
    "GET",
    "/analytics/providers",
    permission("analytics.technical.read"),
    async () => analyticsService.providerHealth(),
  );
  routes.addRoute(
    "GET",
    "/analytics/sellers/:sellerId",
    permission("store.analytics.read.own"),
    async ({ principal, params, query }) => {
      requireOwnership(principal, params.sellerId);
      return analyticsService.seller(
        params.sellerId,
        analyticsService.parseQuery(query),
      );
    },
  );
}
