import { NotificationsServiceContract } from "../../contracts/notifications.contract";
import { notificationRepository } from "../../../repositories/notification.repository";
import type {
  Notification,
  NotificationPreferences,
} from "../../../domains/notifications/notification.types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { requireDemoCapability } from "./demo-authorization";

export class DemoNotificationsService implements NotificationsServiceContract {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const result = await notificationRepository.getNotifications({
      recipientId: userId,
    });
    return result.notifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    return notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    await notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    await notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    await notificationRepository.deleteNotification(notificationId);
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    return notificationRepository.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    return notificationRepository.updatePreferences(userId, preferences);
  }

  async simulateNotification(notification: Notification): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    await notificationRepository.createNotification(notification);
  }
}

export const demoNotificationsService = new DemoNotificationsService();
