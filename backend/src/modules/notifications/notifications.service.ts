import { NotificationItem } from '../../shared/types/index.js';
import { INotificationRepository, repositories } from '../../infrastructure/database/repositories/index.js';
import { realtimeBroadcaster } from '../../infrastructure/realtime/realtime-broadcaster.js';

export class NotificationsService {
  constructor(private notificationRepo: INotificationRepository = repositories.notifications) {}

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return this.notificationRepo.getUserNotifications(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Needed by the HTTP layer to check that a notification belongs to the
   * caller before marking it read or deleting it — those routes take only a
   * notification id, which is otherwise enough to act on anyone's inbox.
   */
  async getNotificationById(notificationId: string): Promise<NotificationItem | null> {
    return this.notificationRepo.findById(notificationId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.notificationRepo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.notificationRepo.delete(notificationId);
  }

  async dispatchNotification(userId: string, type: string, title: string, body: string, linkUrl?: string): Promise<NotificationItem> {
    const notif: NotificationItem = {
      id: `notif_${Math.random().toString(36).substring(2, 10)}`,
      userId,
      type,
      title,
      body,
      linkUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.notificationRepo.save(notif);
    await realtimeBroadcaster.broadcastEvent(`user:${userId}:notifications`, 'notification_received', saved);
    return saved;
  }
}

export const notificationsService = new NotificationsService();
