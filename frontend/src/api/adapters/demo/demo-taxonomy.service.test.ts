import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { DemoTaxonomyService } from "./demo-taxonomy.service";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};

const france = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure,
});
const belgium = resolveMarketContext({
  hostname: "shongre.com",
  pathname: "/be",
  infrastructure,
});

describe("DemoTaxonomyService header navigation", () => {
  it("persists a minimal admin configuration and publishes only active items", async () => {
    const service = new DemoTaxonomyService();
    const initialFrance = await service.getAdminHeaderNavigation(france);
    const initialBelgium = await service.getAdminHeaderNavigation(belgium);

    const saved = await service.saveHeaderNavigation({
      marketCode: "FR",
      expectedRevision: initialFrance.revision,
      changeReason: "Configuration déterministe du test de navigation.",
      items: [
        { categoryId: "jobs", isActive: false, displayOrder: 0 },
        { categoryId: "real_estate", isActive: true, displayOrder: 1 },
      ],
    });

    expect(saved.items.map((item) => item.categoryId)).toEqual([
      "jobs",
      "real_estate",
    ]);
    expect((await service.getHeaderNavigation(france)).items).toMatchObject([
      { categoryId: "real_estate", displayOrder: 1 },
    ]);
    expect(await service.getAdminHeaderNavigation(belgium)).toEqual(
      initialBelgium,
    );
  });
});
