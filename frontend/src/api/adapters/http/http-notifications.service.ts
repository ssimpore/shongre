import { NotificationsServiceContract } from "../../contracts/notifications.contract";
import { apiOperation } from "./generated-api-operation";
import type {
  Notification,
  NotificationCategory,
  NotificationPreferences,
  NotificationType,
} from "../../../domains/notifications/notification.types";

interface BackendNotification {
  id: string;
  userId: string;
  type: string;
  category?: string;
  title: string;
  body: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const mapCategory = (value: string | undefined): NotificationCategory => {
  if (value === "messages" || value === "transactions" || value === "listings")
    return value;
  if (value === "delivery" || value === "reviews" || value === "security")
    return value;
  if (value === "promotions") return "monetization";
  return "account";
};

const mapType = (value: string): NotificationType => {
  if (value.includes("message") || value.includes("offer"))
    return "message.received";
  if (value.includes("payment") || value.includes("escrow"))
    return "payment.secured";
  if (value.includes("delivery") || value.includes("shipping"))
    return "fulfillment.shipped";
  if (value.includes("listing")) return "listing.published";
  if (value.includes("review")) return "review.received";
  if (value.includes("promotion")) return "promotion.started";
  return "security.new_login";
};

const mapNotification = (item: BackendNotification): Notification => ({
  id: item.id,
  type: mapType(item.type),
  category: mapCategory(item.category),
  recipientId: item.userId,
  title: item.title,
  body: item.body,
  createdAt: item.createdAt,
  readAt: item.isRead ? item.createdAt : null,
  priority: item.category === "security" ? "high" : "normal",
  actions: item.linkUrl
    ? [{ id: `open-${item.id}`, label: "Voir", destination: item.linkUrl }]
    : undefined,
  status: item.isRead ? "read" : "unread",
  isRead: item.isRead,
});

export class HttpNotificationsService implements NotificationsServiceContract {
  async getUserNotifications(): Promise<Notification[]> {
    const items = await apiOperation<BackendNotification[], "getNotifications">(
      "getNotifications",
      {},
    );
    return items.map(mapNotification);
  }

  async getUnreadCount(): Promise<number> {
    const res = await apiOperation<
      { count: number },
      "getNotificationsUnreadCount"
    >("getNotificationsUnreadCount", {});
    return res.count;
  }

  async markAsRead(notificationId: string): Promise<void> {
    return apiOperation<void, "postNotificationsByIdRead">(
      "postNotificationsByIdRead",
      { path: { id: notificationId } },
    );
  }

  async markAllAsRead(): Promise<void> {
    return apiOperation<void, "postNotificationsReadAll">(
      "postNotificationsReadAll",
      {},
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return apiOperation<void, "deleteNotificationsById">(
      "deleteNotificationsById",
      { path: { id: notificationId } },
    );
  }

  async getPreferences(): Promise<NotificationPreferences> {
    return apiOperation<NotificationPreferences, "getNotificationPreferences">(
      "getNotificationPreferences",
      {},
    );
  }

  async updatePreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    return apiOperation<NotificationPreferences, "putNotificationPreferences">(
      "putNotificationPreferences",
      { body: preferences },
    );
  }

  async getWebPushConfig(): Promise<{ enabled: boolean; publicKey?: string }> {
    return apiOperation<
      { enabled: boolean; publicKey?: string },
      "getNotificationsWebPushConfig"
    >("getNotificationsWebPushConfig", {});
  }

  async registerWebPushDevice(subscription: string): Promise<void> {
    await apiOperation<{ success: boolean }, "postNotificationsDevices">(
      "postNotificationsDevices",
      { body: { token: subscription, platform: "web" } },
    );
  }

  async unregisterWebPushDevice(subscription: string): Promise<void> {
    await apiOperation<
      { success: boolean },
      "postNotificationsDevicesUnregister"
    >("postNotificationsDevicesUnregister", { body: { token: subscription } });
  }
}

export const httpNotificationsService = new HttpNotificationsService();
