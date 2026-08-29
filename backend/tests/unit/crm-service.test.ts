import { describe, expect, it } from "vitest";
import { DemoCrmRepository } from "../../src/infrastructure/database/repositories/crm.repository.js";
import { CrmService } from "../../src/modules/crm/crm.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const principal: Principal = {
  userId: "10000000-0000-4000-8000-000000000004",
  email: "lea@example.test",
  role: "buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "admin",
  mfaVerified: true,
};

describe("CRM service", () => {
  it("derives tenant context and computes deterministic minor-unit forecasts", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const dashboard = await service.dashboard(principal);

    expect(dashboard.currency).toBe("EUR");
    expect(dashboard.openOpportunities).toBeGreaterThan(0);
    expect(Number.isInteger(dashboard.openPipelineMinor)).toBe(true);
    expect(dashboard.weightedPipelineMinor).toBeLessThanOrEqual(
      dashboard.openPipelineMinor,
    );
    expect(dashboard.stages.map((stage) => stage.stageName)).toContain(
      "Négociation",
    );
  });

  it("requires a loss reason and records a valid terminal transition", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const opportunities = await service.listOpportunities(principal, {});
    const pipelines = await service.listPipelines(principal);
    const opportunity = opportunities.items[0];
    const lost = pipelines.items[0].stages.find((stage) => stage.isLost)!;

    await expect(
      service.transitionOpportunity(principal, opportunity.id, {
        stageId: lost.id,
        expectedVersion: opportunity.version,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const updated = await service.transitionOpportunity(
      principal,
      opportunity.id,
      {
        stageId: lost.id,
        expectedVersion: opportunity.version,
        lossReason: "budget",
        futureRecontactDate: "2027-01-15",
      },
    );
    expect(updated.status).toBe("lost");
    expect(updated.lossReason).toBe("budget");
  });

  it("rejects stale optimistic-lock versions", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const opportunity = (await service.listOpportunities(principal, {}))
      .items[0];
    const nextStage = (await service.listPipelines(principal)).items[0]
      .stages[0];

    await expect(
      service.transitionOpportunity(principal, opportunity.id, {
        stageId: nextStage.id,
        expectedVersion: 999,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { reason: "optimistic_lock" },
    });
  });

  it("updates configured pipeline stages with validation and optimistic locking", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const pipeline = (await service.listPipelines(principal)).items[0];
    const input = {
      name: "Ventes entreprises",
      description: "Cycle commercial France",
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

    const updated = await service.updatePipeline(principal, pipeline.id, {
      expectedVersion: pipeline.version,
      input,
    });
    expect(updated.name).toBe("Ventes entreprises");
    expect(updated.version).toBe(pipeline.version + 1);
    expect(updated.stages.filter((stage) => stage.isWon)).toHaveLength(1);
    expect(updated.stages.filter((stage) => stage.isLost)).toHaveLength(1);

    await expect(
      service.updatePipeline(principal, pipeline.id, {
        expectedVersion: pipeline.version,
        input,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects pipelines without explicit won and lost terminal stages", async () => {
    const service = new CrmService(new DemoCrmRepository());
    await expect(
      service.createPipeline(principal, {
        name: "Pipeline invalide",
        stages: [
          { name: "A", position: 0, defaultProbability: 10 },
          { name: "B", position: 1, defaultProbability: 50 },
          { name: "C", position: 2, defaultProbability: 80 },
        ],
      }),
    ).rejects.toThrow();
  });

  it("creates tenant-scoped products, calculated quotes, and custom fields", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const product = await service.createProduct(principal, {
      sku: "CRM-TEST-M",
      name: "Offre test",
      productType: "subscription",
      price: {
        amount: { amountMinor: 1250, currency: "EUR" },
        billingInterval: "month",
      },
    });
    expect(product.prices[0].amount.amountMinor).toBe(1250);

    const account = (await service.listAccounts(principal, {})).items[0];
    const quote = await service.createQuote(principal, {
      accountId: account.id,
      currency: "EUR",
      items: [
        {
          productId: product.id,
          description: product.name,
          quantity: 2,
          unitAmountMinor: 1250,
          discountMinor: 100,
          taxMinor: 480,
        },
      ],
    });
    expect(quote.subtotalMinor).toBe(2500);
    expect(quote.totalMinor).toBe(2880);

    const field = await service.createCustomField(principal, {
      entityType: "account",
      name: "Segment stratégique",
      key: "strategic_segment",
      fieldType: "single_select",
      options: ["A", "B", "C"],
    });
    expect(field.key).toBe("strategic_segment");
  });

  it("centralizes account duplicate detection with ranked signals", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const matches = await service.findAccountDuplicates(principal, {
      name: "L'Atelier Nordique SAS",
      domain: "https://www.atelier-nordique.fr/catalogue",
    });

    expect(matches.items[0]).toMatchObject({
      displayName: "L'Atelier Nordique SAS",
      confidence: 100,
    });
    expect(matches.items[0].signals.map((signal) => signal.kind)).toEqual([
      "domain",
      "name",
    ]);
  });

  it("keeps personal saved views owner-scoped and versioned", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const created = await service.createSavedView(principal, {
      entityType: "account",
      name: "Prospects prioritaires",
      visibility: "personal",
      filterDefinition: { lifecycle: "prospect" },
      sortDefinition: [{ field: "updatedAt", direction: "desc" }],
    });

    expect((await service.listSavedViews(principal, "account")).items).toEqual([
      created,
    ]);

    const updated = await service.updateSavedView(principal, created.id, {
      expectedVersion: created.version,
      input: {
        entityType: "account",
        name: "Prospects France",
        visibility: "personal",
        filterDefinition: { lifecycle: "prospect", marketCode: "FR" },
      },
    });
    expect(updated.version).toBe(2);

    await service.deleteSavedView(principal, updated.id, updated.version);
    expect((await service.listSavedViews(principal, "account")).items).toEqual(
      [],
    );
  });

  it("requires configuration permission for shared saved views", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const commercial: Principal = {
      ...principal,
      capabilities: ["crm.access"],
    };

    await expect(
      service.createSavedView(commercial, {
        entityType: "account",
        name: "Vue équipe",
        visibility: "workspace",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("normalizes and persists tenant CRM tags on account updates", async () => {
    const service = new CrmService(new DemoCrmRepository());
    const account = (await service.listAccounts(principal, {})).items[0];
    const updated = await service.updateAccount(principal, account.id, {
      expectedVersion: account.version,
      changes: { tags: ["  Relance Q4 ", "Compte clé", "relance q4"] },
    });

    expect(updated.tags).toEqual(["Compte clé", "Relance Q4"]);
    expect((await service.getAccount(principal, account.id)).tags).toEqual(
      updated.tags,
    );
  });
});
