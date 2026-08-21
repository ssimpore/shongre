import { describe, it, expect } from "vitest";
import {
  notificationCatalogService,
  NOTIFICATION_TEMPLATES,
} from "./notification.catalog";

describe("NotificationCatalogService", () => {
  it("creates a canonical notification from a message.received event", () => {
    const notif = notificationCatalogService.createNotificationFromEvent({
      type: "message.received",
      recipientId: "user_thomas",
      context: {
        type: "conversation",
        conversationId: "conv_123",
        senderName: "Marie Dupont",
        previewText: "Bonjour, l'article est-il disponible ?",
      },
    });

    expect(notif.type).toBe("message.received");
    expect(notif.category).toBe("messages");
    expect(notif.recipientId).toBe("user_thomas");
    expect(notif.title).toContain("Marie Dupont");
    expect(notif.body).toContain("disponible");
    expect(notif.isRead).toBe(false);
    expect(notif.status).toBe("unread");
    expect(notif.actions).toBeDefined();
    expect(notif.actions![0].destination).toContain("conv_123");
  });

  it("creates a reservation.accepted notification with correct deep-link", () => {
    const notif = notificationCatalogService.createNotificationFromEvent({
      type: "reservation.accepted",
      recipientId: "user_thomas",
      context: {
        type: "transaction",
        transactionId: "tx_456",
        listingTitle: "Vélo de course Vintage",
      },
    });

    expect(notif.category).toBe("transactions");
    expect(notif.priority).toBe("high");
    expect(notif.title).toContain("acceptée");
    expect(notif.body).toContain("Vélo de course Vintage");

    const dest = notificationCatalogService.resolveDestination(notif);
    expect(dest).toBe("/compte/achats");
  });

  it("creates a payment.failed critical notification with mandatory status", () => {
    const notif = notificationCatalogService.createNotificationFromEvent({
      type: "payment.failed",
      recipientId: "user_thomas",
    });

    expect(notif.priority).toBe("critical");
    expect(notif.title).toContain("Échec");
    expect(NOTIFICATION_TEMPLATES["payment.failed"].isMandatory).toBe(true);
  });

  it("resolves price drop favorite notification with formatted price", () => {
    const notif = notificationCatalogService.createNotificationFromEvent({
      type: "favorite.price_dropped",
      recipientId: "user_thomas",
      context: {
        type: "listing",
        listingId: "list_789",
        listingTitle: "Appareil photo reflex",
        price: 250,
      },
    });

    expect(notif.title).toContain("Baisse de prix");
    expect(notif.body).toContain("250");
    expect(notif.actions![0].destination).toBe("/annonce/list_789");
  });
});
