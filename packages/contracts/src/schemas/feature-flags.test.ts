import { describe, expect, it } from "vitest";
import { DELIVERY_FEATURE_FLAG_KEY } from "./delivery";
import { resolveFeatureFlagEvaluation } from "./feature-flags";

const definition = {
  key: DELIVERY_FEATURE_FLAG_KEY,
  description: "Delivery marketplace scoped activation.",
  owner: "Marketplace Operations",
  defaultEnabled: false,
  exposure: "public" as const,
  lifecycle: "active" as const,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

describe("market-only feature flags", () => {
  it("ignores a global rule even when it enables every cohort", () => {
    const result = resolveFeatureFlagEvaluation({
      key: definition.key,
      definition,
      rules: [
        {
          id: "global",
          flagKey: definition.key,
          enabled: true,
          rolloutPercentage: 100,
          priority: 100,
          reason: "An invalid global activation must be ignored.",
          createdAt: definition.createdAt,
          updatedAt: definition.updatedAt,
        },
      ],
      context: { marketCode: "FR" },
      evaluatedAt: definition.updatedAt,
    });
    expect(result.enabled).toBe(false);
    expect(result.source).toBe("safe_default");
  });

  it("accepts only the exact market rule", () => {
    const result = resolveFeatureFlagEvaluation({
      key: definition.key,
      definition,
      rules: [
        {
          id: "fr",
          flagKey: definition.key,
          marketCode: "FR",
          enabled: true,
          rolloutPercentage: 100,
          priority: 100,
          reason: "Operations approved this exact market activation.",
          createdAt: definition.createdAt,
          updatedAt: definition.updatedAt,
        },
      ],
      context: { marketCode: "FR" },
      evaluatedAt: definition.updatedAt,
    });
    expect(result.enabled).toBe(true);
    expect(result.ruleId).toBe("fr");
  });
});
