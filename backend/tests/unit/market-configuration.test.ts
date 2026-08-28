import { describe, expect, it } from "vitest";
import { DemoMarketRepository } from "../../src/infrastructure/database/repositories/market.repository.js";
import { MarketsService } from "../../src/modules/markets/markets.service.js";

describe("country administration release gates", () => {
  it("rejects activation until required legal review is approved", async () => {
    const service = new MarketsService(new DemoMarketRepository());

    await expect(
      service.updateCountryConfiguration(
        "SN",
        {
          expectedVersion: 1,
          reason: "Activation du marché sénégalais",
          patch: { launchStatus: "active" },
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toThrow("revue juridique");
  });

  it("rejects duplicate canonical domain/path combinations", async () => {
    const service = new MarketsService(new DemoMarketRepository());

    await expect(
      service.updateCountryConfiguration(
        "CH",
        {
          expectedVersion: 1,
          reason: "Modification du routage canonique",
          patch: { canonicalDomainMode: "international", basePath: "/be" },
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toThrow("déjà utilisée");
  });

  it("requires a second actor and applies an approved version once", async () => {
    const service = new MarketsService(new DemoMarketRepository());
    const request = await service.updateCountryConfiguration(
      "BE",
      {
        expectedVersion: 1,
        reason: "Pause opérateur pour maintenance",
        patch: { launchStatus: "paused" },
      },
      "00000000-0000-4000-8000-000000000001",
    );
    await expect(
      service.approveCountryConfigurationChange(
        request.id,
        "00000000-0000-4000-8000-000000000001",
        { reason: "Approbation de la maintenance" },
      ),
    ).rejects.toThrow("four-eyes");
    const updated = await service.approveCountryConfigurationChange(
      request.id,
      "00000000-0000-4000-8000-000000000002",
      { reason: "Approbation de la maintenance" },
    );
    expect(updated.launchStatus).toBe("paused");
    expect(updated.version).toBe(2);
  });
});
