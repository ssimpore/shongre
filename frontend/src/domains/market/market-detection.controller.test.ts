import { describe, expect, it } from "vitest";
import {
  resolveCountryRecommendation,
  type MarketDetectionRecommendation,
} from "@shongre/contracts";
import { resolveMarketDetectionOutcome } from "./market-detection.policy";

const recommendation = (countryCode: string | null) =>
  resolveCountryRecommendation({
    countryCode,
    source: "demo",
    confidence: "high",
  });

describe("market detection UI policy", () => {
  it("turns a host-country mismatch into a recommendation, never navigation", () => {
    expect(
      resolveMarketDetectionOutcome({
        recommendation: recommendation("BE"),
        currentCountryCode: "FR",
      }),
    ).toMatchObject({
      kind: "recommendation",
      recommendation: { country: { code: "BE" } },
    });
  });

  it("does nothing when detection matches the canonical request context", () => {
    expect(
      resolveMarketDetectionOutcome({
        recommendation: recommendation("CH"),
        currentCountryCode: "CH",
      }),
    ).toEqual({ kind: "none" });
  });

  it("does not repeat a market-scoped recommendation the user declined", () => {
    expect(
      resolveMarketDetectionOutcome({
        recommendation: recommendation("BE"),
        currentCountryCode: "FR",
        declinedCountryCode: "BE",
      }),
    ).toEqual({ kind: "none" });
  });

  it("allows coming-soon countries to reach their safe launch experience", () => {
    expect(
      resolveMarketDetectionOutcome({
        recommendation: recommendation("SN"),
        currentCountryCode: "FR",
      }),
    ).toMatchObject({
      kind: "recommendation",
      recommendation: { experience: "coming_soon" },
    });
  });

  it("requires the selector for unknown or unavailable countries", () => {
    expect(
      resolveMarketDetectionOutcome({
        recommendation: recommendation(null),
        currentCountryCode: "FR",
      }),
    ).toEqual({ kind: "country_selection_required", reason: "unknown" });

    const unavailable: MarketDetectionRecommendation = {
      ...recommendation("BE"),
      experience: "unavailable",
    };
    expect(
      resolveMarketDetectionOutcome({
        recommendation: unavailable,
        currentCountryCode: "FR",
      }),
    ).toEqual({ kind: "country_selection_required", reason: "unavailable" });
  });
});
