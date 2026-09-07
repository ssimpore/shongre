import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { businessRulesService } from "../business-rules.service.js";
import {
  requireApiMarketContext,
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerBusinessRulesRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/business-rules/catalog",
    PUBLIC,
    async ({ marketCode }) =>
      businessRulesService.getCatalogForContext(
        requireApiMarketContext(requireOpenApiRequestMarket(marketCode)),
      ),
  );
  routes.addRoute(
    "POST",
    "/business-rules/eligibility",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Le marché de la requête ne correspond pas au contexte actif.",
        });
      return businessRulesService.getAccountEligibilityForContext(
        principal.userId,
        body,
        requireApiMarketContext(activeMarket),
      );
    },
  );
}
