import { afterEach, describe, expect, it } from "vitest";
import { storageService } from "../../../services/storage.service";
import { DemoMarketsService } from "./demo-markets.service";

describe("DemoMarketsService probable-country scenarios", () => {
  afterEach(() => storageService.setCurrentRole("guest"));

  it("keeps an unknown guest unknown instead of defaulting to France", async () => {
    storageService.setCurrentRole("guest");
    await expect(
      new DemoMarketsService().detectProbableCountry(),
    ).resolves.toMatchObject({
      status: "unknown",
      source: "demo",
      country: null,
      experience: "global_gateway",
    });
  });

  it("returns the same asynchronous configured recommendation every time", async () => {
    const service = new DemoMarketsService({ probableCountryCode: "BE" });
    const first = service.detectProbableCountry();
    expect(first).toBeInstanceOf(Promise);
    await expect(first).resolves.toMatchObject({
      source: "demo",
      country: { code: "BE" },
    });
    await expect(service.detectProbableCountry()).resolves.toMatchObject({
      country: { code: "BE" },
    });
  });

  it("supports a deterministic failure followed by retry success", async () => {
    const service = new DemoMarketsService({
      probableCountryCode: "CH",
      failAttempts: 1,
    });
    await expect(service.detectProbableCountry()).rejects.toThrow(
      "DEMO_MARKET_DETECTION_UNAVAILABLE",
    );
    await expect(service.detectProbableCountry()).resolves.toMatchObject({
      country: { code: "CH" },
    });
  });
});
