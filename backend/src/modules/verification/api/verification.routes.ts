import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { verificationService } from "../verification.service.js";
import { resolveOwnerId } from "../../../shared/auth/principal.js";

export function registerVerificationRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/verification/status/:userId",
    permission("marketplace.customer.access"),
    async ({ principal, params }) =>
      verificationService.getUserVerificationStatus(
        resolveOwnerId(principal, params.userId),
      ),
  );
  routes.addRoute(
    "GET",
    "/verification/siret-lookup/:siret",
    permission("marketplace.customer.access"),
    async ({ params }) =>
      verificationService.lookupCompanyBySiret(params.siret),
  );
  routes.addRoute(
    "POST",
    "/verification/business-registration",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      verificationService.submitBusinessRegistration(
        principal.userId,
        body?.siret,
      ),
  );
}
