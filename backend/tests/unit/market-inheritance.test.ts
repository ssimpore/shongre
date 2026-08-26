import { describe, it, expect } from "vitest";
import {
  marketsService,
  CANONICAL_MARKETS,
} from "../../src/modules/markets/markets.service.js";

describe("explicit multi-market configuration", () => {
  it("returns France as the configured default market", async () => {
    const fr = await marketsService.getEffectiveMarketConfig("FR");
    expect(fr.code).toBe("FR");
    expect(fr.currency).toBe("EUR");
    expect(fr.isBaseMarket).toBe(true);
    expect(fr.protectionFeeRate).toBe(0.04);
    expect(fr.protectionFixedFee).toBe(0.7);
  });

  it("correctly resolves Belgian market overrides", async () => {
    const be = await marketsService.getEffectiveMarketConfig("BE");
    expect(be.code).toBe("BE");
    expect(be.protectionFeeRate).toBe(0.045);
    expect(be.protectionFixedFee).toBe(0.8);
    expect(be.currency).toBe("EUR");
    expect(be.isBaseMarket).toBe(false);
  });

  it("fails closed if a market code is unknown", async () => {
    await expect(marketsService.getEffectiveMarketConfig("XX")).rejects.toThrow(
      "Marché introuvable",
    );
  });

  it("handles case-insensitivity on market codes", async () => {
    const ch = await marketsService.getEffectiveMarketConfig("ch");
    expect(ch.code).toBe("CH");
    expect(ch.currency).toBe("CHF");
    expect(ch.protectionFeeRate).toBe(0.035);
  });
});
