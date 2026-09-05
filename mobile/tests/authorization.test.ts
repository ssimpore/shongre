import { describe, expect, it } from "vitest";
import {
  getMobileAuthorizationDecision,
  MobileAuthorizationError,
  requireMobileAuthorization,
} from "../src/features/auth/authorization";

const individual = {
  id: "mobile-customer",
  email: "customer@example.test",
  name: "Mobile Customer",
  role: "individual_buyer",
  accountType: "individual" as const,
  status: "active" as const,
};

describe("mobile authorization", () => {
  it("uses the canonical role policy for customer actions", () => {
    expect(
      getMobileAuthorizationDecision(individual, {
        capability: "listing.create",
      }).allowed,
    ).toBe(true);
    expect(
      getMobileAuthorizationDecision(null, {
        capability: "listing.create",
      }).denialReason,
    ).toBe("unauthenticated");
  });

  it("fails closed for blocked accounts and unavailable markets", () => {
    expect(
      getMobileAuthorizationDecision(
        { ...individual, status: "suspended" },
        { capability: "listing.create" },
      ).denialReason,
    ).toBe("account_status");
    expect(() =>
      requireMobileAuthorization(individual, {
        capability: "listing.create",
        market: { code: "SN", enabled: false },
      }),
    ).toThrow(MobileAuthorizationError);
  });

  it("does not turn a Staff capability projection into customer authority", () => {
    expect(
      getMobileAuthorizationDecision(
        {
          ...individual,
          staffStatus: "active",
          staffRole: "admin",
          capabilities: ["listing.create"],
        },
        { capability: "listing.create" },
      ).denialReason,
    ).toBe("staff_separation");
  });

  it("does not reconstruct authority from a role when the server projection is empty", () => {
    expect(
      getMobileAuthorizationDecision(
        { ...individual, capabilities: [] },
        { capability: "listing.create" },
      ).denialReason,
    ).toBe("missing_capability");
  });
});
