import { describe, expect, it } from "vitest";
import type { UserProfile } from "../types";
import { ROUTE_POLICIES, canAccessRoutePolicy } from "./access-policy.registry";

const persona = (overrides: Partial<UserProfile>): UserProfile =>
  ({
    id: "persona",
    email: "persona@example.test",
    name: "Persona",
    role: "buyer",
    primaryRole: "buyer",
    accountType: "individual",
    status: "active",
    ...overrides,
  }) as UserProfile;

describe("protected route policy registry", () => {
  it("classifies every protected route with an account family", () => {
    expect(Object.keys(ROUTE_POLICIES).length).toBeGreaterThan(50);
    Object.values(ROUTE_POLICIES).forEach((policy) => {
      expect(policy.path.startsWith("/")).toBe(true);
      expect(policy.accountTypes.length).toBeGreaterThan(0);
    });
  });

  it("adds Staff tools without replacing the customer's account workspace", () => {
    const individual = persona({});
    const admin = persona({
      accountType: "individual",
      staffStatus: "active",
      role: "admin",
      primaryRole: "admin",
      staffRole: "admin",
    });
    expect(canAccessRoutePolicy(individual, "accountOverview")).toBe(true);
    expect(canAccessRoutePolicy(individual, "adminOverview")).toBe(false);
    expect(canAccessRoutePolicy(admin, "adminOverview")).toBe(true);
    expect(canAccessRoutePolicy(admin, "accountOverview")).toBe(true);
  });

  it("keeps professional workspaces vertical-specific", () => {
    const automotive = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "automotive",
    });
    expect(canAccessRoutePolicy(automotive, "accountAuto")).toBe(true);
    expect(canAccessRoutePolicy(automotive, "accountRealEstate")).toBe(false);
    expect(canAccessRoutePolicy(automotive, "accountCourse")).toBe(false);
    expect(canAccessRoutePolicy(automotive, "accountEmploymentCandidate")).toBe(
      false,
    );
    expect(canAccessRoutePolicy(automotive, "accountListings")).toBe(false);
    expect(canAccessRoutePolicy(automotive, "accountProDashboard")).toBe(false);
    expect(canAccessRoutePolicy(automotive, "accountProSubscriptions")).toBe(
      true,
    );
  });

  it("keeps generic professional inventory out of specialized workspaces", () => {
    const generic = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "generic",
    });
    expect(canAccessRoutePolicy(generic, "accountListings")).toBe(true);
    expect(canAccessRoutePolicy(generic, "accountProDashboard")).toBe(true);
    expect(canAccessRoutePolicy(generic, "accountAuto")).toBe(false);
    expect(canAccessRoutePolicy(generic, "accountRealEstate")).toBe(false);
  });

  it("requires the commercial product entitlement as well as the functional permission", () => {
    const prospectsOnly = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "generic",
      enabledProducts: ["prospects"],
    });
    const facturationOnly = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "generic",
      enabledProducts: ["facturation"],
    });
    const both = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "generic",
      enabledProducts: ["prospects", "facturation"],
    });

    expect(canAccessRoutePolicy(prospectsOnly, "standaloneInvoicing")).toBe(
      false,
    );
    expect(canAccessRoutePolicy(facturationOnly, "standaloneInvoicing")).toBe(
      true,
    );
    expect(canAccessRoutePolicy(facturationOnly, "standaloneProspects")).toBe(
      false,
    );
    expect(canAccessRoutePolicy(both, "standaloneInvoicing")).toBe(true);
    expect(canAccessRoutePolicy(both, "standaloneProspects")).toBe(true);
  });

  it("keeps admin, moderation and finance routes least-privilege", () => {
    const admin = persona({
      accountType: "individual",
      staffStatus: "active",
      role: "admin",
      primaryRole: "admin",
      staffRole: "admin",
    });
    const moderator = persona({
      accountType: "individual",
      staffStatus: "active",
      role: "moderator",
      primaryRole: "moderator",
      staffRole: "moderator",
    });
    const finance = persona({
      accountType: "individual",
      staffStatus: "active",
      role: "finance",
      primaryRole: "finance",
      staffRole: "finance",
    });

    expect(canAccessRoutePolicy(admin, "adminTrending")).toBe(true);
    expect(canAccessRoutePolicy(admin, "adminModeration")).toBe(false);
    expect(canAccessRoutePolicy(moderator, "adminModeration")).toBe(true);
    expect(canAccessRoutePolicy(moderator, "adminTrending")).toBe(false);
    expect(canAccessRoutePolicy(finance, "adminMonetization")).toBe(false);
    expect(canAccessRoutePolicy(finance, "adminFinance")).toBe(true);
    expect(canAccessRoutePolicy(admin, "adminFinance")).toBe(true);
    expect(canAccessRoutePolicy(moderator, "adminFinance")).toBe(false);
    expect(canAccessRoutePolicy(finance, "adminAudit")).toBe(true);
  });

  it("removes Staff routes when the Staff status is suspended or revoked", () => {
    for (const staffStatus of ["suspended", "revoked"] as const) {
      const formerAdmin = persona({
        accountType: "individual",
        staffStatus,
        staffRole: "admin",
      });
      expect(canAccessRoutePolicy(formerAdmin, "adminOverview")).toBe(false);
      expect(canAccessRoutePolicy(formerAdmin, "accountOverview")).toBe(true);
    }
  });
});
