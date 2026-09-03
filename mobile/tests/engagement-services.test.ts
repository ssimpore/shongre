import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/config/environment", () => ({
  mobileEnvironment: { dataMode: "demo" },
}));
import { DemoFavoritesService } from "@/features/favorites/favorites.service";
import { DemoMessagingService } from "@/features/messaging/messaging.service";
import { DemoWatchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";
import { DemoListingsService } from "@/features/listings/listings.service";

describe("mobile engagement services", () => {
  it("partitions favorites by account and market", async () => {
    const service = new DemoFavoritesService();
    await service.toggle("account-a", "FR", "listing-1");
    expect(await service.list("account-a", "FR")).toEqual(["listing-1"]);
    expect(await service.list("account-b", "FR")).toEqual([]);
    expect(await service.list("account-a", "BE")).toEqual([]);
  });

  it("enforces conversation participation and market scope", async () => {
    const service = new DemoMessagingService();
    const conversation = await service.createForListing({
      listingId: "list_2",
      marketCode: "FR",
      userId: "account-a",
    });
    expect(conversation).toMatchObject({
      sellerId: "pro_atelier",
      listingTitle: "Fauteuil lounge en chêne massif",
    });
    await expect(
      service.send({
        conversationId: conversation.id,
        senderId: "account-b",
        marketCode: "FR",
        text: "Intrusion",
      }),
    ).rejects.toThrow("introuvable");
    await expect(
      service.messages(conversation.id, "account-a", "BE"),
    ).rejects.toThrow("introuvable");
  });

  it("creates idempotent watches and preserves market isolation", async () => {
    const service = new DemoWatchSubscriptionsService();
    const input = {
      marketCode: "FR",
      targetType: "seller",
      targetId: "seller-1",
      title: "Vendeur",
      frequency: "daily",
      channels: { inApp: true, email: false, push: false },
    } as const;
    const first = await service.createOrReplace("account-a", input);
    const second = await service.createOrReplace("account-a", {
      ...input,
      frequency: "weekly",
    });
    expect(second.id).toBe(first.id);
    expect(await service.list("account-a", "FR")).toHaveLength(1);
    expect(await service.list("account-a", "CH")).toEqual([]);
  });

  it("applies search scopes without leaking another market", async () => {
    const service = new DemoListingsService();
    expect(
      (await service.list("FR", "", "auto")).every(
        (item) => item.marketCode === "FR",
      ),
    ).toBe(true);
    expect(
      (await service.list("FR", "", "auto")).some(
        (item) => item.id === "auto_fr_1",
      ),
    ).toBe(true);
    await expect(service.list("SN", "", "marketplace")).rejects.toThrow(
      "pas encore accessible",
    );
  });
});
