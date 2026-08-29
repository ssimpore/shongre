import { describe, it, expect } from "vitest";
import {
  showsVerifiedBadge,
  isProSeller,
  isInternalAccount,
  isPubliclyListableProSeller,
  hasProductAccess,
  isFacturationOnlyAccount,
  isProspectsOnlyAccount,
} from "./user.domain";
import { DEMO_USERS } from "../../mocks/initialDemoData";

describe("showsVerifiedBadge", () => {
  it("shows the badge for a verified individual", () => {
    expect(
      showsVerifiedBadge({ isVerified: true, sellerType: "individual" }),
    ).toBe(true);
  });

  it("hides it for an unverified individual", () => {
    expect(
      showsVerifiedBadge({ isVerified: false, sellerType: "individual" }),
    ).toBe(false);
  });

  // A professional account cannot exist without passing SIRET/KBIS checks, so the
  // "Pro" badge already carries that meaning — showing both said it twice.
  it.each([
    ["sellerType", { isVerified: true, sellerType: "pro" }],
    ["accountType", { isVerified: true, accountType: "professional" }],
    ["role", { isVerified: true, role: "pro_seller" }],
  ])("hides it for a pro identified by %s", (_label, subject) => {
    expect(showsVerifiedBadge(subject)).toBe(false);
  });

  // Listings carry the seller's state flattened, so both shapes must agree.
  it("accepts the flattened listing shape", () => {
    expect(
      showsVerifiedBadge({ sellerIsVerified: true, sellerType: "individual" }),
    ).toBe(true);
    expect(
      showsVerifiedBadge({ sellerIsVerified: true, sellerType: "pro" }),
    ).toBe(false);
  });

  it("handles a missing subject", () => {
    expect(showsVerifiedBadge(null)).toBe(false);
    expect(showsVerifiedBadge(undefined)).toBe(false);
  });
});

describe("isInternalAccount", () => {
  it("recognises only active Staff membership with a canonical role grant", () => {
    expect(
      isInternalAccount({
        accountType: "individual",
        staffStatus: "active",
        staffRole: "support_agent",
      }),
    ).toBe(true);
    expect(
      isInternalAccount({ accountType: "individual", staffStatus: "active" }),
    ).toBe(false);
    expect(isInternalAccount({ accountType: "staff" })).toBe(false);
    expect(isInternalAccount({ accountType: "internal" })).toBe(false);
  });

  it("honours explicit revocation and rejects direct grants without active Staff", () => {
    expect(
      isInternalAccount({
        accountType: "individual",
        staffStatus: "active",
        staffRole: "admin",
        revokedPermissions: ["staff.internal.access"],
      }),
    ).toBe(false);
    expect(
      isInternalAccount({
        accountType: "individual",
        staffStatus: "revoked",
        staffRole: "admin",
        customPermissions: ["staff.internal.access"],
      }),
    ).toBe(false);
  });

  it("never infers Staff authority from a role label alone", () => {
    expect(
      isInternalAccount({
        accountType: "professional",
        primaryRole: "moderator",
      }),
    ).toBe(false);
    expect(
      isInternalAccount({ accountType: "professional", role: "finance" }),
    ).toBe(false);
  });

  it("does not flag marketplace members", () => {
    expect(
      isInternalAccount({
        accountType: "professional",
        primaryRole: "pro_seller",
      }),
    ).toBe(false);
    expect(
      isInternalAccount({ accountType: "individual", primaryRole: "seller" }),
    ).toBe(false);
    expect(isInternalAccount(null)).toBe(false);
    expect(isInternalAccount(undefined)).toBe(false);
  });
});

describe("isPubliclyListableProSeller", () => {
  const shop = {
    accountType: "professional",
    sellerType: "pro",
    primaryRole: "pro_seller",
    status: "active",
  };

  it("lists an active professional shop", () => {
    expect(isPubliclyListableProSeller(shop)).toBe(true);
  });

  it("keeps Staff status orthogonal to a professional seller profile", () => {
    const staff = {
      ...shop,
      staffStatus: "active",
      staffRole: "commercial" as const,
    };
    expect(isProSeller(staff)).toBe(true);
    expect(isPubliclyListableProSeller(staff)).toBe(true);
  });

  it("never lists a suspended or deactivated shop", () => {
    expect(isPubliclyListableProSeller({ ...shop, status: "suspended" })).toBe(
      false,
    );
    expect(isPubliclyListableProSeller({ ...shop, isSuspended: true })).toBe(
      false,
    );
    expect(isPubliclyListableProSeller({ ...shop, status: "disabled" })).toBe(
      false,
    );
    expect(isPubliclyListableProSeller({ ...shop, status: "deleted" })).toBe(
      false,
    );
  });

  it("does not list individual sellers", () => {
    expect(
      isPubliclyListableProSeller({
        accountType: "individual",
        sellerType: "individual",
        primaryRole: "seller",
        status: "active",
      }),
    ).toBe(false);
  });

  it("keeps employee status out of customer account-type classification", () => {
    const leaked = Object.values(DEMO_USERS)
      .filter((u: any) => u.staffStatus === "active")
      .filter(
        (u: any) => !["individual", "professional"].includes(u.accountType),
      );

    expect(leaked.map((u: any) => u.email)).toEqual([]);
  });

  it("still lists the demo professional shops", () => {
    const listed = Object.values(DEMO_USERS)
      .filter((u: any) => isPubliclyListableProSeller(u))
      .map((u: any) => u.slug);

    expect(listed).toContain("atelier-nordique");
    expect(listed).toContain("optique-des-arts");
  });
});

describe("product access", () => {
  it("keeps public discovery available but fails closed for legacy product grants", () => {
    expect(hasProductAccess(null, "marketplace")).toBe(true);
    expect(hasProductAccess({}, "marketplace")).toBe(true);
    expect(hasProductAccess({}, "prospects")).toBe(false);
    expect(hasProductAccess({}, "facturation")).toBe(false);
  });

  it("recognises an account provisioned only for Shongre Prospects", () => {
    const prospectsOnly = { enabledProducts: ["prospects"] };

    expect(hasProductAccess(prospectsOnly, "prospects")).toBe(true);
    expect(hasProductAccess(prospectsOnly, "marketplace")).toBe(false);
    expect(isProspectsOnlyAccount(prospectsOnly)).toBe(true);
  });

  it("does not restrict a multi-product account", () => {
    const multiProduct = {
      enabledProducts: ["marketplace", "prospects"],
    };

    expect(isProspectsOnlyAccount(multiProduct)).toBe(false);
  });

  it("recognises Facturation-only and multi-product accounts", () => {
    const facturationOnly = { enabledProducts: ["facturation"] };
    const facturationAndProspects = {
      enabledProducts: ["facturation", "prospects"],
    };

    expect(hasProductAccess(facturationOnly, "facturation")).toBe(true);
    expect(hasProductAccess(facturationOnly, "marketplace")).toBe(false);
    expect(isFacturationOnlyAccount(facturationOnly)).toBe(true);
    expect(isFacturationOnlyAccount(facturationAndProspects)).toBe(false);
  });
});
