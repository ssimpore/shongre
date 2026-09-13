import type {
  Notification,
  NotificationPreferences,
} from "../../domains/notifications/notification.types";

export interface NotificationsServiceContract {
  getUserNotifications(): Promise<Notification[]>;
  getUnreadCount(): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences>;
}
