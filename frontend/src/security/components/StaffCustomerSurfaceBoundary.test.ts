import { describe, expect, it } from "vitest";
import {
  isStaffNeutralPublicPath,
  resolveStaffCustomerSurfaceAction,
} from "./StaffCustomerSurfaceBoundary";

describe("Staff customer-surface boundary", () => {
  it("allows neutral legal/support pages and denies marketplace paths by default", () => {
    expect(isStaffNeutralPublicPath("/conditions-utilisation")).toBe(true);
    expect(isStaffNeutralPublicPath("/contact")).toBe(true);
    expect(isStaffNeutralPublicPath("/securite-interne")).toBe(true);
    expect(isStaffNeutralPublicPath("/")).toBe(false);
    expect(isStaffNeutralPublicPath("/recherche")).toBe(false);
    expect(isStaffNeutralPublicPath("/annonce/listing-1")).toBe(false);
    expect(isStaffNeutralPublicPath("/compte/messages")).toBe(false);
    expect(isStaffNeutralPublicPath("/solutions-pro")).toBe(false);
  });

  it("exits an active Staff demo persona at the root without weakening other Staff routes", () => {
    const base = {
      isRestoring: false,
      isStaff: true,
      staffStatus: "active",
      dataMode: "demo" as const,
      pathname: "/",
      allowNeutralPublicPaths: true,
      exitDemoStaffAtRoot: true,
      enteredAtRoot: true,
      entryStaffState: "staff" as const,
      demoExitFailed: false,
    };

    expect(resolveStaffCustomerSurfaceAction(base)).toBe("exit-demo-staff");
    expect(
      resolveStaffCustomerSurfaceAction({ ...base, pathname: "/recherche" }),
    ).toBe("redirect-admin");
    expect(
      resolveStaffCustomerSurfaceAction({ ...base, dataMode: "api" }),
    ).toBe("redirect-admin");
    expect(
      resolveStaffCustomerSurfaceAction({ ...base, demoExitFailed: true }),
    ).toBe("redirect-admin");
    expect(
      resolveStaffCustomerSurfaceAction({
        ...base,
        entryStaffState: "non-staff",
      }),
    ).toBe("redirect-admin");
    expect(
      resolveStaffCustomerSurfaceAction({
        ...base,
        entryStaffState: "pending",
      }),
    ).toBe("pending");
    expect(
      resolveStaffCustomerSurfaceAction({ ...base, enteredAtRoot: false }),
    ).toBe("redirect-admin");
  });
});
