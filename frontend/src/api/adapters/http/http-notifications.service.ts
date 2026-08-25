import { NotificationsServiceContract } from "../../contracts/notifications.contract";
import { httpClient } from "./http-client";
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
  async getUserNotifications(_userId: string): Promise<Notification[]> {
    const items = await httpClient.get<BackendNotification[]>("/notifications");
    return items.map(mapNotification);
  }

  async getUnreadCount(_userId: string): Promise<number> {
    const res = await httpClient.get<{ count: number }>(
      "/notifications/unread-count",
    );
    return res.count;
  }

  async markAsRead(notificationId: string): Promise<void> {
    return httpClient.post<void>(`/notifications/${notificationId}/read`);
  }

  async markAllAsRead(_userId: string): Promise<void> {
    return httpClient.post<void>("/notifications/read-all");
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return httpClient.delete<void>(`/notifications/${notificationId}`);
  }

  async getPreferences(_userId: string): Promise<NotificationPreferences> {
    return httpClient.get<NotificationPreferences>(
      "/notifications/preferences",
    );
  }

  async updatePreferences(
    _userId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    return httpClient.put<NotificationPreferences>(
      "/notifications/preferences",
      preferences,
    );
  }
}

export const httpNotificationsService = new HttpNotificationsService();
