import type {
  Notification,
  NotificationPreferences,
} from "../../domains/notifications/notification.types";

export interface NotificationsServiceContract {
  getUserNotifications(userId: string): Promise<Notification[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences>;
  simulateNotification?(notification: Notification): Promise<void>;
}
