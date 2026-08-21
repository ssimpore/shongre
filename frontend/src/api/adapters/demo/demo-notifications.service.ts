import { NotificationsServiceContract } from "../../contracts/notifications.contract";
import { notificationRepository } from "../../../repositories/notification.repository";
import { NotificationItem } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoNotificationsService implements NotificationsServiceContract {
  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    await simulateNetworkDelay();
    const result = await notificationRepository.getNotifications({
      recipientId: userId,
    });
    return result.notifications as any;
  }

  async getUnreadCount(userId: string): Promise<number> {
    await simulateNetworkDelay();
    return notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await simulateNetworkDelay();
    await notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await simulateNetworkDelay();
    await notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await simulateNetworkDelay();
    await notificationRepository.deleteNotification(notificationId);
  }
}

export const demoNotificationsService = new DemoNotificationsService();
