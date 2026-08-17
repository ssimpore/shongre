import { NotificationItem } from '../../types';

export interface NotificationsServiceContract {
  getUserNotifications(userId: string): Promise<NotificationItem[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
}
