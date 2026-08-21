/**
 * SHONGRE NOTIFICATION SERVICE
 * Pure domain utilities for notification date grouping, filtering,
 * preference defaults, and unread aggregations.
 */

import {
  Notification,
  NotificationFilterTab,
  NotificationPreferences,
} from "./notification.types";

export interface NotificationDateGroup {
  dateLabel: string;
  items: Notification[];
}

export class NotificationService {
  /**
   * Localized relative date grouping label.
   */
  getDateSeparatorLabel(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const now = new Date();

      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) return "Aujourd'hui";

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return "Hier";

      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 7) return "Cette semaine";

      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      }).format(date);
    } catch {
      return "Plus tôt";
    }
  }

  /**
   * Groups a list of notifications into date-separated sections.
   */
  groupNotificationsByDate(
    notifications: Notification[],
  ): NotificationDateGroup[] {
    const groups: NotificationDateGroup[] = [];
    const map = new Map<string, Notification[]>();

    notifications.forEach((item) => {
      const label = this.getDateSeparatorLabel(item.createdAt);
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(item);
    });

    map.forEach((items, dateLabel) => {
      groups.push({
        dateLabel,
        items,
      });
    });

    return groups;
  }

  /**
   * Filters notifications by filter tab.
   */
  filterNotifications(
    notifications: Notification[],
    filter: NotificationFilterTab,
  ): Notification[] {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.isRead);
      case "messages":
        return notifications.filter((n) => n.category === "messages");
      case "transactions":
        return notifications.filter(
          (n) => n.category === "transactions" || n.category === "delivery",
        );
      case "listings":
        return notifications.filter((n) => n.category === "listings");
      case "account":
        return notifications.filter(
          (n) =>
            n.category === "account" ||
            n.category === "security" ||
            n.category === "monetization",
        );
      case "all":
      default:
        return notifications;
    }
  }

  /**
   * Returns authoritative unread count.
   */
  calculateUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.isRead).length;
  }

  /**
   * Default notification preferences for a user.
   */
  getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      messages: { inApp: true, email: true, push: true },
      transactions: { inApp: true, email: true, push: true, isMandatory: true },
      listings: { inApp: true, email: true, push: false },
      delivery: { inApp: true, email: true, push: true, isMandatory: true },
      reviews: { inApp: true, email: false, push: true },
      promotions: { inApp: true, email: false, push: false },
      security: { inApp: true, email: true, push: true, isMandatory: true },
      marketing: { inApp: false, email: false, push: false },
      updatedAt: new Date().toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
