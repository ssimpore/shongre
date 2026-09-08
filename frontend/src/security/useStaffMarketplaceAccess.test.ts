import { describe, expect, it } from "vitest";
import type { UserProfile } from "../types";
import { resolveStaffMarketplaceMode } from "./useStaffMarketplaceAccess";

const staff = (overrides: Partial<UserProfile> = {}): UserProfile =>
  ({
    id: "staff-tester",
    email: "tester@shongre.example",
    name: "Staff Tester",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "operations",
    role: "operations",
    primaryRole: "operations",
    sellerType: "individual",
    status: "active",
    ...overrides,
  }) as UserProfile;

describe("Staff marketplace presentation mode", () => {
  it("keeps ordinary Staff read-only", () => {
    expect(resolveStaffMarketplaceMode(staff())).toBe("read_only");
  });

  it("ignores obsolete marketplace demo grants", () => {
    const tester = staff({ customPermissions: ["staff.marketplace.demo"] });
    expect(resolveStaffMarketplaceMode(tester)).toBe("read_only");
  });

  it("never treats a customer-side forged grant as Staff demo access", () => {
    const customer = staff({
      staffStatus: "none",
      staffRole: undefined,
      customPermissions: ["staff.marketplace.demo"],
    });
    expect(resolveStaffMarketplaceMode(customer)).toBe("customer");
  });
});
