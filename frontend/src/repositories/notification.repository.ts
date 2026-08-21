/**
 * SHONGRE NOTIFICATION REPOSITORY
 * Data-access contract & demo implementation for notifications and user preferences.
 */

import {
  Notification,
  NotificationPreferences,
  NotificationQuery,
  NotificationPageResult,
} from "../domains/notifications/notification.types";
import { notificationService } from "../domains/notifications/notification.service";
import { storageService } from "../services/storage.service";
import { notificationRealtimeClient } from "../domains/notifications/notification.realtime";

export interface INotificationRepository {
  getNotifications(query?: NotificationQuery): Promise<NotificationPageResult>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences>;
  createNotification(notification: Notification): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;
}

export class MockNotificationRepository implements INotificationRepository {
  async getNotifications(
    query?: NotificationQuery,
  ): Promise<NotificationPageResult> {
    const rawList = storageService.getNotifications();
    const recipientId = query?.recipientId;

    // Filter by recipient if provided
    let list = recipientId
      ? rawList.filter(
          (n: any) =>
            !n.recipientId ||
            n.recipientId === recipientId ||
            n.userId === recipientId,
        )
      : rawList;

    // Normalization to canonical Notification
    let normalized: Notification[] = list.map((item: any) => ({
      id: item.id,
      type: item.type || "system",
      category: item.category || "system",
      recipientId:
        item.recipientId || item.userId || recipientId || "user-thomas",
      title: item.title,
      body: item.body || item.message || "",
      createdAt: item.createdAt || new Date().toISOString(),
      readAt: item.readAt || (item.isRead ? item.createdAt : null),
      priority: item.priority || "normal",
      context: item.context,
      actions:
        item.actions ||
        (item.linkUrl || item.link
          ? [
              {
                id: "act-1",
                label: "Voir",
                destination: item.linkUrl || item.link,
              },
            ]
          : undefined),
      status: item.isRead ? "read" : "unread",
      isRead: !!item.isRead,
    }));

    // Status filter
    if (query?.status === "unread") {
      normalized = normalized.filter((n) => !n.isRead);
    } else if (query?.status === "read") {
      normalized = normalized.filter((n) => n.isRead);
    }

    // Category filter
    if (query?.category) {
      normalized = normalized.filter((n) => n.category === query.category);
    }

    // Sort most recent first
    normalized.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = normalized.length;
    const unreadCount = normalized.filter((n) => !n.isRead).length;

    const offset = query?.offset || 0;
    const limit = query?.limit || 50;
    const paged = normalized.slice(offset, offset + limit);

    return {
      notifications: paged,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await this.getNotifications({
      recipientId: userId,
      status: "unread",
    });
    return res.unreadCount;
  }

  async markAsRead(id: string): Promise<void> {
    storageService.markNotificationRead(id);
    const rawList = storageService.getNotifications();
    const found = rawList.find((n: any) => n.id === id);
    if (found) {
      notificationRealtimeClient.broadcast({
        type: "notification.read",
        recipientId: (found as any).recipientId || found.userId || "",
        payload: { id },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    storageService.markAllNotificationsRead();
    notificationRealtimeClient.broadcast({
      type: "notification.all_read",
      recipientId: userId,
      payload: {},
      timestamp: new Date().toISOString(),
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const saved =
      storageService.getNotificationPreferences<NotificationPreferences>(
        userId,
      );
    if (saved) return saved;
    return notificationService.getDefaultPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...preferences,
      userId,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveNotificationPreferences(userId, updated);
    return updated;
  }

  async createNotification(notification: Notification): Promise<Notification> {
    const currentList = storageService.getNotifications();
    currentList.unshift({
      id: notification.id,
      userId: notification.recipientId,
      recipientId: notification.recipientId,
      title: notification.title,
      message: notification.body,
      body: notification.body,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      linkUrl: notification.actions?.[0]?.destination || "",
      actions: notification.actions,
      context: notification.context,
      isRead: false,
      createdAt: notification.createdAt,
    } as any);

    storageService.saveNotifications(currentList);

    notificationRealtimeClient.broadcast({
      type: "notification.created",
      recipientId: notification.recipientId,
      payload: notification,
      timestamp: notification.createdAt,
    });

    return notification;
  }

  async deleteNotification(id: string): Promise<void> {
    const currentList = storageService.getNotifications();
    const updated = currentList.filter((n: any) => n.id !== id);
    storageService.saveNotifications(updated);
  }
}

export const notificationRepository: INotificationRepository =
  new MockNotificationRepository();
