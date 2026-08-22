import { describe, expect, it } from "vitest";
import { DemoBusinessRulesService } from "./demo-business-rules.service";

describe("DemoBusinessRulesService", () => {
  it("keeps quote values catalog-owned and idempotent", async () => {
    const service = new DemoBusinessRulesService();
    const request = {
      productIds: ["premium.urgent"],
      marketCode: "FR" as const,
      idempotencyKey: "frontend-quote-urgent-01",
    };
    const first = await service.createQuote(request);
    const second = await service.createQuote(request);
    expect(second).toEqual(first);
    expect(first.totalMinor).toBe(
      first.subtotalMinor - first.discountMinor + first.taxMinor,
    );
    expect(first.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("explains the specific Auto quota in a deterministic simulation", async () => {
    const service = new DemoBusinessRulesService();
    const result = await service.evaluate({
      marketCode: "FR",
      currency: "EUR",
      userType: "individual",
      categoryId: "vehicles",
      publicationChannel: "web",
      usageLevel: 1,
      featureFlags: [],
    });
    expect(result.quotaLimit).toBe(1);
    expect(result.eligible).toBe(false);
    expect(result.explanation.some((entry) => entry.matched)).toBe(true);
  });

  it("materializes purchased entitlements from the quoted catalog snapshot", async () => {
    const service = new DemoBusinessRulesService();
    const quote = await service.createQuote({
      productIds: ["premium.search_bump"],
      marketCode: "FR",
      idempotencyKey: "frontend-entitlement-quote-02",
    });
    await service.createCheckout(quote.id, "frontend-entitlement-checkout-02");
    expect(await service.getActiveEntitlements()).toContainEqual(
      expect.objectContaining({
        productId: "premium.search_bump",
        key: "searchBumpCredits",
        status: "active",
      }),
    );
  });
});
