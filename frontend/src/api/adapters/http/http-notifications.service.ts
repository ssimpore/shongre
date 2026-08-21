import { NotificationsServiceContract } from "../../contracts/notifications.contract";
import { httpClient } from "./http-client";
import { NotificationItem } from "../../../types";

export class HttpNotificationsService implements NotificationsServiceContract {
  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return httpClient.get<NotificationItem[]>(`/notifications/${userId}`);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await httpClient.get<{ count: number }>(
      `/notifications/unread-count/${userId}`,
    );
    return res.count;
  }

  async markAsRead(notificationId: string): Promise<void> {
    return httpClient.post<void>(`/notifications/${notificationId}/read`);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return httpClient.post<void>(`/notifications/${userId}/read-all`);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return httpClient.delete<void>(`/notifications/${notificationId}`);
  }
}

export const httpNotificationsService = new HttpNotificationsService();
