import { describe, it, expect } from "vitest";
import { messagingService } from "./messaging.service";
import {
  ConversationPreview,
  UserTimelineMessage,
  SystemTimelineEvent,
} from "./messaging.types";

describe("MessagingService", () => {
  it("correctly labels today, yesterday and past dates", () => {
    const today = new Date().toISOString();
    expect(messagingService.getDateSeparatorLabel(today)).toBe("Aujourd'hui");

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(messagingService.getDateSeparatorLabel(yesterday)).toBe("Hier");
  });

  it("groups timeline items by date label", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const items: Array<UserTimelineMessage | SystemTimelineEvent> = [
      {
        itemType: "message",
        id: "1",
        conversationId: "c1",
        senderId: "u1",
        senderName: "Alice",
        content: "Hello yesterday",
        contentType: "text",
        status: "read",
        isRead: true,
        createdAt: yesterday,
      },
      {
        itemType: "message",
        id: "2",
        conversationId: "c1",
        senderId: "u2",
        senderName: "Bob",
        content: "Hello today",
        contentType: "text",
        status: "read",
        isRead: true,
        createdAt: today,
      },
    ];

    const groups = messagingService.groupTimelineByDate(items);
    expect(groups.length).toBe(2);
    expect(groups[0].dateLabel).toBe("Hier");
    expect(groups[1].dateLabel).toBe("Aujourd'hui");
  });

  it("calculates total unread messages across conversations", () => {
    const convs = [{ unreadCount: 3 }, { unreadCount: 0 }, { unreadCount: 5 }];
    expect(messagingService.calculateTotalUnread(convs)).toBe(8);
  });

  it("filters conversations by search query and unread status", () => {
    const convs: ConversationPreview[] = [
      {
        id: "c1",
        type: "listing",
        counterpart: { id: "u2", name: "Thomas Laurent" },
        context: {
          type: "listing",
          listingId: "l1",
          listingTitle: "Vélo Gravel Canyon",
          listingPrice: 850,
          listingStatus: "active",
          sellerId: "u2",
          sellerName: "Thomas",
        },
        lastMessageText: "Toujours dispo ?",
        lastMessageAt: "2026-08-16T12:00:00Z",
        unreadCount: 2,
        status: "active",
        createdAt: "2026-08-16T10:00:00Z",
        updatedAt: "2026-08-16T12:00:00Z",
      },
      {
        id: "c2",
        type: "listing",
        counterpart: { id: "u3", name: "Camille Martin" },
        context: {
          type: "listing",
          listingId: "l2",
          listingTitle: "Canapé scandinave",
          listingPrice: 320,
          listingStatus: "active",
          sellerId: "u3",
          sellerName: "Camille",
        },
        lastMessageText: "Merci pour votre achat",
        lastMessageAt: "2026-08-15T12:00:00Z",
        unreadCount: 0,
        status: "active",
        createdAt: "2026-08-15T10:00:00Z",
        updatedAt: "2026-08-15T12:00:00Z",
      },
    ];

    // Filter unread
    const unreadOnly = messagingService.filterConversations(
      convs,
      "unread",
      "",
      "u1",
    );
    expect(unreadOnly.length).toBe(1);
    expect(unreadOnly[0].id).toBe("c1");

    // Search by title
    const searchedByTitle = messagingService.filterConversations(
      convs,
      "all",
      "canapé",
      "u1",
    );
    expect(searchedByTitle.length).toBe(1);
    expect(searchedByTitle[0].id).toBe("c2");

    // Search by counterpart name
    const searchedByName = messagingService.filterConversations(
      convs,
      "all",
      "thomas",
      "u1",
    );
    expect(searchedByName.length).toBe(1);
    expect(searchedByName[0].id).toBe("c1");
  });
});
