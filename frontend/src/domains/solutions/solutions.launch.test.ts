import { describe, expect, it } from "vitest";
import { createApplicationRegistry } from "../../platform/applications/application-registry";
import { DEMO_SOLUTIONS } from "../../api/adapters/demo/demo-solutions.data";
import { resolveSolutionLaunch } from "./solutions.launch";

const applications = createApplicationRegistry({
  environment: "test",
  marketplaceOrigin: "http://localhost:3000",
});

const facturation = structuredClone(
  DEMO_SOLUTIONS.find((value) => value.slug === "facturation")!,
);

describe("resolveSolutionLaunch", () => {
  it("resolves a safe local application target", () => {
    expect(
      resolveSolutionLaunch({
        solution: facturation,
        marketCode: "FR",
        user: null,
        applications,
      }),
    ).toMatchObject({
      allowed: true,
      reason: "READY",
      href: "/facturation",
    });
  });

  it("blocks launch for maintenance, market and entitlement conditions", () => {
    expect(
      resolveSolutionLaunch({
        solution: {
          ...facturation,
          lifecycle: "MAINTENANCE",
          maintenanceMessage: "Maintenance planifiée.",
        },
        marketCode: "FR",
        user: null,
        applications,
      }).reason,
    ).toBe("MAINTENANCE");
    expect(
      resolveSolutionLaunch({
        solution: facturation,
        marketCode: "SN",
        user: null,
        applications,
      }).reason,
    ).toBe("MARKET_UNAVAILABLE");
    expect(
      resolveSolutionLaunch({
        solution: {
          ...facturation,
          requiresAuthentication: true,
          requiresEntitlement: true,
        },
        marketCode: "FR",
        user: {
          id: "pro",
          email: "pro@example.test",
          name: "Pro Test",
          accountType: "professional",
          role: "pro_seller",
          sellerType: "pro",
          enabledProducts: ["marketplace"],
          isVerified: true,
          city: "Paris",
          postalCode: "75001",
          createdAt: "2026-01-01T00:00:00Z",
          rating: 0,
          reviewCount: 0,
          responseRatePercent: 0,
          responseTimeText: "—",
        },
        applications,
      }).reason,
    ).toBe("ENTITLEMENT_REQUIRED");
  });

  it("never launches coming-soon or retired entries", () => {
    expect(
      resolveSolutionLaunch({
        solution: { ...facturation, lifecycle: "COMING_SOON" },
        marketCode: "FR",
        user: null,
        applications,
      }).reason,
    ).toBe("COMING_SOON");
    expect(
      resolveSolutionLaunch({
        solution: { ...facturation, lifecycle: "RETIRED" },
        marketCode: "FR",
        user: null,
        applications,
      }).reason,
    ).toBe("RETIRED");
  });

  it("requires authentication before evaluating a restricted beta", () => {
    expect(
      resolveSolutionLaunch({
        solution: {
          ...facturation,
          lifecycle: "BETA",
          requiresAuthentication: true,
          requiresEntitlement: true,
        },
        marketCode: "FR",
        user: null,
        applications,
      }).reason,
    ).toBe("AUTHENTICATION_REQUIRED");
  });

  it("fails closed for a malicious or malformed launch path", () => {
    expect(
      resolveSolutionLaunch({
        solution: {
          ...facturation,
          launchPath: "//evil.example/steal-session",
        },
        marketCode: "FR",
        user: null,
        applications,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "DESTINATION_UNAVAILABLE",
    });
  });

  it("keeps internal entries restricted to Shongre staff", () => {
    expect(
      resolveSolutionLaunch({
        solution: { ...facturation, lifecycle: "INTERNAL" },
        marketCode: "FR",
        user: null,
        applications,
      }).reason,
    ).toBe("ACCESS_RESTRICTED");
  });
});
