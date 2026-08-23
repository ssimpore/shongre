import { beforeEach, describe, expect, it } from "vitest";
import { storageService } from "../../../services/storage.service";
import { DemoBusinessRulesService } from "./demo-business-rules.service";

describe("DemoBusinessRulesService billing lifecycle", () => {
  beforeEach(() => {
    storageService.setCurrentUserKey("pro_atelier");
  });

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

  it("keeps billing state scoped to the active account and supports plan changes", async () => {
    const service = new DemoBusinessRulesService();
    const catalog = await service.getCatalog("FR");
    const initial = await service.getBillingOverview();
    expect(initial.currentSubscription?.productId).toBe("plan.pro.business");
    expect(
      initial.invoices.find(
        (invoice) => invoice.subscriptionId === initial.currentSubscription?.id,
      )?.total.amountMinor,
    ).toBe(9_480);

    const target = catalog.products.find(
      (product) => product.id === "plan.pro.enterprise",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;
    const request = {
      subscriptionId: initial.currentSubscription!.id,
      targetProductId: target.id,
      targetPriceId: targetPrice.id,
      idempotencyKey: "test-enterprise-upgrade-1",
    };
    const preview = await service.previewSubscriptionChange(request);
    expect(preview.effectiveAt).toBe("immediately");
    expect(preview.tax.amountMinor).toBeGreaterThan(0);

    const changed = await service.applySubscriptionChange(request);
    expect(changed.productId).toBe("plan.pro.enterprise");

    const cancellation = await service.updateSubscriptionCancellation({
      subscriptionId: changed.id,
      cancelAtPeriodEnd: true,
    });
    expect(cancellation.status).toBe("cancellation_pending");
    expect(cancellation.cancelAtPeriodEnd).toBe(true);

    const reactivated = await service.updateSubscriptionCancellation({
      subscriptionId: changed.id,
      cancelAtPeriodEnd: false,
    });
    expect(reactivated.status).toBe("active");
  });

  it("does not expose one account billing data to another account", async () => {
    const service = new DemoBusinessRulesService();
    await service.getBillingOverview();
    storageService.setCurrentUserKey("buyer_thomas");
    const buyerBilling = await service.getBillingOverview();
    expect(buyerBilling.currentSubscription).toBeUndefined();
    expect(buyerBilling.invoices).toEqual([]);
  });
});
