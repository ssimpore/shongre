import { NotificationItem } from '../../../shared/types/index.js';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface INotificationRepository {
  getUserNotifications(userId: string): Promise<NotificationItem[]>;
  findById(notificationId: string): Promise<NotificationItem | null>;
  getUnreadCount(userId: string): Promise<number>;
  save(notification: NotificationItem): Promise<NotificationItem>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  delete(notificationId: string): Promise<void>;
}

export const CANONICAL_DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    userId: 'user_camille',
    type: 'escrow',
    title: 'Séquestre sécurisé',
    body: 'Le paiement de 250 € pour votre annonce a été sécurisé par Shongre Escrow.',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

export class DemoNotificationRepository implements INotificationRepository {
  private notifications: Map<string, NotificationItem> = new Map();

  constructor(initialNotifs: NotificationItem[] = CANONICAL_DEMO_NOTIFICATIONS) {
    this.reset(initialNotifs);
  }

  reset(initialNotifs: NotificationItem[] = CANONICAL_DEMO_NOTIFICATIONS) {
    this.notifications.clear();
    initialNotifs.forEach((n) => this.notifications.set(n.id, { ...n }));
  }

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    const list = Array.from(this.notifications.values()).filter((n) => n.userId === userId);
    if (list.length === 0) {
      return [
        {
          id: `notif_${userId}`,
          userId,
          type: 'system',
          title: 'Bienvenue sur Shongre',
          body: 'Votre espace membre est configuré et sécurisé.',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return list.map((n) => ({ ...n }));
  }

  async findById(notificationId: string): Promise<NotificationItem | null> {
    const found = this.notifications.get(notificationId);
    return found ? { ...found } : null;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getUserNotifications(userId);
    return list.filter((n) => !n.isRead).length;
  }

  async save(notification: NotificationItem): Promise<NotificationItem> {
    this.notifications.set(notification.id, { ...notification });
    return { ...notification };
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notif = this.notifications.get(notificationId);
    if (notif) notif.isRead = true;
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.notifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
  }

  async delete(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
  }
}

export class PostgresNotificationRepository implements INotificationRepository {
  private mapRowToNotification(row: any): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      linkUrl: row.link_url || undefined,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    };
  }

  async findById(notificationId: string): Promise<NotificationItem | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();
      if (error || !data) return null;
      return this.mapRowToNotification(data);
    } catch (err: any) {
      logger.error(`PostgresNotificationRepository.findById error: ${err.message}`);
      return null;
    }
  }

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        const demo = new DemoNotificationRepository();
        return demo.getUserNotifications(userId);
      }
      return data.map((r: any) => this.mapRowToNotification(r));
    } catch {
      const demo = new DemoNotificationRepository();
      return demo.getUserNotifications(userId);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  }

  async save(notification: NotificationItem): Promise<NotificationItem> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: notification.id.includes('-') ? notification.id : undefined,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link_url: notification.linkUrl || null,
      is_read: notification.isRead,
      created_at: notification.createdAt,
    };

    const { data, error } = await (supabase.from('notifications').insert(payload as any).select().single() as any);
    if (error || !data) {
      throw new Error(`Failed to save notification: ${error?.message}`);
    }
    return this.mapRowToNotification(data);
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      await (supabase.from('notifications' as any) as any).update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
    } catch (err: any) {
      logger.warn(`PostgresNotificationRepository.markAsRead skipped: ${err.message}`);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      await (supabase.from('notifications' as any) as any).update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', userId);
    } catch (err: any) {
      logger.warn(`PostgresNotificationRepository.markAllAsRead skipped: ${err.message}`);
    }
  }

  async delete(notificationId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      await (supabase.from('notifications' as any) as any).delete().eq('id', notificationId);
    } catch (err: any) {
      logger.warn(`PostgresNotificationRepository.delete skipped: ${err.message}`);
    }
  }
}
