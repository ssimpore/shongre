import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { adminService } from "../../admin/admin.service.js";
import { moderationService } from "../moderation.service.js";

export function registerModerationRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/reports",
    permission("report.create"),
    async ({ principal, body }) =>
      adminService.submitReport({ ...body, reporterId: principal.userId }),
  );
  routes.addRoute(
    "POST",
    "/moderation/cases/:caseId/appeals",
    permission("report.create"),
    async ({ principal, params, body }) =>
      moderationService.submitAppeal(
        principal.userId,
        params.caseId,
        body?.reason,
      ),
  );
  routes.addRoute(
    "GET",
    "/moderation/cases/mine",
    permission("report.create"),
    async ({ principal }) => ({
      items: await moderationService.listOwnCases(principal.userId),
    }),
  );
  routes.addRoute(
    "GET",
    "/moderation/appeals/mine",
    permission("report.create"),
    async ({ principal }) => ({
      items: await moderationService.listOwnAppeals(principal.userId),
    }),
  );
}
