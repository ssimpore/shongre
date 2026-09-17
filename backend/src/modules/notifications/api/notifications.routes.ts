import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { notificationsService } from "../notifications.service.js";
import { assertNotificationOwnership } from "./access-policy.js";

export function registerNotificationsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/notifications",
    permission("marketplace.customer.access"),
    async ({ principal }) =>
      notificationsService.getUserNotifications(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/notifications/unread-count",
    permission("marketplace.customer.access"),
    async ({ principal }) => {
      const count = await notificationsService.getUnreadCount(principal.userId);
      return { count };
    },
  );
  routes.addRoute(
    "GET",
    "/notifications/preferences",
    permission("marketplace.customer.access"),
    async ({ principal }) =>
      notificationsService.getPreferences(principal.userId),
  );
  routes.addRoute(
    "PUT",
    "/notifications/preferences",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      notificationsService.updatePreferences(principal.userId, body || {}),
  );
  routes.addRoute(
    "POST",
    "/notifications/:id/read",
    permission("marketplace.customer.access"),
    async ({ principal, params }) => {
      await assertNotificationOwnership(principal, params.id);
      await notificationsService.markAsRead(params.id);
      return { success: true };
    },
  );
  routes.addRoute(
    "POST",
    "/notifications/read-all",
    permission("marketplace.customer.access"),
    async ({ principal }) => {
      await notificationsService.markAllAsRead(principal.userId);
      return { success: true };
    },
  );
  routes.addRoute(
    "DELETE",
    "/notifications/:id",
    permission("marketplace.customer.access"),
    async ({ principal, params }) => {
      await assertNotificationOwnership(principal, params.id);
      await notificationsService.deleteNotification(params.id);
      return { success: true };
    },
  );
  routes.addRoute(
    "POST",
    "/notifications/devices",
    permission("marketplace.customer.access"),
    async ({ principal, body }) => {
      await notificationsService.registerDevice(
        principal.userId,
        body?.token,
        body?.platform,
        body?.appVersion,
      );
      return { success: true };
    },
  );
  routes.addRoute(
    "GET",
    "/notifications/web-push/config",
    permission("marketplace.customer.access"),
    async () => notificationsService.getWebPushConfig(),
  );
  routes.addRoute(
    "POST",
    "/notifications/devices/unregister",
    permission("marketplace.customer.access"),
    async ({ principal, body }) => {
      await notificationsService.unregisterDevice(
        principal.userId,
        body?.token,
      );
      return { success: true };
    },
  );
}
