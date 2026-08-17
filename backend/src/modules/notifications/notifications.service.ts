import { NotificationItem } from '../../shared/types/index.js';
import { realtimeBroadcaster } from '../../infrastructure/realtime/realtime-broadcaster.js';

export class NotificationsService {
  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return [
      {
        id: 'notif_1',
        userId,
        type: 'escrow',
        title: 'Séquestre sécurisé',
        body: 'Le paiement de 250 € pour votre annonce a été sécurisé par Shongre Escrow.',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getUnreadCount(userId: string): Promise<number> {
    return 1;
  }

  async markAsRead(notificationId: string): Promise<void> {}

  async markAllAsRead(userId: string): Promise<void> {}

  async deleteNotification(notificationId: string): Promise<void> {}

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

    await realtimeBroadcaster.broadcastEvent(`user:${userId}:notifications`, 'notification_received', notif);
    return notif;
  }
}

export const notificationsService = new NotificationsService();
