import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import { solutionsService } from "../solutions.service.js";
import { requireApiMarketContext } from "../../markets/request-market-context.js";

export function registerSolutionsRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/solutions", PUBLIC, async ({ marketCode, query }) =>
    solutionsService.listPublicSolutions(
      requireApiMarketContext(marketCode),
      query.get("locale") || undefined,
    ),
  );
  routes.addRoute(
    "GET",
    "/solutions/:solutionSlug",
    PUBLIC,
    async ({ marketCode, params, query }) =>
      solutionsService.getPublicSolutionBySlug(
        requireApiMarketContext(marketCode),
        params.solutionSlug,
        query.get("locale") || undefined,
      ),
  );
}
