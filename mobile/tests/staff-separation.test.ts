import { describe, expect, it } from "vitest";
import {
  StaffMobileAccessError,
  requireMobileCustomer,
} from "@/features/auth/staff-access";

describe("mobile Staff separation", () => {
  it("accepts customer identities and rejects every retained Staff state", () => {
    const customer = {
      id: "customer",
      email: "customer@example.test",
      name: "Customer",
      role: "individual_buyer" as const,
      accountType: "individual" as const,
      staffStatus: "none" as const,
    };
    expect(requireMobileCustomer(customer)).toBe(customer);

    for (const staffStatus of ["active", "suspended", "revoked"] as const) {
      expect(() =>
        requireMobileCustomer({
          ...customer,
          staffStatus,
          staffRole: "support_agent",
        }),
      ).toThrow(StaffMobileAccessError);
    }
  });
});
