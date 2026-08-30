import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoCrmService } from "./demo-crm.service";
import { storageService } from "../../../services/storage.service";

describe("DemoCrmService", () => {
  beforeEach(() => storageService.setCurrentUserKey("admin_antoine"));
  afterEach(() => storageService.setCurrentUserKey("guest"));

  it("provides a deterministic asynchronous CRM dashboard", async () => {
    const first = await new DemoCrmService().getDashboard();
    const second = await new DemoCrmService().getDashboard();

    expect(first).toEqual(second);
    expect(first.currency).toBe("EUR");
    expect(first.openPipelineMinor).toBeGreaterThan(0);
    expect(first.stages).toHaveLength(7);
  });

  it("moves opportunities with optimistic locking and enforces loss reasons", async () => {
    const service = new DemoCrmService();
    const opportunity = (await service.listOpportunities()).items[0];
    const stages = (await service.listPipelines())[0].stages;
    const lost = stages.find((stage) => stage.isLost)!;

    await expect(
      service.transitionOpportunity(opportunity.id, {
        stageId: lost.id,
        expectedVersion: opportunity.version,
      }),
    ).rejects.toThrow("motif de perte");

    const updated = await service.transitionOpportunity(opportunity.id, {
      stageId: lost.id,
      expectedVersion: opportunity.version,
      lossReason: "budget",
    });
    expect(updated.status).toBe("lost");

    await expect(
      service.transitionOpportunity(opportunity.id, {
        stageId: stages[0].id,
        expectedVersion: opportunity.version,
      }),
    ).rejects.toThrow("modifiée");
  });

  it("appends notes to the entity-scoped activity timeline", async () => {
    const service = new DemoCrmService();
    const opportunity = (await service.listOpportunities()).items[0];
    await service.createActivity({
      entityType: "opportunity",
      entityId: opportunity.id,
      activityType: "NOTE_CREATED",
      title: "Décision client",
      description: "Le comité se réunit vendredi.",
    });

    const activities = await service.listActivities(
      "opportunity",
      opportunity.id,
    );
    expect(activities[0]).toMatchObject({
      activityType: "NOTE_CREATED",
      title: "Décision client",
    });
  });

  it("persists pipeline configuration per service instance with version checks", async () => {
    const service = new DemoCrmService();
    const pipeline = (await service.listPipelines())[0];
    const input = {
      name: "Ventes partenaires",
      description: "Partenariats commerciaux",
      isDefault: true,
      stages: pipeline.stages.map((stage, position) => ({
        id: stage.id,
        name: stage.name,
        position,
        defaultProbability: stage.defaultProbability,
        colorToken: stage.colorToken,
        isOpen: stage.isOpen,
        isWon: stage.isWon,
        isLost: stage.isLost,
        requiredFields: stage.requiredFields,
        slaHours: stage.slaHours,
      })),
    };
    const updated = await service.updatePipeline(
      pipeline.id,
      pipeline.version,
      input,
    );

    expect(updated.name).toBe("Ventes partenaires");
    expect((await service.listPipelines())[0].version).toBe(2);
    await expect(
      service.updatePipeline(pipeline.id, pipeline.version, input),
    ).rejects.toThrow("modifiée");
  });

  it("keeps product prices and quote totals in integer minor units", async () => {
    const service = new DemoCrmService();
    const product = await service.createProduct({
      sku: "PACK-TEST",
      name: "Pack test",
      productType: "pack",
      price: {
        amount: { amountMinor: 999, currency: "EUR" },
        billingInterval: "one_time",
      },
    });
    const account = (await service.listAccounts()).items[0];
    const quote = await service.createQuote({
      accountId: account.id,
      currency: "EUR",
      items: [
        {
          productId: product.id,
          description: product.name,
          quantity: 3,
          unitAmountMinor: 999,
          discountMinor: 97,
          taxMinor: 580,
        },
      ],
    });
    expect(quote.totalMinor).toBe(3480);
    expect(Number.isInteger(quote.totalMinor)).toBe(true);
  });

  it("exposes deterministic Shongre intelligence only for linked accounts", async () => {
    const service = new DemoCrmService();
    const accounts = (await service.listAccounts()).items;
    const linked = await service.getAccountShongreIntelligence(accounts[0].id);
    const unlinked = await service.getAccountShongreIntelligence(
      accounts[1].id,
    );

    expect(linked).toMatchObject({
      linked: true,
      organization: { verified: true },
      listings: { published: 28 },
      subscription: { status: "active" },
    });
    expect(unlinked).toMatchObject({
      linked: false,
      listings: { total: 0, availability: "not_linked" },
    });
  });

  it("returns ranked duplicate signals instead of scanning in components", async () => {
    const service = new DemoCrmService();
    const [match] = await service.findAccountDuplicates({
      name: "L'Atelier Nordique SAS",
      domain: "www.atelier-nordique.fr",
    });

    expect(match.confidence).toBe(100);
    expect(match.signals.map((signal) => signal.kind)).toEqual([
      "domain",
      "name",
    ]);
  });

  it("creates, updates, and deletes deterministic saved views", async () => {
    const service = new DemoCrmService();
    const created = await service.createSavedView({
      entityType: "account",
      name: "Partenaires",
      visibility: "personal",
      filterDefinition: { lifecycle: "partner" },
    });
    expect((await service.listSavedViews("account"))[0]).toEqual(created);

    const updated = await service.updateSavedView(created.id, created.version, {
      entityType: "account",
      name: "Partenaires actifs",
      visibility: "personal",
      filterDefinition: { lifecycle: "partner" },
    });
    expect(updated).toMatchObject({ name: "Partenaires actifs", version: 2 });

    await service.deleteSavedView(updated.id, updated.version);
    expect(
      (await service.listSavedViews("account")).some(
        (view) => view.id === updated.id,
      ),
    ).toBe(false);
  });

  it("persists normalized account tags in demo mode", async () => {
    const service = new DemoCrmService();
    const account = (await service.listAccounts()).items[0];
    const updated = await service.updateAccount(account.id, account.version, {
      tags: ["  À rappeler ", "Compte clé", "à rappeler"],
    });

    expect(updated.tags).toEqual(["À rappeler", "Compte clé"]);
    expect((await service.getAccount(account.id)).tags).toEqual(updated.tags);
  });
});
