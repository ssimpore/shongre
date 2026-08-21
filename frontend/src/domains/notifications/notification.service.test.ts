import { describe, it, expect } from "vitest";
import { notificationService } from "./notification.service";
import { Notification } from "./notification.types";

describe("NotificationService", () => {
  const createMockNotif = (
    id: string,
    category: any,
    isRead: boolean,
    createdAt: string,
  ): Notification => ({
    id,
    type: "message.received",
    category,
    recipientId: "user_1",
    title: `Notif ${id}`,
    body: "Test body",
    priority: "normal",
    status: isRead ? "read" : "unread",
    isRead,
    createdAt,
  });

  it("groups notifications by relative date label", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const notifs = [
      createMockNotif("1", "messages", false, today),
      createMockNotif("2", "transactions", true, yesterday),
    ];

    const groups = notificationService.groupNotificationsByDate(notifs);
    expect(groups.length).toBe(2);
    expect(groups[0].dateLabel).toBe("Aujourd'hui");
    expect(groups[1].dateLabel).toBe("Hier");
  });

  it("filters notifications by tab correctly", () => {
    const today = new Date().toISOString();
    const notifs = [
      createMockNotif("1", "messages", false, today),
      createMockNotif("2", "transactions", true, today),
      createMockNotif("3", "listings", false, today),
    ];

    // Filter unread
    const unread = notificationService.filterNotifications(notifs, "unread");
    expect(unread.length).toBe(2);
    expect(unread.map((n) => n.id)).toEqual(["1", "3"]);

    // Filter messages
    const messages = notificationService.filterNotifications(
      notifs,
      "messages",
    );
    expect(messages.length).toBe(1);
    expect(messages[0].id).toBe("1");

    // Filter transactions
    const txs = notificationService.filterNotifications(notifs, "transactions");
    expect(txs.length).toBe(1);
    expect(txs[0].id).toBe("2");
  });

  it("calculates unread count accurately", () => {
    const today = new Date().toISOString();
    const notifs = [
      createMockNotif("1", "messages", false, today),
      createMockNotif("2", "transactions", false, today),
      createMockNotif("3", "listings", true, today),
    ];

    expect(notificationService.calculateUnreadCount(notifs)).toBe(2);
  });

  it("provides comprehensive default preferences with mandatory flags", () => {
    const prefs = notificationService.getDefaultPreferences("user_test");
    expect(prefs.userId).toBe("user_test");
    expect(prefs.transactions.isMandatory).toBe(true);
    expect(prefs.security.isMandatory).toBe(true);
    expect(prefs.marketing.inApp).toBe(false);
  });
});
