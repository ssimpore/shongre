import { config } from "../../../app/config/index.js";
import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { complianceService } from "../compliance.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

function complianceReturnUrl(returnTo: unknown): string {
  const safePath =
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
      ? returnTo
      : "/compte/verification";
  return new URL(safePath, config.frontendUrl).toString();
}

export function registerComplianceRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/compliance/requirements",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      complianceService.evaluateForUser(principal.userId, body),
  );
  routes.addRoute(
    "GET",
    "/compliance/status",
    permission("marketplace.customer.access"),
    async ({ principal }) => {
      const subject = await complianceService.getSubject(principal.userId);
      return {
        ...subject,
        verification: Object.fromEntries(
          Object.entries(subject.verification).map(([dimension, record]) => [
            dimension,
            record
              ? {
                  dimension: record.dimension,
                  state: record.state,
                  method: record.method,
                  verifiedAt: record.verifiedAt,
                  expiresAt: record.expiresAt,
                  refreshRequiredAt: record.refreshRequiredAt,
                  reasonCode: record.reasonCode,
                  visibility: record.visibility,
                }
              : record,
          ]),
        ),
      };
    },
  );
  routes.addRoute(
    "POST",
    "/compliance/identity/session",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) =>
      complianceService.startIdentitySession({
        userId: principal.userId,
        dimension: body?.dimension || "identity",
        jurisdiction: requireApiRequestMarket(marketCode),
        returnUrl: complianceReturnUrl(body?.returnTo),
      }),
  );
  routes.addRoute(
    "POST",
    "/compliance/payment/onboarding",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) =>
      complianceService.startPaymentOnboarding({
        userId: principal.userId,
        jurisdiction: requireApiRequestMarket(marketCode),
        returnUrl: complianceReturnUrl(body?.returnTo),
        accountToken: body?.accountToken,
      }),
  );
  routes.addRoute(
    "POST",
    "/compliance/manual-review",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      complianceService.requestManualReviewForUser({
        userId: principal.userId,
        dimension: body?.dimension,
      }),
  );
}
