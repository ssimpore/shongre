import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { usersService } from "../users.service.js";
import { resolveOwnerId } from "../../../shared/auth/principal.js";
import { userProfileUpdateSchema } from "@shongre/contracts";
import { listingsService } from "../../listings/listings.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

export function registerUsersRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/users/professionals",
    PUBLIC,
    async ({ marketCode }) =>
      usersService.listPublicProfessionals(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute("GET", "/users/:id", PUBLIC, async ({ params }) =>
    usersService.getPublicUserById(params.id),
  );
  routes.addRoute(
    "PUT",
    "/users/:id",
    permission("profile.update.own"),
    async ({ principal, params, body }) => {
      const ownerId = resolveOwnerId(principal, params.id, "user.manage");
      return usersService.updateUserProfile(
        ownerId,
        userProfileUpdateSchema.parse(body),
      );
    },
  );
  routes.addRoute(
    "POST",
    "/account/delete",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      usersService.deleteOwnAccount(
        principal.userId,
        body?.password,
        body?.reason,
      ),
  );
  routes.addRoute(
    "GET",
    "/account/export",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) =>
      usersService.exportAccountData(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/account/upgrade-to-professional",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      usersService.upgradeOwnAccount(principal.userId, body),
  );
  routes.addRoute(
    "PUT",
    "/account/away",
    permission("profile.update.own"),
    async ({ principal, body }) =>
      usersService.setAwayMode(principal.userId, body),
  );
  routes.addRoute(
    "GET",
    "/account/listings",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) =>
      listingsService.getOwnedListings(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
}
