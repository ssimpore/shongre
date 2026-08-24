import { describe, expect, it } from "vitest";
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
      "cours",
    ]);
    expect(
      catalog.plans.some(
        (plan) => plan.commercialProfile.familyId === "vertical.cours",
      ),
    ).toBe(true);
    expect(
      catalog.plans.every((plan) => plan.commercialProfile.professionalOnly),
    ).toBe(true);
  });

  it("versions vertical configuration without duplicating the product catalog", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const current = await service.getCatalog("FR");
    const draft = await service.createDraft("vertical-admin", {
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
    expect(quote.configurationVersionId).toBe("commercial-fr-v2");
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].unitAmountMinor).toBeGreaterThan(0);
    expect(quote.totalMinor).toBe(
      quote.subtotalMinor - quote.discountMinor + quote.taxMinor,
    );
    expect(quote.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
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
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
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
    );
    const subscriptions = await service.getSubscriptions(
      "professional_subscription_test",
    );
    const entitlements = await service.getActiveEntitlements(
      "professional_subscription_test",
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
    const cancellation = await service.updateSubscriptionCancellation(
      "professional_subscription_test",
      {
        subscriptionId: subscriptions[0].id,
        cancelAtPeriodEnd: true,
      },
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
    );
    const subscription = (await service.getSubscriptions(accountId))[0];
    const catalog = await service.getCatalog("FR");
    const immoPrice = catalog.products
      .find((product) => product.id === "immo.agency.growth")!
      .prices.find((price) => price.billingPeriod === "month")!;

    await expect(
      service.previewSubscriptionChange(accountId, {
        subscriptionId: subscription.id,
        targetProductId: "immo.agency.growth",
        targetPriceId: immoPrice.id,
        idempotencyKey: "transition-auto-to-immo-0001",
      }),
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
    );
    const subscription = (await service.getSubscriptions(accountId))[0];
    const catalog = await service.getCatalog("FR");
    const target = catalog.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const targetPrice = target.prices.find(
      (price) => price.billingPeriod === "month",
    )!;

    const changed = await service.applySubscriptionChange(accountId, {
      subscriptionId: subscription.id,
      targetProductId: target.id,
      targetPriceId: targetPrice.id,
      idempotencyKey: "change-generic-to-auto-0001",
    });
    expect(changed).toMatchObject({
      productId: target.id,
      productVersionId: target.versionId,
      verticalId: "auto",
      familyId: "vertical.auto",
    });
    const activeEntitlements = await service.getActiveEntitlements(accountId);
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
        key: "maxActiveVehicles",
        status: "active",
        verticalId: "auto",
      }),
    );
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

  it("publishes atomically only after a distinct approval", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const draft = await service.createDraft("maker-admin", {
      reason: "Validation du workflow de publication atomique",
    });
    await service.transitionVersion({
      versionId: draft.id,
      action: "submit",
      actorId: "maker-admin",
      reason: "Soumission pour contrôle indépendant",
    });
    await service.transitionVersion({
      versionId: draft.id,
      action: "approve",
      actorId: "checker-admin",
      reason: "Contrôle indépendant terminé sans conflit",
    });
    await expect(
      service.transitionVersion({
        versionId: draft.id,
        action: "publish",
        actorId: "maker-admin",
        reason: "Tentative invalide du créateur initial",
      }),
    ).rejects.toThrow("four-eyes approval required");
    const published = await service.transitionVersion({
      versionId: draft.id,
      action: "publish",
      actorId: "publisher-admin",
      reason: "Publication validée après approbation indépendante",
    });
    expect(published.status).toBe("active");
    const overview = await service.getAdminOverview("FR");
    expect(overview.publishedVersion.id).toBe(draft.id);
    expect(
      overview.versions.find((version) => version.id === "commercial-fr-v2")
        ?.status,
    ).toBe("archived");

    const rollback = await service.transitionVersion({
      versionId: "commercial-fr-v2",
      action: "rollback",
      actorId: "rollback-admin",
      reason: "Préparation contrôlée du retour à la version initiale",
    });
    expect(rollback.status).toBe("draft");
    expect(rollback.id).not.toBe("commercial-fr-v2");
    const rollbackCatalog = await repository.getCatalogVersion(rollback.id);
    expect(
      rollbackCatalog?.products.every((product) =>
        product.prices.every((price) => price.id.startsWith(`${rollback.id}:`)),
      ),
    ).toBe(true);
    expect(
      (await service.getAdminOverview("FR")).versions.find(
        (entry) => entry.id === "commercial-fr-v2",
      )?.status,
    ).toBe("archived");
  });

  it("keeps future-approved configuration scheduled without replacing the active version", async () => {
    const repository = new DemoBusinessRulesRepository();
    const service = new BusinessRulesService(repository);
    const draft = await service.createDraft("schedule-maker", {
      reason: "Planification contrôlée d’une future activation",
      effectiveFrom: "2099-01-01T00:00:00.000Z",
    });
    await service.transitionVersion({
      versionId: draft.id,
      action: "submit",
      actorId: "schedule-maker",
      reason: "Soumission de la future grille planifiée",
    });
    await service.transitionVersion({
      versionId: draft.id,
      action: "approve",
      actorId: "schedule-checker",
      reason: "Approbation indépendante de la grille planifiée",
    });
    const scheduled = await service.transitionVersion({
      versionId: draft.id,
      action: "publish",
      actorId: "schedule-publisher",
      reason: "Programmation après validation des contrôles",
    });
    expect(scheduled.status).toBe("scheduled");
    const overview = await service.getAdminOverview("FR");
    expect(overview.publishedVersion.id).not.toBe(scheduled.id);
    expect(overview.scheduledChanges).toBeGreaterThan(0);
  });
});
