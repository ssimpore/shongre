import {
  type RouteRegistrar,
  permission,
  AUTHENTICATED,
  PUBLIC,
} from "../../../api/v1/route-contract.js";
import { supportService } from "../support.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

export function registerSupportRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/support/help-articles",
    PUBLIC,
    async ({ marketCode, query }) => ({
      items: await supportService.listHelpArticles(
        requireApiRequestMarket(marketCode),
        query.get("locale") || "fr-FR",
      ),
    }),
  );
  routes.addRoute(
    "POST",
    "/support/cases",
    permission("marketplace.customer.access"),
    async ({ principal, body }) => supportService.createCase(principal, body),
  );
  routes.addRoute(
    "GET",
    "/support/cases/mine",
    permission("marketplace.customer.access"),
    async ({ principal }) => ({
      items: await supportService.listOwnCases(principal),
    }),
  );
  routes.addRoute(
    "GET",
    "/support/cases",
    permission("support.case.read"),
    async ({ principal, query }) => ({
      items: await supportService.listCases(principal, {
        assigneeId: query.get("assigneeId") || undefined,
        status: query.get("status") || undefined,
        priority: query.get("priority") || undefined,
      } as Parameters<typeof supportService.listCases>[1]),
    }),
  );
  routes.addRoute(
    "GET",
    "/support/cases/:id",
    AUTHENTICATED,
    async ({ principal, params }) =>
      supportService.getCase(principal, params.id),
  );
  routes.addRoute(
    "PATCH",
    "/support/cases/:id",
    permission("support.case.manage"),
    async ({ principal, params, body }) =>
      supportService.updateCase(principal, params.id, body),
  );
  routes.addRoute(
    "POST",
    "/support/cases/:id/notes",
    AUTHENTICATED,
    async ({ principal, params, body }) =>
      supportService.addNote(principal, params.id, body),
  );
  routes.addRoute(
    "GET",
    "/support/metrics",
    permission("support.case.read"),
    async ({ principal }) => supportService.getMetrics(principal),
  );
}
