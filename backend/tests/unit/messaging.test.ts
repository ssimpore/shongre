import { describe, expect, it } from "vitest";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoMessagingRepository } from "../../src/infrastructure/database/repositories/messaging.repository.js";
import { MessagingService } from "../../src/modules/messaging/messaging.service.js";

describe("MessagingService", () => {
  it("creates one idempotent conversation from an available listing", async () => {
    const repository = new DemoMessagingRepository([]);
    const service = new MessagingService(
      repository,
      new DemoListingRepository(),
    );

    const first = await service.createConversationForListing({
      listingId: "list_1",
      buyerId: "user_thomas",
      initialMessage: "Bonjour, le vélo est-il disponible ?",
    });
    const second = await service.createConversationForListing({
      listingId: "list_1",
      buyerId: "user_thomas",
    });

    expect(second.id).toBe(first.id);
    const page = await service.getMessages(first.id, "user_thomas");
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.text).toContain("disponible");
  });

  it("does not allow a seller to contact their own listing", async () => {
    const service = new MessagingService(
      new DemoMessagingRepository([]),
      new DemoListingRepository(),
    );
    await expect(
      service.createConversationForListing({
        listingId: "list_1",
        buyerId: "user_camille",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("enforces participant access inside the service boundary", async () => {
    const service = new MessagingService(
      new DemoMessagingRepository(),
      new DemoListingRepository(),
    );
    await expect(
      service.sendMessage({
        conversationId: "conv_1",
        senderId: "unrelated-user",
        text: "Intrusion",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.getMessages("conv_1", "unrelated-user"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("paginates messages with an opaque cursor without duplicates", async () => {
    const repository = new DemoMessagingRepository();
    const service = new MessagingService(
      repository,
      new DemoListingRepository(),
    );
    for (const text of ["Deux", "Trois", "Quatre"]) {
      await service.sendMessage({
        conversationId: "conv_1",
        senderId: "user_thomas",
        text,
      });
    }

    const latest = await service.getMessages("conv_1", "user_thomas", {
      limit: 2,
    });
    expect(latest.items).toHaveLength(2);
    expect(latest.pageInfo.hasNextPage).toBe(true);
    const older = await service.getMessages("conv_1", "user_thomas", {
      limit: 2,
      cursor: latest.pageInfo.nextCursor,
    });
    expect(older.items).toHaveLength(2);
    expect(
      older.items.some((message) =>
        latest.items.some((latestMessage) => latestMessage.id === message.id),
      ),
    ).toBe(false);
  });

  it("rejects empty, oversized, and unsafe attachment messages", async () => {
    const service = new MessagingService(
      new DemoMessagingRepository(),
      new DemoListingRepository(),
    );
    await expect(
      service.sendMessage({
        conversationId: "conv_1",
        senderId: "user_thomas",
        text: "   ",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.sendMessage({
        conversationId: "conv_1",
        senderId: "user_thomas",
        text: "image",
        attachments: ["data:image/png;base64,unsafe"],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
