import { Principal, requireOwnership } from "../../../shared/auth/principal.js";
import { notificationsService } from "../notifications.service.js";
import { AppError } from "../../../shared/errors/app-error.js";

export async function assertNotificationOwnership(
  principal: Principal,
  notificationId: string,
): Promise<void> {
  const notification =
    await notificationsService.getNotificationById(notificationId);
  if (!notification) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Notification introuvable.",
    });
  }
  requireOwnership(principal, notification.userId);
}
