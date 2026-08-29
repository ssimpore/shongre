import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { DemoTaxonomyRepository } from "../../src/infrastructure/database/repositories/taxonomy.repository.js";
import { TaxonomyService } from "../../src/modules/taxonomy/taxonomy.service.js";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};

const context = (marketCode: "FR" | "BE" | "SN") =>
  resolveMarketContext({
    hostname: marketCode === "FR" ? "shongre.fr" : "shongre.com",
    pathname: marketCode === "FR" ? "/" : `/${marketCode.toLowerCase()}`,
    infrastructure,
  });

describe("taxonomy header navigation", () => {
  it("persists selection, activation, and order without changing the taxonomy", async () => {
    const service = new TaxonomyService(new DemoTaxonomyRepository());
    const france = context("FR");
    const initial = await service.getHeaderNavigation(france, true);

    const saved = await service.saveHeaderNavigation(
      {
        marketCode: "FR",
        expectedRevision: initial.revision,
        changeReason: "Test de sélection et d’ordre de la barre d’en-tête.",
        items: [
          { categoryId: "jobs", isActive: false, displayOrder: 0 },
          { categoryId: "vehicles", isActive: true, displayOrder: 1 },
        ],
      },
      {
        marketContext: france,
        actorProfileId: "admin-profile",
        requestId: "req-taxonomy-header",
      },
    );

    expect(saved.revision).toBe(initial.revision + 1);
    expect(saved.items.map((item) => item.categoryId)).toEqual([
      "jobs",
      "vehicles",
    ]);
    expect(saved.items[0]?.isActive).toBe(false);
    expect((await service.getHeaderNavigation(france)).items).toMatchObject([
      { categoryId: "vehicles", displayOrder: 1 },
    ]);
    expect(await service.getNodeById("jobs")).not.toBeNull();
  });

  it("isolates configurations by market and rejects stale revisions", async () => {
    const service = new TaxonomyService(new DemoTaxonomyRepository());
    const france = context("FR");
    const belgium = context("BE");
    const initialFrance = await service.getHeaderNavigation(france, true);
    const initialBelgium = await service.getHeaderNavigation(belgium, true);

    await service.saveHeaderNavigation(
      {
        marketCode: "FR",
        expectedRevision: initialFrance.revision,
        changeReason: "Test de séparation de la configuration française.",
        items: [{ categoryId: "vehicles", isActive: true, displayOrder: 0 }],
      },
      { marketContext: france, actorProfileId: "admin-profile" },
    );

    expect(await service.getHeaderNavigation(belgium, true)).toEqual(
      initialBelgium,
    );
    await expect(
      service.saveHeaderNavigation(
        {
          marketCode: "FR",
          expectedRevision: initialFrance.revision,
          changeReason: "Cette révision est désormais volontairement obsolète.",
          items: [{ categoryId: "jobs", isActive: true, displayOrder: 0 }],
        },
        { marketContext: france, actorProfileId: "admin-profile" },
      ),
    ).rejects.toThrow(/revision conflict/i);
  });

  it("rejects nested categories and active categories in a coming-soon market", async () => {
    const service = new TaxonomyService(new DemoTaxonomyRepository());
    const france = context("FR");
    const senegal = context("SN");

    await expect(
      service.saveHeaderNavigation(
        {
          marketCode: "FR",
          expectedRevision: 1,
          changeReason: "Tentative invalide avec une sous-catégorie imbriquée.",
          items: [
            {
              categoryId: "vehicles.cars",
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
        { marketContext: france, actorProfileId: "admin-profile" },
      ),
    ).rejects.toThrow(/catégories racines/i);

    await expect(
      service.saveHeaderNavigation(
        {
          marketCode: "SN",
          expectedRevision: 0,
          changeReason: "Tentative invalide avant l’ouverture du marché.",
          items: [{ categoryId: "vehicles", isActive: true, displayOrder: 0 }],
        },
        { marketContext: senegal, actorProfileId: "admin-profile" },
      ),
    ).rejects.toThrow(/enabled in the selected market/i);

    await expect(service.getHeaderNavigation(senegal)).rejects.toThrow(
      /pas encore ouvert/i,
    );
  });
});
