import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { financeService } from "../finance.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

export function registerFinanceRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/finance/account/overview",
    permission("finance.account.read.own"),
    async ({ principal, marketCode }) =>
      financeService.getAccountDashboard(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/finance/organization/overview",
    permission("finance.organization.read.own"),
    async ({ principal, marketCode }) =>
      financeService.getOrganizationDashboard(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/finance/platform/overview",
    permission("finance.platform.read"),
    async ({ query }) =>
      financeService.getPlatformDashboard({
        period: query.get("period") ?? undefined,
        marketCode: query.get("marketCode") ?? undefined,
        currency: query.get("currency") ?? undefined,
      } as any),
  );
  routes.addRoute(
    "GET",
    "/finance/platform/transactions",
    permission("finance.transactions.read"),
    async ({ query }) =>
      financeService.listTransactions({
        period: query.get("period") ?? undefined,
        marketCode: query.get("marketCode") ?? undefined,
        currency: query.get("currency") ?? undefined,
        query: query.get("query") ?? undefined,
        status: (query.get("status") ?? undefined) as any,
        needsReviewOnly: query.get("needsReviewOnly") === "true",
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      } as any),
  );
  routes.addRoute(
    "GET",
    "/finance/platform/transactions/:id",
    permission("finance.transactions.read"),
    async ({ params }) => financeService.getTransaction(params.id),
  );
  routes.addRoute(
    "GET",
    "/finance/platform/reconciliation",
    permission("finance.reconciliation.manage"),
    async () => financeService.listReconciliationCases(),
  );
  routes.addRoute(
    "GET",
    "/finance/platform/exports/transactions",
    permission("finance.exports.read"),
    async ({ query }) =>
      financeService.exportTransactions({
        period: query.get("period") ?? undefined,
        marketCode: query.get("marketCode") ?? undefined,
        currency: query.get("currency") ?? undefined,
        query: query.get("query") ?? undefined,
        status: (query.get("status") ?? undefined) as any,
        needsReviewOnly: query.get("needsReviewOnly") === "true",
      } as any),
  );
}
