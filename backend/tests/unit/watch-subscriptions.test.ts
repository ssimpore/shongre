import { describe, expect, it } from "vitest";
import {
  DemoListingRepository,
  DemoUserRepository,
  DemoWatchSubscriptionRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import { WatchSubscriptionsService } from "../../src/modules/watch-subscriptions/watch-subscriptions.service.js";

const createService = () =>
  new WatchSubscriptionsService(
    new DemoWatchSubscriptionRepository(),
    new DemoListingRepository(),
    new DemoUserRepository(),
  );

describe("watch subscriptions", () => {
  it("creates one idempotent listing-price watch with authoritative price evidence", async () => {
    const service = createService();
    const input = {
      marketCode: "BE",
      targetType: "listing_price" as const,
      targetId: "list_1",
      title: "Vélo gravel",
      frequency: "immediate" as const,
      channels: { inApp: true, email: false, push: false },
    };

    const first = await service.createOrReplace("user_thomas", "BE", input);
    const second = await service.createOrReplace("user_thomas", "BE", input);

    expect(second.id).toBe(first.id);
    expect(second.baselinePrice).toEqual({
      amountMinor: 26_500,
      currency: "EUR",
    });
    await expect(service.list("user_thomas", "BE")).resolves.toMatchObject({
      items: [{ id: first.id, marketCode: "BE" }],
    });
  });

  it("isolates subscriptions by account and market", async () => {
    const service = createService();
    const created = await service.createOrReplace("user_thomas", "CH", {
      marketCode: "CH",
      targetType: "saved_search",
      targetId: "geneve-photo",
      title: "Photo à Genève",
      frequency: "weekly",
      channels: { inApp: true, email: false, push: false },
      searchFilter: { query: "photo", city: "Genève" },
    });

    await expect(service.list("user_camille", "CH")).resolves.toEqual({
      items: [],
    });
    await expect(service.list("user_thomas", "FR")).resolves.not.toMatchObject({
      items: [{ id: created.id }],
    });
    await expect(
      service.remove(created.id, "user_camille", "CH"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fails closed for a body/route mismatch and a coming-soon market", async () => {
    const service = createService();
    const input = {
      marketCode: "FR",
      targetType: "saved_search" as const,
      targetId: "bike",
      title: "Vélos",
      frequency: "daily" as const,
      channels: { inApp: true, email: false, push: false },
      searchFilter: { query: "vélo" },
    };

    await expect(
      service.createOrReplace("user_thomas", "BE", input),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.createOrReplace("user_thomas", "SN", {
        ...input,
        marketCode: "SN",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.list("user_thomas", "BF")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
