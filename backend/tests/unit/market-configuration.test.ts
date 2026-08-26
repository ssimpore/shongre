import { describe, expect, it } from "vitest";
import { DemoMarketRepository } from "../../src/infrastructure/database/repositories/market.repository.js";
import { MarketsService } from "../../src/modules/markets/markets.service.js";

describe("country administration release gates", () => {
  it("rejects activation until required legal review is approved", async () => {
    const service = new MarketsService(new DemoMarketRepository());

    await expect(
      service.updateCountryConfiguration(
        "SN",
        { launchStatus: "active" },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toThrow("revue juridique");
  });

  it("rejects duplicate canonical domain/path combinations", async () => {
    const service = new MarketsService(new DemoMarketRepository());

    await expect(
      service.updateCountryConfiguration(
        "CH",
        { canonicalDomainMode: "international", basePath: "/be" },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toThrow("déjà utilisée");
  });
});
