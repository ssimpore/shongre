import { beforeEach, describe, expect, it } from "vitest";
import {
  deepMergeOverrides,
  MarketResolver,
} from "./market.resolver";
import type { Market } from "./market.types";
import { INITIAL_MARKETS } from "./market.defaults";

describe("explicit multi-market policy resolver", () => {
  let resolver: MarketResolver;
  let france: Market;
  let belgium: Market;
  let spain: Market;

  beforeEach(() => {
    resolver = new MarketResolver();
    const clone = (code: string) =>
      structuredClone(INITIAL_MARKETS.find((market) => market.code === code)!);
    france = clone("FR");
    belgium = clone("BE");
    spain = clone("ES");
  });

  it("resolves a complete local Belgium policy", () => {
    const config = resolver.resolveEffectiveConfig(belgium, france);
    expect(config.localization.phonePrefix).toBe("+32");
    expect(config.localization.defaultLocale).toBe("fr-BE");
    expect(config.taxes.vatRateStandard).toBe(0.21);
    expect(config.payments.buyerProtectionFixedFee).toBe(0.8);
  });

  it("does not propagate a default-market change into Belgium", () => {
    const originalBelgianLimit =
      belgium.configuration.listings.maxActiveListingsIndividual;
    france.configuration.listings.maxActiveListingsIndividual = 35;

    expect(
      resolver.resolveEffectiveConfig(belgium, france).listings
        .maxActiveListingsIndividual,
    ).toBe(originalBelgianLimit);
  });

  it("preserves explicit false and zero values", () => {
    spain.configuration.reservation.enabled = false;
    belgium.configuration.listings.maxActiveListingsIndividual = 0;
    belgium.configuration.payments.buyerProtectionFixedFee = 0;

    expect(resolver.resolveEffectiveConfig(spain).reservation.enabled).toBe(
      false,
    );
    const be = resolver.resolveEffectiveConfig(belgium);
    expect(be.listings.maxActiveListingsIndividual).toBe(0);
    expect(be.payments.buyerProtectionFixedFee).toBe(0);
  });

  it("keeps granular object merging available for seed/data migration only", () => {
    const result = deepMergeOverrides(
      { enabled: true, nested: { count: 2, label: "base" } },
      { enabled: false, nested: { count: 0 } },
    );
    expect(result).toEqual({
      enabled: false,
      nested: { count: 0, label: "base" },
    });
  });

  it("reports local provenance and a baseline value only for comparison", () => {
    const resolution = resolver.resolveSetting<number>(
      belgium,
      france,
      "taxes.vatRateStandard",
    );
    expect(resolution).toMatchObject({
      value: 0.21,
      source: "LOCAL",
      sourceMarketCode: "BE",
      isInherited: false,
      overrideDefined: true,
      baselineReferenceValue: 0.2,
    });
  });

  it("reports 100% explicit coverage and no cross-market impact", () => {
    const metrics = resolver.getInheritanceMetrics(belgium, france);
    expect(metrics.percentInherited).toBe(0);
    expect(metrics.percentOverridden).toBe(100);
    expect(
      resolver.getImpactedMarkets("reservation.enabled", [france, belgium]),
    ).toEqual([]);
  });
});
