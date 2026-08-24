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

  it("quotes the Founding Pros free phase before its fixed discount periods", async () => {
    storageService.setCurrentUserKey("pro_auto_michel");
    const service = new DemoBusinessRulesService();
    const quote = await service.createQuote({
      productIds: ["auto.dealer.growth"],
      marketCode: "FR",
      categoryId: "vehicles",
      promotionCode: "AUTO2026",
      idempotencyKey: "frontend-founding-pros-quote-01",
    });

    expect(quote).toMatchObject({
      amountDueTodayMinor: 0,
      promotion: { freePeriodDays: 90, durationBillingPeriods: 3 },
      trial: { productId: "auto.dealer.growth", durationDays: 90 },
    });
    expect(quote.discountMinor).toBe(quote.subtotalMinor / 2);
    expect(quote.nextChargeMinor).toBe(quote.totalMinor);
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
    ).toBe(2_388);

    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;
    const request = {
      subscriptionId: initial.currentSubscription!.id,
      targetProductId: target.id,
      targetPriceId: targetPrice.id,
      idempotencyKey: "test-auto-business-upgrade-1",
    };
    const preview = await service.previewSubscriptionChange(request);
    expect(preview.effectiveAt).toBe("immediately");
    expect(preview.tax.amountMinor).toBeGreaterThan(0);

    const changed = await service.applySubscriptionChange(request);
    expect(changed.productId).toBe("auto.dealer.growth");
    const changedBilling = await service.getBillingOverview();
    expect(
      changedBilling.effectiveEntitlements.find(
        (entitlement) =>
          entitlement.key === "maxActiveVehicles" &&
          entitlement.verticalId === "auto",
      ),
    ).toMatchObject({
      value: 80,
      sourceProductIds: ["auto.dealer.growth"],
    });
    expect(
      changedBilling.entitlements.some(
        (entitlement) =>
          entitlement.productId === "plan.pro.business" &&
          entitlement.status === "active",
      ),
    ).toBe(false);
    expect(
      changedBilling.usage.find(
        (usage) =>
          usage.key === "maxActiveVehicles" && usage.verticalId === "auto",
      ),
    ).toMatchObject({
      label: "Véhicules actifs",
      limit: 80,
      unit: "véhicules",
    });

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

  it("quotes a vertical trial once and exposes scoped effective entitlements", async () => {
    storageService.setCurrentUserKey("pro_auto_michel");
    const service = new DemoBusinessRulesService();
    const quote = await service.createQuote({
      productIds: ["auto.dealer.starter"],
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "frontend-auto-trial-quote-01",
    });
    expect(quote).toMatchObject({
      amountDueTodayMinor: 0,
      reasonCode: "TRIAL_ELIGIBLE",
      trial: { productId: "auto.dealer.starter", durationDays: 30 },
    });
    await service.createCheckout(quote.id, "frontend-auto-trial-checkout-01");
    const overview = await service.getBillingOverview();
    expect(
      overview.subscriptions.find(
        (entry) => entry.productId === "auto.dealer.starter",
      ),
    ).toMatchObject({ status: "trialing", verticalId: "auto" });
    expect(
      overview.effectiveEntitlements.some(
        (entry) =>
          entry.verticalId === "auto" && entry.key === "maxActiveVehicles",
      ),
    ).toBe(true);
    expect(
      overview.effectiveEntitlements.some(
        (entry) =>
          entry.verticalId === "immo" && entry.key === "maxActiveVehicles",
      ),
    ).toBe(false);
    expect(
      overview.creditBalances.find(
        (balance) => balance.creditType === "auto_visibility",
      ),
    ).toMatchObject({
      available: 1,
      transactions: [
        expect.objectContaining({
          quantity: 1,
          sourceType: "subscription",
        }),
      ],
    });
  });

  it("requires a second actor for an audited complimentary plan grant", async () => {
    storageService.setCurrentUserKey("admin_antoine");
    const service = new DemoBusinessRulesService();
    const catalog = await service.getCatalog("FR");
    const product = catalog.products.find(
      (candidate) => candidate.id === "course.school.organization",
    )!;
    const request = await service.requestComplimentaryGrant({
      accountId: "organization_partner_demo",
      productVersionId: product.versionId,
      campaignId: "partner-launch-2026",
      reason: "Partenaire stratégique de lancement Éducation",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-11-01T00:00:00.000Z",
      idempotencyKey: "complimentary-request-course-001",
    });
    await expect(
      service.decideComplimentaryGrant(request.id, {
        decision: "approved",
        reason: "Validation direction",
        idempotencyKey: "complimentary-decision-course-self-001",
      }),
    ).rejects.toThrow("deuxième personne");

    storageService.setCurrentUserKey("super_admin_alex");
    const decision = await service.decideComplimentaryGrant(request.id, {
      decision: "approved",
      reason: "Validation direction",
      idempotencyKey: "complimentary-decision-course-001",
    });
    expect(decision.grantId).toMatch(/^complimentary_grant_/);
    const overview = await service.getAdminOverview("FR");
    expect(overview.entitlements).toContainEqual(
      expect.objectContaining({
        accountId: "organization_partner_demo",
        productId: product.id,
        key: "maxActiveOffers",
        status: "active",
      }),
    );
  });
});
