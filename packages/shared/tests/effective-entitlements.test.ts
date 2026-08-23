import { describe, expect, it } from "vitest";
import type { ActiveEntitlement } from "@shongre/contracts";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  resolveAllEffectiveEntitlements,
  resolveEffectiveEntitlementsForVertical,
} from "../src/monetization/effective-entitlements";

const NOW = new Date("2026-08-23T12:00:00.000Z");

function grant(
  id: string,
  productId: string,
  key: string,
  value: ActiveEntitlement["value"],
  verticalId?: ActiveEntitlement["verticalId"],
  mergePolicy?: ActiveEntitlement["mergePolicy"],
): ActiveEntitlement {
  return {
    id,
    accountId: "pro_1",
    productId,
    key,
    value,
    startsAt: "2026-08-01T00:00:00.000Z",
    status: "active",
    ...(verticalId ? { verticalId } : {}),
    ...(mergePolicy ? { mergePolicy } : {}),
  };
}

describe("effective entitlement resolution", () => {
  it("does not leak Auto entitlements into Immo", () => {
    const resolved = resolveEffectiveEntitlementsForVertical({
      catalog: BASELINE_MONETIZATION_CATALOG,
      entitlements: [
        grant("auto", "auto.dealer.growth", "maxActiveVehicles", 120, "auto"),
        grant("immo", "immo.agency.starter", "maxActiveListings", 25, "immo"),
      ],
      verticalId: "immo",
      at: NOW,
    });

    expect(resolved.find((entry) => entry.key === "maxActiveVehicles")).toBeUndefined();
    expect(resolved.find((entry) => entry.key === "maxActiveListings")?.value).toBe(25);
  });

  it("composes generic and scoped quotas with max semantics", () => {
    const resolved = resolveEffectiveEntitlementsForVertical({
      catalog: BASELINE_MONETIZATION_CATALOG,
      entitlements: [
        grant("generic", "plan.pro.business", "teamMembers", 5),
        grant("auto", "auto.dealer.growth", "teamMembers", 12, "auto", "max"),
      ],
      verticalId: "auto",
      at: NOW,
    });

    expect(resolved.find((entry) => entry.key === "teamMembers")?.value).toBe(12);
  });

  it("adds scoped add-on quantities and ORs feature flags", () => {
    const resolved = resolveEffectiveEntitlementsForVertical({
      catalog: BASELINE_MONETIZATION_CATALOG,
      entitlements: [
        grant("seat_1", "employment.addon.seat", "additionalRecruiterSeats", 1, "emploi", "additive"),
        grant("seat_2", "employment.addon.seat", "additionalRecruiterSeats", 2, "emploi", "additive"),
        grant("base", "employment.employer.starter", "advancedAnalytics", false, "emploi", "boolean_or"),
        grant("addon", "employment.addon.analytics", "advancedAnalytics", true, "emploi", "boolean_or"),
      ],
      verticalId: "emploi",
      at: NOW,
    });

    expect(resolved.find((entry) => entry.key === "additionalRecruiterSeats")?.value).toBe(3);
    expect(resolved.find((entry) => entry.key === "advancedAnalytics")?.value).toBe(true);
  });

  it("returns distinct composed views for each purchased vertical", () => {
    const resolved = resolveAllEffectiveEntitlements({
      catalog: BASELINE_MONETIZATION_CATALOG,
      entitlements: [
        grant("generic", "plan.pro.starter", "teamMembers", 1),
        grant("auto", "auto.dealer.starter", "maxActiveVehicles", 25, "auto"),
        grant("immo", "immo.agency.starter", "maxActiveListings", 25, "immo"),
      ],
      at: NOW,
    });

    expect(resolved.some((entry) => entry.verticalId === "auto" && entry.key === "teamMembers")).toBe(true);
    expect(resolved.some((entry) => entry.verticalId === "immo" && entry.key === "maxActiveVehicles")).toBe(false);
  });
});
