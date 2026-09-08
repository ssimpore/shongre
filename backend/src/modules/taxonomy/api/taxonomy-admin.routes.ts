import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { requireRecentAuthentication } from "../../../shared/auth/principal.js";
import { taxonomyGovernanceService as governance } from "../taxonomy.governance.js";

export function registerTaxonomyAdminRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/admin/taxonomy/draft",
    permission("taxonomy.manage"),
    async ({ query }) => governance.page(query),
  );
  routes.addRoute(
    "GET",
    "/admin/taxonomy/preview",
    permission("taxonomy.manage"),
    async () => governance.preview(),
  );
  routes.addRoute(
    "GET",
    "/admin/taxonomy/history",
    permission("taxonomy.manage"),
    async () => governance.history(),
  );
  routes.addRoute(
    "PUT",
    "/admin/taxonomy/draft",
    permission("taxonomy.manage"),
    async ({ body, principal, requestId }) => {
      requireRecentAuthentication(principal);
      return governance.update(body, { actorId: principal.userId, requestId });
    },
  );
  routes.addRoute(
    "POST",
    "/admin/taxonomy/publish",
    permission("taxonomy.manage"),
    async ({ body, principal, requestId }) => {
      requireRecentAuthentication(principal);
      return governance.publish(body, { actorId: principal.userId, requestId });
    },
  );
  routes.addRoute(
    "POST",
    "/admin/taxonomy/rollback",
    permission("taxonomy.manage"),
    async ({ body, principal, requestId }) => {
      requireRecentAuthentication(principal);
      return governance.rollback(body, {
        actorId: principal.userId,
        requestId,
      });
    },
  );
}
