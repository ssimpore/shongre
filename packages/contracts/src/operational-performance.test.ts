import { describe, expect, it } from "vitest";
import {
  SHONGRE_PERFORMANCE_BUDGETS,
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS,
} from "./operational-performance";

describe("operational performance contract", () => {
  it("keeps good Core Web Vital thresholds and API launch objectives explicit", () => {
    expect(SHONGRE_PERFORMANCE_BUDGETS.webVitals).toEqual({
      lcpGoodMs: 2_500,
      inpGoodMs: 200,
      clsGood: 0.1,
      ttfbGoodMs: 800,
    });
    expect(SHONGRE_PERFORMANCE_BUDGETS.api.monthlyAvailability).toBe(0.999);
  });

  it("bounds shared caching while retaining stale-if-error resilience", () => {
    for (const policy of Object.values(
      SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.publicCache,
    )) {
      if (typeof policy === "string") continue;
      expect(policy.sharedMaxAgeSeconds).toBeGreaterThanOrEqual(0);
      expect(policy.staleWhileRevalidateSeconds).toBeGreaterThanOrEqual(
        policy.sharedMaxAgeSeconds,
      );
      expect(policy.staleIfErrorSeconds).toBeGreaterThanOrEqual(
        policy.sharedMaxAgeSeconds,
      );
    }
  });

  it("keeps database and pool warning budgets below API failure budgets", () => {
    expect(
      SHONGRE_PERFORMANCE_BUDGETS.database.interactiveQueryP95Ms,
    ).toBeLessThan(SHONGRE_PERFORMANCE_BUDGETS.api.p95Ms);
    expect(
      SHONGRE_PERFORMANCE_BUDGETS.database.poolSaturationWarningRatio,
    ).toBeLessThan(1);
    expect(
      SHONGRE_PERFORMANCE_BUDGETS.cache.referenceMinimumHitRatio,
    ).toBeGreaterThan(
      SHONGRE_PERFORMANCE_BUDGETS.cache.discoveryMinimumHitRatio,
    );
  });
});
