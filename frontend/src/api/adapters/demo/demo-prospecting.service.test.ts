import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageService } from "../../../services/storage.service";
import { DemoProspectingService } from "./demo-prospecting.service";
import { DemoCrmService } from "./demo-crm.service";
import type { ProspectDiscoveryRequest } from "@shongre/contracts/prospecting";

const discoveryRequest: ProspectDiscoveryRequest = {
  context: "SUBSCRIBER",
  idempotencyKey: "d0000000-0000-4000-8000-000000000001",
  filters: {
    profileId: "a0000000-0000-4000-8000-000000000001",
    marketCode: "FR",
    countryCode: "FR",
    locale: "fr-FR",
    currency: "EUR",
    timezone: "Europe/Paris",
    industries: [],
    taxonomySlugs: [],
    companyTypes: [],
    freshness: [],
    sourceIds: ["demo_authorized_registry"],
    limit: 20,
  },
};

describe("DemoProspectingService", () => {
  beforeEach(() => storageService.setCurrentUserKey("pro_atelier"));
  afterEach(() => storageService.setCurrentUserKey("guest"));

  it("returns deterministic, evidenced and market-scoped prospects", async () => {
    const service = new DemoProspectingService();
    const first = await service.discover(discoveryRequest);
    const second = await service.discover(discoveryRequest);

    expect(second).toEqual(first);
    expect(first.items).toHaveLength(2);
    expect(
      first.items.every((item) => item.company.marketCodes.includes("FR")),
    ).toBe(true);
    expect(first.items.every((item) => item.evidence.length > 0)).toBe(true);
    expect(first.items.every((item) => item.humanReviewRequired)).toBe(true);
  });

  it("matches pluralized discovery examples and exposes standalone packaging", async () => {
    const service = new DemoProspectingService();
    storageService.setCurrentUserKey("standalone_trial_owner");
    const result = await service.discover({
      ...discoveryRequest,
      filters: {
        ...discoveryRequest.filters,
        query: "Ateliers automobiles",
      },
    });
    const usage = await service.getUsage("FR");

    expect(result.items.map((item) => item.company.canonicalName)).toContain(
      "Atelier Horizon Mobilité",
    );
    expect(usage.accessMode).toBe("STANDALONE");
    expect(usage.planName).toBe("Prospects Growth · Démo");
  });

  it("keeps profile mutations isolated to the signed-in account", async () => {
    const service = new DemoProspectingService();
    const input = {
      name: "Profil atelier",
      description: "Test d’isolation",
      context: "SUBSCRIBER" as const,
      marketCodes: ["FR"],
      locale: "fr-FR",
      currency: "EUR",
      timezone: "Europe/Paris",
      geographicAreas: [],
      industries: ["Automobile"],
      taxonomySlugs: [],
      companyTypes: [],
      businessMaturity: [],
      onlinePresence: [],
      targetRoles: [],
      fitRules: [],
      exclusionRules: [],
      requiredSignals: [],
      optionalSignals: [],
      isDefault: false,
    };

    await service.createProfile(input);
    expect(await service.listProfiles()).toHaveLength(2);

    storageService.setCurrentUserKey("pro_auto_michel");
    const otherTenantProfiles = await service.listProfiles();
    expect(otherTenantProfiles).toHaveLength(1);
    expect(otherTenantProfiles[0].name).not.toBe(input.name);
  });

  it("returns the same import result for a repeated idempotency key", async () => {
    const service = new DemoProspectingService("duplicates_found");
    const result = await service.discover(discoveryRequest);
    const duplicate = result.items.find(
      (item) => item.company.reviewState === "DUPLICATE_REVIEW",
    );
    expect(duplicate).toBeDefined();

    const request = {
      companyId: duplicate!.company.id,
      expectedEvidenceIds: duplicate!.evidence.map((item) => item.id),
      reviewDecision: "APPROVED" as const,
      idempotencyKey: "d0000000-0000-4000-8000-000000000002",
    };
    const first = await service.importCandidate(request);
    const second = await service.importCandidate(request);

    expect(second).toEqual(first);
    expect(first.duplicateDetected).toBe(true);
    expect(first.provenancePreserved).toBe(true);
  });

  it("fails closed when the authorized source is disconnected", async () => {
    const service = new DemoProspectingService("source_disconnected");
    await expect(service.discover(discoveryRequest)).rejects.toThrow(
      "Aucune source de découverte autorisée",
    );
  });

  it("fails closed for permission-restricted usage and discovery reads", async () => {
    const service = new DemoProspectingService("permission_denied");

    await expect(service.getUsage("FR")).rejects.toThrow("droits nécessaires");
    await expect(service.discover(discoveryRequest)).rejects.toThrow(
      "droits nécessaires",
    );
  });

  it("rejects an import when the reviewed evidence snapshot is incomplete", async () => {
    const service = new DemoProspectingService();
    const result = await service.discover(discoveryRequest);

    await expect(
      service.importCandidate({
        companyId: result.items[0].company.id,
        expectedEvidenceIds: [],
        reviewDecision: "APPROVED",
        idempotencyKey: "d0000000-0000-4000-8000-000000000007",
      }),
    ).rejects.toThrow("preuves ont changé");
  });

  it("converts an approved discovery into the shared CRM account, pipeline, task and activity stores", async () => {
    const crm = new DemoCrmService();
    const service = new DemoProspectingService("prospects_default", { crm });
    const result = await service.discover({
      ...discoveryRequest,
      filters: {
        ...discoveryRequest.filters,
        query: "Ateliers automobiles",
      },
    });
    const candidate = result.items[0];
    const imported = await service.importCandidate({
      companyId: candidate.company.id,
      expectedEvidenceIds: candidate.evidence.map((item) => item.id),
      reviewDecision: "APPROVED",
      idempotencyKey: "d0000000-0000-4000-8000-000000000003",
    });

    const [accounts, opportunities, tasks] = await Promise.all([
      crm.listAccounts({ limit: 100 }),
      crm.listOpportunities({ limit: 100 }),
      crm.listTasks({ limit: 100 }),
    ]);
    const account = accounts.items.find(
      (item) => item.id === imported.crmAccountId,
    );
    const opportunity = opportunities.items.find(
      (item) => item.sourceDetail === `prospect:${candidate.company.id}`,
    );
    const accountActivities = await crm.listActivities(
      "account",
      imported.crmAccountId,
    );

    expect(account).toMatchObject({
      name: candidate.company.canonicalName,
      marketCode: "FR",
      lifecycle: "prospect",
      source: "ai_research",
    });
    expect(opportunity).toMatchObject({
      accountId: imported.crmAccountId,
      status: "open",
      amount: { amountMinor: 0, currency: "EUR" },
    });
    expect(
      tasks.items.some((item) => item.opportunityId === opportunity?.id),
    ).toBe(true);
    expect(
      accountActivities.some(
        (item) => item.title === "Prospect ajouté depuis Découvrir",
      ),
    ).toBe(true);
  });

  it("uses the active market currency and rejects a coming-soon market", async () => {
    const crm = new DemoCrmService();
    const service = new DemoProspectingService("prospects_default", { crm });
    const swissDiscovery = await service.discover({
      ...discoveryRequest,
      idempotencyKey: "d0000000-0000-4000-8000-000000000004",
      filters: {
        ...discoveryRequest.filters,
        marketCode: "CH",
        countryCode: "CH",
        locale: "fr-CH",
        currency: "CHF",
        timezone: "Europe/Zurich",
      },
    });
    await service.importCandidate({
      companyId: swissDiscovery.items[0].company.id,
      expectedEvidenceIds: swissDiscovery.items[0].evidence.map(
        (item) => item.id,
      ),
      reviewDecision: "APPROVED",
      idempotencyKey: "d0000000-0000-4000-8000-000000000005",
    });
    const opportunities = await crm.listOpportunities({ limit: 100 });
    expect(
      opportunities.items.find(
        (item) =>
          item.sourceDetail ===
          `prospect:${swissDiscovery.items[0].company.id}`,
      )?.amount.currency,
    ).toBe("CHF");

    await expect(
      service.discover({
        ...discoveryRequest,
        idempotencyKey: "d0000000-0000-4000-8000-000000000006",
        filters: {
          ...discoveryRequest.filters,
          marketCode: "SN",
          countryCode: "SN",
          locale: "fr-SN",
          currency: "XOF",
          timezone: "Africa/Dakar",
        },
      }),
    ).rejects.toThrow("n’est pas disponible sur ce marché");
  });

  it("keeps CRM mutations isolated when the demo account changes", async () => {
    const crm = new DemoCrmService();
    await crm.createAccount({
      name: "Entreprise privée du tenant A",
      country: "FR",
      marketCode: "FR",
    });
    expect(
      (await crm.listAccounts({ query: "Entreprise privée" })).items,
    ).toHaveLength(1);

    storageService.setCurrentUserKey("pro_auto_michel");
    expect(
      (await crm.listAccounts({ query: "Entreprise privée" })).items,
    ).toHaveLength(0);
  });
});
