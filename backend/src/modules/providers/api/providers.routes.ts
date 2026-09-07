import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { providerConnectionService } from "../provider-connection.service.js";

export function registerProvidersRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/provider-connections",
    permission("provider.configuration.read"),
    async ({ principal }) =>
      providerConnectionService.listForPrincipal(principal),
  );
  routes.addRoute(
    "POST",
    "/provider-connections",
    permission("provider.configuration.manage"),
    async ({ principal, body }) =>
      providerConnectionService.createForPrincipal(principal, body),
  );
  routes.addRoute(
    "PUT",
    "/provider-connections/:connectionId/credential",
    permission("provider.credentials.manage"),
    async ({ principal, params, body }) =>
      providerConnectionService.rotateCredentialForPrincipal(
        principal,
        params.connectionId,
        body,
      ),
  );
}
