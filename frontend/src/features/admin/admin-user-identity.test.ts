import { describe, expect, it } from "vitest";
import type { UserProfile } from "../../types";
import { adminPrimaryIdentity } from "./admin-user-identity";

const user = (overrides: Partial<UserProfile>): UserProfile =>
  ({
    id: "user",
    email: "user@example.test",
    name: "User",
    accountType: "individual",
    role: "individual_buyer",
    sellerType: "individual",
    status: "active",
    isVerified: true,
    city: "Paris",
    postalCode: "75001",
    createdAt: "2026-01-01T00:00:00.000Z",
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
    responseTimeText: "",
    ...overrides,
  }) as UserProfile;

describe("admin user identity precedence", () => {
  it("presents active Staff ahead of an underlying Individual account", () => {
    expect(
      adminPrimaryIdentity(
        user({ staffStatus: "active", staffRole: "support_agent" }),
      ),
    ).toBe("staff");
  });

  it("presents active Staff ahead of an underlying Professional account", () => {
    expect(
      adminPrimaryIdentity(
        user({
          accountType: "professional",
          sellerType: "pro",
          staffStatus: "active",
          staffRole: "admin",
        }),
      ),
    ).toBe("staff");
  });

  it("falls back to Professional then Individual for inactive memberships", () => {
    expect(
      adminPrimaryIdentity(
        user({
          accountType: "professional",
          sellerType: "pro",
          staffStatus: "suspended",
          staffRole: "admin",
        }),
      ),
    ).toBe("professional");
    expect(adminPrimaryIdentity(user({ staffStatus: "revoked" }))).toBe(
      "individual",
    );
  });
});
