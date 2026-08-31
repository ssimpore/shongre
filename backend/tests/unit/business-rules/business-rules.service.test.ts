import { describe, expect, it } from "vitest";
import { COUNTRY_REGISTRY } from "@shongre/contracts";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { DemoBusinessRulesRepository } from "../../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../../src/modules/business-rules/business-rules.service.js";

describe("BusinessRulesService quotes", () => {
  it("publishes the five active professional verticals from one catalog", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const catalog = await service.getProfessionalPlanCatalog("FR");
    expect(catalog.verticals.map((vertical) => vertical.id)).toEqual([
      "general",
      "auto",
      "immo",
      "emploi",
      "education",
    ]);
    expect(
      catalog.plans.some(
        (plan) => plan.commercialProfile.familyId === "vertical.education",
      ),
    ).toBe(true);
    expect(
      catalog.plans.every((plan) => plan.commercialProfile.professionalOnly),
    ).toBe(true);
  });

  it.each(
    COUNTRY_REGISTRY.filter(
      (country) =>
        country.marketCode !== BASELINE_MONETIZATION_CATALOG.marketCode,
    ).map((country) => country.marketCode),
  )(
    "fails closed when %s has no active commercial catalog",
    async (marketCode) => {
      const service = new BusinessRulesService(
        new DemoBusinessRulesRepository(),
      );

      await expect(service.getCatalog(marketCode)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    },
  );

  it("rejects an unknown market before reading commercial configuration", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());

    await expect(service.getCatalog("ZZ")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("versions vertical configuration without duplicating the product catalog", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const current = await service.getCatalog("FR");
    const draft = await service.createDraft("vertical-admin", {
      marketCode: "FR",
      reason: "Mise à jour contrôlée de la verticale automobile",
      verticals: current.verticals.map((vertical) =>
        vertical.id === "auto"
          ? { ...vertical, name: "Automobile", sortOrder: 12 }
          : vertical,
      ),
    });
    const snapshot = await repository.getCatalogVersion(draft.id);

    expect(
      snapshot?.verticals.find((vertical) => vertical.id === "auto"),
    ).toMatchObject({ name: "Automobile", sortOrder: 12 });
    expect(snapshot?.products).toHaveLength(current.products.length);
    expect((await service.getCatalog("FR")).verticals).toEqual(
      current.verticals,
    );
  });

  it("versions price, media quota, feature and trial changes as one plan snapshot", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const current = await service.getCatalog("FR");
    const original = current.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const products = current.products.map((product) =>
      product.id !== original.id
        ? product
        : {
            ...product,
            prices: product.prices.map((price) =>
              price.billingPeriod === "month"
                ? {
                    ...price,
                    amount: { ...price.amount, amountMinor: 6_490 },
                  }
                : price,
            ),
            entitlements: product.entitlements.map((entitlement) =>
              entitlement.key === "maxPhotosPerVehicle"
                ? { ...entitlement, value: 30 }
                : entitlement.key === "inventoryXmlImport"
                  ? { ...entitlement, value: false }
                  : entitlement,
            ),
            commercialProfile: {
              ...product.commercialProfile,
              trialPolicy: {
                ...product.commercialProfile.trialPolicy,
                durationDays: 14,
              },
            },
          },
    );

    const version = await service.createDraft("plan-admin", {
      marketCode: "FR",
      reason: "Validation coordonnée du prix, quota et essai Auto",
      products,
    });
    const snapshot = await repository.getCatalogVersion(version.id);
    const changed = snapshot?.products.find(
      (product) => product.id === original.id,
    );

    expect(changed?.versionId).toBe(`${version.id}:${original.id}`);
    expect(
      changed?.prices.find((price) => price.billingPeriod === "month")?.amount
        .amountMinor,
    ).toBe(6_490);
    expect(
      changed?.entitlements.find(
        (entitlement) => entitlement.key === "maxPhotosPerVehicle",
      )?.value,
    ).toBe(30);
    expect(
      changed?.entitlements.find(
        (entitlement) => entitlement.key === "inventoryXmlImport",
      )?.value,
    ).toBe(false);
    expect(changed?.commercialProfile.trialPolicy.durationDays).toBe(14);
    expect(
      (await service.getCatalog("FR")).products.find(
        (product) => product.id === original.id,
      )?.versionId,
    ).toBe(original.versionId);
  });

  it("creates an authoritative minor-unit quote from the active catalog", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const quote = await service.createQuote("individual_quote_test", {
      productIds: ["premium.urgent"],
      marketCode: "FR",
      idempotencyKey: "quote-test-urgent-0001",
    });
    expect(quote.configurationVersionId).toBe("commercial-fr-v3");
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].unitAmountMinor).toBeGreaterThan(0);
    expect(quote.totalMinor).toBe(
      quote.subtotalMinor - quote.discountMinor + quote.taxMinor,
    );
    expect(quote.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when declared product economics are not approved", async () => {
    class UnapprovedEconomicsRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = structuredClone(
          await super.getActiveCatalog(marketCode),
        )!;
        const product = catalog.products.find(
          (entry) => entry.id === "premium.urgent",
        )!;
        catalog.commercialEconomics = [
          {
            id: "economics:test:urgent",
            productId: product.id,
            priceId: product.prices[0].id,
            marketCode: "FR",
            currency: "EUR",
            approvalStatus: "missing_inputs",
            status: "active",
          },
        ];
        return catalog;
      }
    }

    const service = new BusinessRulesService(
      new UnapprovedEconomicsRepository(),
    );
    await expect(
      service.createQuote("individual_economics_test", {
        productIds: ["premium.urgent"],
        marketCode: "FR",
        idempotencyKey: "quote-unapproved-economics-0001",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { reasonCode: "COMMERCIAL_ECONOMICS_NOT_APPROVED" },
    });
  });

  it("blocks an approved price that falls below its margin floor", async () => {
    class NegativeMarginRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = structuredClone(
          await super.getActiveCatalog(marketCode),
        )!;
        const product = catalog.products.find(
          (entry) => entry.id === "premium.urgent",
        )!;
        catalog.commercialEconomics = [
          {
            id: "economics:test:urgent-margin",
            productId: product.id,
            priceId: product.prices[0].id,
            marketCode: "FR",
            currency: "EUR",
            directCostAmountMinor: product.prices[0].amount.amountMinor,
            marginFloorBps: 1_000,
            approvalStatus: "approved",
            evidenceReference: "finance-review-test",
            status: "active",
          },
        ];
        return catalog;
      }
    }

    const service = new BusinessRulesService(new NegativeMarginRepository());
    await expect(
      service.createQuote("individual_margin_test", {
        productIds: ["premium.urgent"],
        marketCode: "FR",
        idempotencyKey: "quote-negative-margin-0001",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { reasonCode: "COMMERCIAL_MARGIN_FLOOR_NOT_MET" },
    });
  });

  it("returns the same immutable quote for the same account idempotency key", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const request = {
      productIds: ["premium.search_bump"],
      marketCode: "FR" as const,
      idempotencyKey: "quote-test-bump-0002",
    };
    const first = await service.createQuote("individual_quote_test", request);
    const second = await service.createQuote("individual_quote_test", request);
    expect(second).toEqual(first);
  });

  it("rejects a configured paid product whose fulfillment is suspended", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    await expect(
      service.createQuote("individual_quote_test", {
        productIds: ["premium.visibility_bundle"],
        marketCode: "FR",
        idempotencyKey: "quote-test-suspended-pack-0001",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects an offer whose product validity window has expired", async () => {
    class ExpiredOfferRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = structuredClone(
          await super.getActiveCatalog(marketCode),
        )!;
        const product = catalog.products.find(
          (entry) => entry.id === "premium.urgent",
        )!;
        product.effectiveUntil = "2020-01-01T00:00:00.000Z";
        return catalog;
      }
    }
    const service = new BusinessRulesService(new ExpiredOfferRepository());

    await expect(
      service.createQuote("individual_expired_offer", {
        productIds: ["premium.urgent"],
        marketCode: "FR",
        idempotencyKey: "quote-expired-offer-0001",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a quote whose persisted pricing snapshot was tampered with", async () => {
    class TamperingRepository extends DemoBusinessRulesRepository {
      override async getQuote(quoteId: string) {
        const quote = await super.getQuote(quoteId);
        if (quote) quote.lines[0].totalMinor += 1;
        return quote;
      }
    }
    const service = new BusinessRulesService(new TamperingRepository());
    const quote = await service.createQuote("individual_tamper_test", {
      productIds: ["premium.urgent"],
      marketCode: "FR",
      idempotencyKey: "quote-test-tamper-0006",
    });
    await expect(
      service.createCheckout(
        "individual_tamper_test",
        quote.id,
        "checkout-test-tamper-0006",
        "FR",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects checkout when the request market differs from the quote", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "individual_quote_market_mismatch";
    const quote = await service.createQuote(accountId, {
      productIds: ["premium.urgent"],
      marketCode: "FR",
      idempotencyKey: "quote-market-mismatch-0001",
    });

    await expect(
      service.createCheckout(
        accountId,
        quote.id,
        "checkout-market-mismatch-0001",
        "BE",
      ),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      details: { reasonCode: "QUOTE_MARKET_CONTEXT_MISMATCH" },
    });
  });

  it("rejects a professional-only product for an individual account", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    await expect(
      service.createQuote("individual_quote_test", {
        productIds: ["plan.pro.business"],
        marketCode: "FR",
        idempotencyKey: "quote-test-plan-0003",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an organization buy professional plans without opening organization-only tiers", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const quote = await service.createQuote("organization_dealer_quote", {
      productIds: ["auto.dealer.starter"],
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "quote-org-professional-plan-0001",
    });
    expect(quote.trial?.durationDays).toBe(30);

    await expect(
      service.createQuote("professional_solo_account", {
        productIds: ["auto.dealer.network"],
        marketCode: "FR",
        categoryId: "vehicles",
        idempotencyKey: "quote-professional-org-tier-0002",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("snapshots the selected annual price and grants subscription entitlements after payment", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const catalog = await service.getCatalog("FR");
    const plan = catalog.products.find(
      (product) => product.id === "auto.dealer.starter",
    )!;
    const annualPrice = plan.prices.find(
      (price) => price.billingPeriod === "year",
    )!;
    const quote = await service.createQuote("professional_subscription_test", {
      productIds: [plan.id],
      priceIds: { [plan.id]: annualPrice.id },
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "quote-test-annual-plan-0004",
    });
    expect(quote.lines[0]).toMatchObject({
      priceId: annualPrice.id,
      billingPeriod: "year",
      unitAmountMinor: annualPrice.amount.amountMinor,
    });
    await service.createCheckout(
      "professional_subscription_test",
      quote.id,
      "checkout-test-annual-plan-0004",
      "FR",
    );
    const subscriptions = await service.getSubscriptions(
      "professional_subscription_test",
      "FR",
    );
    const entitlements = await service.getActiveEntitlements(
      "professional_subscription_test",
      "FR",
    );
    expect(quote).toMatchObject({
      amountDueTodayMinor: 0,
      nextChargeMinor: quote.totalMinor,
      reasonCode: "TRIAL_ELIGIBLE",
      trial: { productId: plan.id, durationDays: 30 },
    });
    expect(subscriptions).toContainEqual(
      expect.objectContaining({ productId: plan.id, status: "trialing" }),
    );
    expect(entitlements.some((entry) => entry.productId === plan.id)).toBe(
      true,
    );
    await expect(
      service.getSubscriptions("professional_subscription_test", "BE"),
    ).resolves.toEqual([]);
    await expect(
      service.getActiveEntitlements("professional_subscription_test", "BE"),
    ).resolves.toEqual([]);
    const cancellation = await service.updateSubscriptionCancellation(
      "professional_subscription_test",
      {
        subscriptionId: subscriptions[0].id,
        cancelAtPeriodEnd: true,
      },
      "FR",
    );
    expect(cancellation.cancelAtPeriodEnd).toBe(true);
  });

  it("does not grant a second trial in the same vertical plan family", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_auto_trial_history";
    const first = await service.createQuote(accountId, {
      productIds: ["auto.dealer.starter"],
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "quote-auto-trial-first-0001",
    });
    expect(first.amountDueTodayMinor).toBe(0);
    expect(first.trial?.durationDays).toBe(30);
    await service.createCheckout(
      accountId,
      first.id,
      "checkout-auto-trial-first-0001",
      "FR",
    );

    const second = await service.createQuote(accountId, {
      productIds: ["auto.dealer.growth"],
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "quote-auto-trial-second-0002",
    });
    expect(second.trial).toBeUndefined();
    expect(second.amountDueTodayMinor).toBe(second.totalMinor);
  });

  it("applies a vertical new-customer campaign and rejects it after activation", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_auto_campaign";
    const quote = await service.createQuote(accountId, {
      productIds: ["auto.dealer.starter"],
      marketCode: "FR",
      categoryId: "vehicles",
      promotionCode: "AUTO2026",
      idempotencyKey: "quote-auto-campaign-0001",
    });
    expect(quote).toMatchObject({
      amountDueTodayMinor: 0,
      promotionCode: "AUTO2026",
      promotion: { freePeriodDays: 90, durationBillingPeriods: 3 },
      trial: { productId: "auto.dealer.starter", durationDays: 90 },
    });
    expect(quote.discountMinor).toBe(quote.subtotalMinor / 2);
    expect(quote.nextChargeMinor).toBe(quote.totalMinor);
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-auto-campaign-0001",
      "FR",
    );
    await expect(
      service.createQuote(accountId, {
        productIds: ["auto.dealer.growth"],
        marketCode: "FR",
        categoryId: "vehicles",
        promotionCode: "AUTO2026",
        idempotencyKey: "quote-auto-campaign-0002",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: { reasonCode: "PROMOTION_NEW_CUSTOMERS_ONLY" },
    });
  });

  it("rejects a plan change outside the configured transition matrix", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_transition_matrix";
    const quote = await service.createQuote(accountId, {
      productIds: ["auto.dealer.starter"],
      marketCode: "FR",
      categoryId: "vehicles",
      idempotencyKey: "quote-transition-matrix-0001",
    });
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-transition-matrix-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(accountId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const immoPrice = catalog.products
      .find((product) => product.id === "immo.agency.growth")!
      .prices.find((price) => price.billingPeriod === "month")!;

    await expect(
      service.previewSubscriptionChange(
        accountId,
        {
          subscriptionId: subscription.id,
          targetProductId: "immo.agency.growth",
          targetPriceId: immoPrice.id,
          idempotencyKey: "transition-auto-to-immo-0001",
        },
        "FR",
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: { reasonCode: "PLAN_TRANSITION_NOT_ALLOWED" },
    });
  });

  it("replaces generic plan rights when a configured cross-plan upgrade is applied", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_generic_to_auto";
    const quote = await service.createQuote(accountId, {
      productIds: ["plan.pro.business"],
      marketCode: "FR",
      idempotencyKey: "quote-generic-to-auto-0001",
    });
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-generic-to-auto-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(accountId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;

    await expect(
      service.previewSubscriptionChange(
        accountId,
        {
          subscriptionId: subscription.id,
          targetProductId: target.id,
          targetPriceId: targetPrice.id,
          expectedSubscriptionUpdatedAt: subscription.updatedAt,
          idempotencyKey: "change-generic-to-auto-wrong-market-0001",
        },
        "BE",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const changed = await service.applySubscriptionChange(
      accountId,
      {
        subscriptionId: subscription.id,
        targetProductId: target.id,
        targetPriceId: targetPrice.id,
        expectedSubscriptionUpdatedAt: subscription.updatedAt,
        idempotencyKey: "change-generic-to-auto-0001",
      },
      "FR",
    );
    expect(changed).toMatchObject({
      productId: target.id,
      productVersionId: target.versionId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: catalog.marketCode,
      currency: catalog.currency,
      verticalId: "auto",
      familyId: "vertical.auto",
    });
    await expect(
      service.applySubscriptionChange(
        accountId,
        {
          subscriptionId: subscription.id,
          targetProductId: target.id,
          targetPriceId: targetPrice.id,
          expectedSubscriptionUpdatedAt: subscription.updatedAt,
          idempotencyKey: "change-generic-to-auto-0001",
        },
        "FR",
      ),
    ).resolves.toEqual(changed);
    const activeEntitlements = await service.getActiveEntitlements(
      accountId,
      "FR",
    );
    expect(
      activeEntitlements.some(
        (entitlement) =>
          entitlement.productId === "plan.pro.business" &&
          entitlement.status === "active",
      ),
    ).toBe(false);
    expect(activeEntitlements).toContainEqual(
      expect.objectContaining({
        productId: target.id,
        productVersionId: target.versionId,
        configurationVersionId: catalog.configurationVersionId,
        key: "maxActiveVehicles",
        status: "active",
        verticalId: "auto",
      }),
    );
  });

  it("rejects a stale plan-change preview before mutation", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_stale_transition";
    const quote = await service.createQuote(accountId, {
      productIds: ["plan.pro.business"],
      marketCode: "FR",
      idempotencyKey: "quote-stale-transition-0001",
    });
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-stale-transition-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(accountId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;

    await expect(
      service.previewSubscriptionChange(
        accountId,
        {
          subscriptionId: subscription.id,
          targetProductId: target.id,
          targetPriceId: targetPrice.id,
          expectedSubscriptionUpdatedAt: "2020-01-01T00:00:00.000Z",
          idempotencyKey: "change-stale-transition-0001",
        },
        "FR",
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { reasonCode: "STALE_SUBSCRIPTION_STATE" },
    });
  });

  it("schedules a same-plan billing renewal without replacing current rights", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_same_plan_renewal";
    const quote = await service.createQuote(accountId, {
      productIds: ["plan.pro.business"],
      marketCode: "FR",
      idempotencyKey: "quote-same-plan-renewal-0001",
    });
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-same-plan-renewal-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(accountId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const product = catalog.products.find(
      (candidate) => candidate.id === subscription.productId,
    )!;
    const annualPrice = product.prices.find(
      (price) => price.billingPeriod === "year",
    )!;
    const beforeEntitlements = await service.getActiveEntitlements(
      accountId,
      "FR",
    );
    const request = {
      subscriptionId: subscription.id,
      targetProductId: product.id,
      targetPriceId: annualPrice.id,
      expectedSubscriptionUpdatedAt: subscription.updatedAt,
      idempotencyKey: "change-same-plan-renewal-0001",
    };

    await expect(
      service.previewSubscriptionChange(accountId, request, "FR"),
    ).resolves.toMatchObject({
      effectiveAt: "period_end",
      proration: { amountMinor: 0, currency: "EUR" },
      targetProductVersionId: product.versionId,
    });
    await expect(
      service.applySubscriptionChange(accountId, request, "FR"),
    ).resolves.toMatchObject({
      productId: product.id,
      priceId: subscription.priceId,
      scheduledProductId: product.id,
      scheduledProductVersionId: product.versionId,
      scheduledPriceId: annualPrice.id,
      scheduledChangeAt: subscription.currentPeriodEnd,
    });
    expect(await service.getActiveEntitlements(accountId, "FR")).toEqual(
      beforeEntitlements,
    );
  });

  it("serializes concurrent plan changes from the same client snapshot", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const accountId = "professional_concurrent_transition";
    const quote = await service.createQuote(accountId, {
      productIds: ["plan.pro.business"],
      marketCode: "FR",
      idempotencyKey: "quote-concurrent-transition-0001",
    });
    await service.createCheckout(
      accountId,
      quote.id,
      "checkout-concurrent-transition-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(accountId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;
    const baseRequest = {
      subscriptionId: subscription.id,
      targetProductId: target.id,
      targetPriceId: targetPrice.id,
      expectedSubscriptionUpdatedAt: subscription.updatedAt,
    };

    const attempts = await Promise.allSettled([
      service.applySubscriptionChange(
        accountId,
        {
          ...baseRequest,
          idempotencyKey: "change-concurrent-transition-a",
        },
        "FR",
      ),
      service.applySubscriptionChange(
        accountId,
        {
          ...baseRequest,
          idempotencyKey: "change-concurrent-transition-b",
        },
        "FR",
      ),
    ]);

    expect(
      attempts.filter((attempt) => attempt.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((attempt) => attempt.status === "rejected"),
    ).toHaveLength(1);
  });

  it("allows an authorized organization manager and hides the subscription from a viewer", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const ownerId = "organization_owner_transition";
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const quote = await service.createQuote(ownerId, {
      productIds: ["plan.pro.business"],
      marketCode: "FR",
      organizationId,
      idempotencyKey: "quote-organization-transition-0001",
    });
    await service.createCheckout(
      ownerId,
      quote.id,
      "checkout-organization-transition-0001",
      "FR",
    );
    const subscription = (await service.getSubscriptions(ownerId, "FR"))[0];
    const catalog = await service.getCatalog("FR");
    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;

    await expect(
      service.previewSubscriptionChange(
        "organization_viewer",
        {
          subscriptionId: subscription.id,
          targetProductId: target.id,
          targetPriceId: targetPrice.id,
          idempotencyKey: "change-organization-viewer-0001",
        },
        "FR",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      service.applySubscriptionChange(
        "organization_manager",
        {
          subscriptionId: subscription.id,
          targetProductId: target.id,
          targetPriceId: targetPrice.id,
          expectedSubscriptionUpdatedAt: subscription.updatedAt,
          idempotencyKey: "change-organization-manager-0001",
        },
        "FR",
      ),
    ).resolves.toMatchObject({
      organizationId,
      productId: target.id,
      configurationVersionId: catalog.configurationVersionId,
    });
  });

  it("returns a stable reason when a promotion is unpublished", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const validation = await service.validatePromotion(
      "individual_promotion_test",
      {
        code: "WELCOME10",
        productIds: ["premium.urgent"],
        marketCode: "FR",
      },
    );
    expect(validation).toMatchObject({
      valid: false,
      reasonCode: "PROMOTION_DISABLED",
    });
    await expect(
      service.createQuote("individual_promotion_test", {
        productIds: ["premium.urgent"],
        marketCode: "FR",
        promotionCode: "WELCOME10",
        idempotencyKey: "quote-test-disabled-promotion-0005",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("consumes scoped publication quota atomically under concurrency", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const context = {
      marketCode: "FR" as const,
      countryCode: "FR" as const,
      currency: "EUR",
      categoryId: "vehicles",
      userType: "individual" as const,
      listingType: "standard",
      publicationChannel: "web",
      usageLevel: 0,
      featureFlags: [],
    };
    const attempts = await Promise.allSettled([
      service.authorizePublication("individual_concurrent_quota", context),
      service.authorizePublication("individual_concurrent_quota", context),
    ]);
    expect(
      attempts.filter((attempt) => attempt.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((attempt) => attempt.status === "rejected"),
    ).toHaveLength(1);
  });

  it("keeps publication blocked when registry readiness evidence is incomplete", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const current = await service.getCatalog("FR");
    const draft = await service.createDraft("maker-admin", {
      marketCode: "FR",
      reason: "Validation du workflow de publication atomique",
      products: current.products.map((product) =>
        product.kind === "subscription" &&
        product.prices.some((price) => price.amount.amountMinor > 0)
          ? { ...product, status: "disabled" }
          : product,
      ),
      subscriptionPolicy: {
        ...current.subscriptionPolicy,
        providerPlanChange: "checkout_confirmation",
      },
    });
    expect(
      draft.conflicts.filter((conflict) => conflict.severity === "blocking"),
    ).toEqual([
      expect.objectContaining({
        code: "COMMERCIAL_MARKET_NOT_READY",
        entityIds: ["FR", "taxes.mode"],
      }),
    ]);
    await expect(
      service.transitionVersion({
        versionId: draft.id,
        action: "submit",
        actorId: "maker-admin",
        reason: "Soumission pour contrôle indépendant",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const overview = await service.getAdminOverview("FR");
    expect(overview.publishedVersion.id).toBe("commercial-fr-v3");
  });

  it("does not schedule a future configuration before registry readiness is complete", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const current = await service.getCatalog("FR");
    const draft = await service.createDraft("schedule-maker", {
      marketCode: "FR",
      reason: "Planification contrôlée d’une future activation",
      effectiveFrom: "2099-01-01T00:00:00.000Z",
      products: current.products.map((product) =>
        product.kind === "subscription" &&
        product.prices.some((price) => price.amount.amountMinor > 0)
          ? { ...product, status: "disabled" }
          : product,
      ),
      subscriptionPolicy: {
        ...current.subscriptionPolicy,
        providerPlanChange: "checkout_confirmation",
      },
    });
    expect(draft.conflicts).toContainEqual(
      expect.objectContaining({
        code: "COMMERCIAL_MARKET_NOT_READY",
        severity: "blocking",
      }),
    );
    await expect(
      service.transitionVersion({
        versionId: draft.id,
        action: "submit",
        actorId: "schedule-maker",
        reason: "Soumission de la future grille planifiée",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const overview = await service.getAdminOverview("FR");
    expect(overview.publishedVersion.id).not.toBe(draft.id);
    expect(overview.scheduledChanges).toBe(0);
  });
});
