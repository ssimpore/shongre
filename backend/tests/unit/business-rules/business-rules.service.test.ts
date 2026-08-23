import { describe, expect, it } from "vitest";
import { DemoBusinessRulesRepository } from "../../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../../src/modules/business-rules/business-rules.service.js";

describe("BusinessRulesService quotes", () => {
  it("creates an authoritative minor-unit quote from the active catalog", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const quote = await service.createQuote("individual_quote_test", {
      productIds: ["premium.urgent"],
      marketCode: "FR",
      idempotencyKey: "quote-test-urgent-0001",
    });
    expect(quote.configurationVersionId).toBe("commercial-fr-v1");
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
        productIds: ["plan.pro.starter"],
        marketCode: "FR",
        idempotencyKey: "quote-test-plan-0003",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("snapshots the selected annual price and grants subscription entitlements after payment", async () => {
    const service = new BusinessRulesService(new DemoBusinessRulesRepository());
    const catalog = await service.getCatalog("FR");
    const plan = catalog.products.find(
      (product) => product.id === "plan.pro.starter",
    )!;
    const annualPrice = plan.prices.find(
      (price) => price.billingPeriod === "year",
    )!;
    const quote = await service.createQuote("professional_subscription_test", {
      productIds: [plan.id],
      priceIds: { [plan.id]: annualPrice.id },
      marketCode: "FR",
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
    expect(subscriptions).toContainEqual(
      expect.objectContaining({ productId: plan.id, status: "active" }),
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
      overview.versions.find((version) => version.id === "commercial-fr-v1")
        ?.status,
    ).toBe("archived");

    const rollback = await service.transitionVersion({
      versionId: "commercial-fr-v1",
      action: "rollback",
      actorId: "rollback-admin",
      reason: "Préparation contrôlée du retour à la version initiale",
    });
    expect(rollback.status).toBe("draft");
    expect(rollback.id).not.toBe("commercial-fr-v1");
    const rollbackCatalog = await repository.getCatalogVersion(rollback.id);
    expect(
      rollbackCatalog?.products.every((product) =>
        product.prices.every((price) => price.id.startsWith(`${rollback.id}:`)),
      ),
    ).toBe(true);
    expect(
      (await service.getAdminOverview("FR")).versions.find(
        (entry) => entry.id === "commercial-fr-v1",
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
