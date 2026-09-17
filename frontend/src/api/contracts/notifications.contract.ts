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
  /** Whether this deployment can push to browsers, and the key to subscribe with. */
  getWebPushConfig(): Promise<{ enabled: boolean; publicKey?: string }>;
  /** Registers this browser's serialized Web Push subscription as a device. */
  registerWebPushDevice(subscription: string): Promise<void>;
  unregisterWebPushDevice(subscription: string): Promise<void>;
}
