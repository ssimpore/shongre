import { describe, expect, it } from "vitest";
import { resolveMarketContext, type MarketContext } from "@shongre/contracts";
import type { SolutionDefinition } from "@shongre/contracts/solutions";
import { DemoSolutionsRepository } from "../../src/infrastructure/database/repositories/solutions.repository.js";
import { SolutionsService } from "../../src/modules/solutions/solutions.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};

function market(hostname: string, pathname: string): MarketContext {
  return resolveMarketContext({ hostname, pathname, infrastructure });
}

const france = market("shongre.fr", "/");
const belgium = market("shongre.com", "/be");
const switzerland = market("shongre.com", "/ch");
const senegal = market("shongre.com", "/sn");
const unknown = market("shongre.com", "/zz");

const seeded: SolutionDefinition = {
  id: "6fb86f78-49aa-4be4-a69f-a3678bd1018a",
  name: "Shongre France",
  slug: "france",
  shortDescription: "Solution disponible en France",
  description: "Solution de test associée uniquement au marché français.",
  icon: "apps",
  category: "Test",
  lifecycle: "AVAILABLE",
  markets: ["FR"],
  languages: ["fr-FR"],
  audiences: ["Professionnels"],
  capabilities: ["Tester"],
  launchApplicationId: "solutions",
  launchPath: "/france",
  requiresAuthentication: false,
  requiresEntitlement: false,
  releaseNotes: [],
  sortOrder: 10,
  catalogVisible: true,
  featured: false,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

const admin: Principal = {
  userId: "2df49f89-80c1-4df6-b437-74e26499d2a1",
  email: "admin@shongre.com",
  role: "admin",
  staffStatus: "active",
  staffRole: "admin",
  capabilities: ["admin.configuration.manage"],
  mfaVerified: true,
  recentlyAuthenticated: true,
};

const createInput = {
  name: "Shongre Multi",
  slug: "multi",
  shortDescription: "Solution multi-marché",
  description: "Solution créée par le test du service de catalogue.",
  icon: "apps" as const,
  category: "Test",
  lifecycle: "COMING_SOON" as const,
  markets: ["FR", "BE", "CH", "SN", "BF"],
  languages: ["fr-FR", "fr-BE", "fr-CH"],
  audiences: ["Professionnels"],
  capabilities: ["Tester"],
  requiresAuthentication: false,
  requiresEntitlement: false,
  releaseNotes: [],
  sortOrder: 20,
  catalogVisible: true,
  featured: false,
};

describe("SolutionsService", () => {
  it("keeps public catalog reads market-scoped across FR, BE and CH", async () => {
    const service = new SolutionsService(new DemoSolutionsRepository([seeded]));
    expect(await service.listPublicSolutions(france, "fr-FR")).toHaveLength(1);
    expect(await service.listPublicSolutions(belgium, "fr-BE")).toEqual([]);
    expect(await service.listPublicSolutions(switzerland, "fr-CH")).toEqual([]);
  });

  it("allows a coming-soon context to read only explicitly associated catalog content", async () => {
    const repository = new DemoSolutionsRepository();
    const service = new SolutionsService(repository);
    await service.createSolution(admin, createInput, "solutions-create-1");
    const values = await service.listPublicSolutions(senegal, "fr-SN");
    expect(values.map((value) => value.slug)).toEqual(["multi"]);
  });

  it("rejects unknown or non-market contexts without a France fallback", async () => {
    const service = new SolutionsService(new DemoSolutionsRepository([seeded]));
    await expect(service.listPublicSolutions(unknown)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("requires active Staff, MFA and recent authentication for writes", async () => {
    const service = new SolutionsService(new DemoSolutionsRepository());
    await expect(
      service.createSolution(
        { ...admin, recentlyAuthenticated: false },
        createInput,
        "solutions-create-2",
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "recent_authentication_required" },
    });
    await expect(
      service.createSolution(
        { ...admin, mfaVerified: false },
        createInput,
        "solutions-create-3",
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "mfa_required" },
    });
  });

  it("replays identical idempotent writes and rejects key reuse with another payload", async () => {
    const repository = new DemoSolutionsRepository();
    const service = new SolutionsService(repository);
    const first = await service.createSolution(
      admin,
      createInput,
      "solutions-create-retry",
    );
    const retry = await service.createSolution(
      admin,
      createInput,
      "solutions-create-retry",
    );
    expect(retry.id).toBe(first.id);
    expect(await service.listAdminSolutions(admin)).toHaveLength(1);
    await expect(
      service.createSolution(
        admin,
        { ...createInput, slug: "different" },
        "solutions-create-retry",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("keeps backend demo mutations deterministic across isolated repositories", async () => {
    const first = await new SolutionsService(
      new DemoSolutionsRepository(),
    ).createSolution(admin, createInput, "solutions-deterministic");
    const second = await new SolutionsService(
      new DemoSolutionsRepository(),
    ).createSolution(admin, createInput, "solutions-deterministic");
    expect(second).toEqual(first);
  });

  it("records lifecycle evidence and serializes reorder validation", async () => {
    const repository = new DemoSolutionsRepository([seeded]);
    const service = new SolutionsService(repository);
    const transitioned = await service.transitionLifecycle(
      admin,
      seeded.id,
      { lifecycle: "DEPRECATED", explanation: "Migration produit validée." },
      "solutions-transition-1",
    );
    expect(transitioned.lifecycle).toBe("DEPRECATED");
    expect(await service.listLifecycleHistory(admin, seeded.id)).toMatchObject([
      { from: "AVAILABLE", to: "DEPRECATED", actorId: admin.userId },
    ]);
    await expect(
      service.reorderSolutions(
        admin,
        { solutionIds: [] },
        "solutions-reorder-1",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("clears optional transport fields without clearing market identity", async () => {
    const repository = new DemoSolutionsRepository([
      {
        ...seeded,
        documentationUrl: "https://docs.shongre.example/france",
        notice: "Information temporaire.",
      },
    ]);
    const service = new SolutionsService(repository);
    const updated = await service.updateSolution(
      admin,
      seeded.id,
      { documentationUrl: null, notice: null },
      "solutions-update-clear",
    );
    expect(updated.documentationUrl).toBeUndefined();
    expect(updated.notice).toBeUndefined();
    expect(updated.markets).toEqual(["FR"]);
  });
});
