import { describe, expect, it } from "vitest";
import { DemoAdminService } from "./demo-admin.service";

describe("DemoAdminService discovery administration", () => {
  it("keeps drafts inactive and validates every published policy", async () => {
    const service = new DemoAdminService();
    const initial = await service.getDiscoveryConfiguration("FR");
    const edited = {
      ...initial,
      weights: {
        ...initial.weights,
        relevance: initial.weights.relevance + 0.01,
        quality: initial.weights.quality - 0.01,
      },
    };
    const draft = await service.saveDiscoveryConfiguration(
      edited,
      "Ajustement de test",
      false,
    );
    expect(draft.version).not.toBe(initial.version);
    expect((await service.getDiscoveryConfiguration("FR")).version).toBe(
      initial.version,
    );

    const published = await service.saveDiscoveryConfiguration(
      edited,
      "Activation de test",
      true,
    );
    expect((await service.getDiscoveryConfiguration("FR")).version).toBe(
      published.version,
    );
  });

  it("rejects a sponsored share that could crowd out organic results", async () => {
    const service = new DemoAdminService();
    const initial = await service.getDiscoveryConfiguration("FR");
    await expect(
      service.saveDiscoveryConfiguration(
        { ...initial, sponsored: { ...initial.sponsored, maxShare: 0.8 } },
        "Politique sponsorisée invalide",
        true,
      ),
    ).rejects.toBeTruthy();
  });
});
