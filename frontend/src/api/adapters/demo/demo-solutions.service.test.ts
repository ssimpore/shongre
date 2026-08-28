import { beforeEach, describe, expect, it } from "vitest";
import { DemoSolutionsService } from "./demo-solutions.service";
import { demoSolutionsStore } from "./demo-solutions.store";

const admin = {
  id: "admin-demo",
  name: "Admin Démo",
  canManage: true,
};

describe("DemoSolutionsService", () => {
  beforeEach(() => demoSolutionsStore.reset());

  it("publishes only public lifecycle entries for an eligible market", async () => {
    const service = new DemoSolutionsService();
    const publicSolutions = await service.listPublicSolutions({
      marketCode: "FR",
      language: "fr-FR",
    });
    expect(publicSolutions.map((value) => value.slug)).toEqual([
      "prospects",
      "facturation",
      "marketplace",
      "pilotage",
    ]);
    expect(publicSolutions.some((value) => value.lifecycle === "RETIRED")).toBe(false);
    expect(publicSolutions.some((value) => value.lifecycle === "DRAFT")).toBe(false);
  });

  it("keeps retired and draft entries visible to an authorized admin", async () => {
    const service = new DemoSolutionsService();
    const values = await service.listAdminSolutions(admin);
    expect(values.map((value) => value.lifecycle)).toContain("DRAFT");
    expect(values.map((value) => value.lifecycle)).toContain("RETIRED");
    await expect(
      service.listAdminSolutions({ ...admin, canManage: false }),
    ).rejects.toThrow(/capacité/);
  });

  it("validates creation and available destinations", async () => {
    const service = new DemoSolutionsService();
    await expect(
      service.createSolution(
        {
          name: "Sans destination",
          slug: "sans-destination",
          shortDescription: "Une solution incomplète.",
          description: "Une solution incomplète.",
          icon: "apps",
          category: "Test",
          lifecycle: "AVAILABLE",
          markets: ["FR"],
          languages: ["fr-FR"],
          audiences: ["Professionnels"],
          capabilities: [],
          requiresAuthentication: false,
          requiresEntitlement: false,
          sortOrder: 80,
          featured: false,
        },
        admin,
      ),
    ).rejects.toThrow(/destination/);
  });

  it("creates and edits catalog metadata without mutating fixtures directly", async () => {
    const service = new DemoSolutionsService();
    const created = await service.createSolution(
      {
        name: "Shongre Planning",
        slug: "planning",
        shortDescription: "Planifiez les interventions.",
        description: "Planifiez les interventions de vos équipes par marché.",
        icon: "apps",
        category: "Organisation",
        lifecycle: "DRAFT",
        markets: ["FR", "BE"],
        languages: ["fr-FR", "fr-BE"],
        audiences: ["Équipes terrain"],
        capabilities: ["Planifier une intervention"],
        requiresAuthentication: true,
        requiresEntitlement: true,
        entitlementKey: "solution.planning.access",
        releaseNotes: [],
        sortOrder: 60,
        featured: false,
      },
      admin,
    );
    const updated = await service.updateSolution(
      created.id,
      {
        documentationUrl: "https://docs.shongre.fr/planning",
        featured: true,
        sortOrder: 12,
      },
      admin,
    );
    expect(updated).toMatchObject({
      lifecycle: "DRAFT",
      featured: true,
      sortOrder: 12,
      documentationUrl: "https://docs.shongre.fr/planning",
    });
    expect(await service.getSolutionBySlug("planning")).toBeNull();
  });

  it("rejects unsafe paths, incomplete entitlements and invalid availability", async () => {
    const service = new DemoSolutionsService();
    const facturation = (await service.listAdminSolutions(admin)).find(
      (value) => value.slug === "facturation",
    )!;
    await expect(
      service.updateSolution(
        facturation.id,
        { launchPath: "//evil.example/steal" },
        admin,
      ),
    ).rejects.toThrow(/chemin local sûr/);
    await expect(
      service.updateSolution(
        facturation.id,
        {
          requiresAuthentication: true,
          requiresEntitlement: true,
          entitlementKey: undefined,
        },
        admin,
      ),
    ).rejects.toThrow(/clé d’entitlement/);
    await expect(
      service.updateSolution(
        facturation.id,
        {
          availableFrom: "2026-09-10T00:00:00.000Z",
          availableUntil: "2026-09-01T00:00:00.000Z",
        },
        admin,
      ),
    ).rejects.toThrow(/date de fin/);
  });

  it("requires a public maintenance message and a staged retired reactivation", async () => {
    const service = new DemoSolutionsService();
    const values = await service.listAdminSolutions(admin);
    const facturation = values.find((value) => value.slug === "facturation")!;
    const retired = values.find((value) => value.lifecycle === "RETIRED")!;
    await expect(
      service.transitionLifecycle(facturation.id, "MAINTENANCE", {
        explanation: "Maintenance technique planifiée.",
        actor: admin,
      }),
    ).rejects.toThrow(/explication publique/);
    await service.updateSolution(
      facturation.id,
      { maintenanceMessage: "Maintenance planifiée jusqu’à 16 h." },
      admin,
    );
    await expect(
      service.transitionLifecycle(facturation.id, "MAINTENANCE", {
        explanation: "Maintenance technique planifiée.",
        actor: admin,
      }),
    ).resolves.toMatchObject({ lifecycle: "MAINTENANCE" });
    await expect(
      service.transitionLifecycle(retired.id, "AVAILABLE", {
        explanation: "Demande de réactivation immédiate.",
        actor: admin,
      }),
    ).rejects.toThrow(/brouillon|interne/);
  });

  it("returns null for an unknown public slug and exposes deterministic errors", async () => {
    await expect(
      new DemoSolutionsService().getSolutionBySlug("inconnue"),
    ).resolves.toBeNull();
    await expect(
      new DemoSolutionsService("error").listPublicSolutions(),
    ).rejects.toThrow(/indisponible/);
  });

  it("records deterministic lifecycle history and hides a retired solution", async () => {
    const service = new DemoSolutionsService();
    const facturation = (await service.listAdminSolutions(admin)).find(
      (value) => value.slug === "facturation",
    )!;
    await service.transitionLifecycle(facturation.id, "RETIRED", {
      explanation: "Retrait validé après migration complète.",
      actor: admin,
    });
    expect(await service.getSolutionBySlug("facturation")).toBeNull();
    const history = await service.listLifecycleHistory(facturation.id, admin);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      from: "BETA",
      to: "RETIRED",
      actorName: "Admin Démo",
      occurredAt: "2026-08-28T12:00:00.000Z",
    });
  });

  it.each([
    "empty",
    "maintenance",
    "coming_soon",
    "beta_restricted",
    "entitlement_required",
    "market_unavailable",
    "retired",
    "admin_draft",
  ] as const)("keeps the %s scenario deterministic", async (scenario) => {
    const service = new DemoSolutionsService(scenario);
    expect(await service.listPublicSolutions({ marketCode: "FR" })).toEqual(
      await service.listPublicSolutions({ marketCode: "FR" }),
    );
  });
});
