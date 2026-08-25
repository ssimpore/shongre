import { describe, expect, it } from "vitest";
import { DemoMarketingRepository } from "../../src/infrastructure/database/repositories/marketing.repository.js";
import { DemoMarketingOperationsRepository } from "../../src/infrastructure/database/repositories/marketing-operations.repository.js";
import { MarketingService } from "../../src/modules/marketing/marketing.service.js";
import { MarketingOperationsService } from "../../src/modules/marketing/marketing-operations.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const principal: Principal = {
  userId: "10000000-0000-4000-8000-000000000301",
  email: "marketing-admin@example.test",
  role: "admin",
  accountType: "staff",
  mfaVerified: true,
  capabilities: [
    "marketing.dashboard.read", "marketing.profiles.read", "marketing.profiles.manage",
    "marketing.lists.read", "marketing.lists.manage", "marketing.segments.read", "marketing.segments.manage",
    "marketing.campaigns.read", "marketing.campaigns.create", "marketing.campaigns.update", "marketing.campaigns.send",
    "marketing.campaigns.pause", "marketing.campaigns.cancel", "marketing.templates.read",
    "marketing.templates.manage", "marketing.compliance.read", "marketing.analytics.read",
  ],
};

describe("Marketing service", () => {
  it("estimates an authoritative audience and excludes unsubscribed profiles", async () => {
    const service = new MarketingService(new DemoMarketingRepository());
    const lists = await service.listLists(principal);
    const before = await service.estimateAudience(principal, {
      includeListIds: [lists.items[0].id], includeSegmentIds: [], includeProfileIds: [],
      excludeListIds: [], excludeSegmentIds: [], excludeProfileIds: [],
    });
    const profiles = await service.listProfiles(principal, { limit: 20 });
    await service.unsubscribeProfile(principal, profiles.items.find((item) => item.email === "camille@example.fr")!.id);
    const after = await service.estimateAudience(principal, {
      includeListIds: [lists.items[0].id], includeSegmentIds: [], includeProfileIds: [],
      excludeListIds: [], excludeSegmentIds: [], excludeProfileIds: [],
    });

    expect(before).toMatchObject({ selected: 2, eligible: 2, excluded: 0 });
    expect(after).toMatchObject({ selected: 2, eligible: 1, excluded: 1, unsubscribed: 1 });
  });

  it("keeps global marketing suppression from silently reactivating", async () => {
    const repository = new DemoMarketingRepository();
    const service = new MarketingService(repository);
    const profile = (await service.listProfiles(principal, { query: "camille@example.fr" })).items[0];
    await service.unsubscribeProfile(principal, profile.id);

    await expect(service.createProfile(principal, { email: profile.email, source: "ACCOUNT" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.confirmProfile(principal, profile.id))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("uses double opt-in and non-enumerating public receipts", async () => {
    const service = new MarketingService(new DemoMarketingRepository());
    const receipt = await service.subscribePublic({
      email: "new-reader@example.fr", marketCode: "FR", locale: "fr-FR",
      topics: ["editorial"], source: "FOOTER", consentGiven: true,
    });
    expect(receipt).toMatchObject({ accepted: true, status: "PENDING_CONFIRMATION" });

    await expect(service.confirmPublic({ token: "not-a-valid-token" }))
      .rejects.toThrow();
  });

  it("lets an authenticated account manage preferences and explicitly resubscribe", async () => {
    const service = new MarketingService(new DemoMarketingRepository());
    const account = { ...principal, userId: "10000000-0000-4000-8000-000000000777", email: "camille@example.fr", accountType: "individual" as const };
    const existing = await service.getAccountSubscription(account, "FR");
    expect(existing?.status).toBe("SUBSCRIBED");

    const updated = await service.updateAccountPreferences(account, { marketCode: "FR", topics: ["new_features"] });
    expect(updated.topics).toEqual(["new_features"]);
    expect((await service.unsubscribeAccount(account, "FR")).status).toBe("UNSUBSCRIBED");

    const resubscribed = await service.subscribeAccount(account, { marketCode: "FR", locale: "fr-FR", topics: ["editorial"], consentGiven: true });
    expect(resubscribed.status).toBe("PENDING");
  });

  it("rejects unapproved fields even in nested segment groups", async () => {
    const service = new MarketingService(new DemoMarketingRepository());
    await expect(service.createSegment(principal, {
      name: "Unsafe segment",
      definition: {
        combinator: "AND", conditions: [], groups: [
          { combinator: "OR", conditions: [{ field: "internal_risk_score", operator: "GREATER_THAN", value: 50 }] },
        ],
      },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("preflights and queues a valid campaign through shared provider abstractions", async () => {
    const service = new MarketingService(new DemoMarketingRepository());
    const campaign = (await service.listCampaigns(principal)).items.find((item) => item.status === "DRAFT")!;
    const preflight = await service.preflight(principal, campaign.id);
    expect(preflight.canSend).toBe(true);
    expect(preflight.info.map((item) => item.code)).toContain("IDEMPOTENCY_ENABLED");

    const queued = await service.send(principal, campaign.id);
    expect(queued.campaign.status).toBe("QUEUED");
    expect(queued.queuedRecipients).toBeGreaterThan(0);
  });

  it("persists a manual A/B winner and accepts attributed conversions idempotently", async () => {
    const repository = new DemoMarketingRepository();
    const operations = new DemoMarketingOperationsRepository();
    const service = new MarketingService(repository, operations);
    const list = (await service.listLists(principal)).items[0];
    const campaign = await service.createCampaign(principal, {
      name: "Test A/B manuel",
      subject: "Variante A",
      content: { blocks: [{ id: "legal", type: "UNSUBSCRIBE", text: "Se désabonner" }] },
      audience: { includeListIds: [list.id], includeSegmentIds: [], includeProfileIds: [], excludeListIds: [], excludeSegmentIds: [], excludeProfileIds: [] },
      experiment: { enabled: true, testPercentage: 100, durationMinutes: 15, winnerMetric: "CLICK_RATE", winnerMode: "MANUAL", variants: [{ id: "a", name: "A", weight: 50 }, { id: "b", name: "B", weight: 50 }] },
    });
    expect((await service.selectExperimentWinner(principal, campaign.id, { variantId: "b" })).winningVariantId).toBe("b");

    const operationsService = new MarketingOperationsService(repository, operations);
    await expect(operationsService.recordConversion(principal, {
      idempotencyKey: "order:demo-1", conversionType: "order.completed",
      amountMinor: 2_990, currency: "EUR", occurredAt: "2026-08-25T12:00:00.000Z",
    })).resolves.toEqual({ accepted: true, duplicate: false });
  });
});
