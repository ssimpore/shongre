import { describe, expect, it } from "vitest";
import {
  hasEffectiveCapability,
  type Capability,
} from "@shongre/contracts/access-control";
import type { UserProfile } from "../../types";
import {
  canAccessRoutePolicy,
  type RoutePolicyId,
} from "../../security/access-policy.registry";
import { resolveHeaderAccountMenuItems } from "./account-menu.model";

const persona = (overrides: Partial<UserProfile>): UserProfile =>
  ({
    id: "persona",
    email: "persona@example.test",
    name: "Persona",
    role: "buyer",
    primaryRole: "buyer",
    sellerType: "individual",
    accountType: "individual",
    status: "active",
    staffStatus: "none",
    isVerified: true,
    city: "Paris",
    postalCode: "75001",
    createdAt: "2026-01-01T00:00:00Z",
    rating: 0,
    reviewCount: 0,
    ...overrides,
  }) as UserProfile;

function resolve(
  user: UserProfile,
  options: { allowStaffMarketplaceDemo?: boolean } = {},
) {
  return resolveHeaderAccountMenuItems({
    user,
    canAccessRoute: (policyId: RoutePolicyId) =>
      canAccessRoutePolicy(user, policyId, options),
    hasCapability: (capability: Capability) =>
      hasEffectiveCapability(user, capability),
    canUseDemoMarketplace: options.allowStaffMarketplaceDemo === true,
    listingCount: 3,
    favoriteCount: 4,
  });
}

const ids = (user: UserProfile, allowStaffMarketplaceDemo = false) =>
  resolve(user, { allowStaffMarketplaceDemo }).map((item) => item.id);

describe("header account-menu model", () => {
  it("shows ordinary customers only the customer destinations they can enter", () => {
    expect(ids(persona({}))).toEqual([
      "account",
      "listings",
      "favorites",
      "purchases",
      "public_profile",
      "pro_solutions",
    ]);
  });

  it("keeps professional public storefront and plan access customer-scoped", () => {
    const pro = persona({
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      sellerType: "pro",
      storeSlug: "atelier-pro",
    });
    const items = resolve(pro);

    expect(items.find((item) => item.id === "public_profile")).toMatchObject({
      to: "/boutique/atelier-pro",
      labelKey: "shell.header.accountMenu.publicStorefront",
    });
    expect(items.some((item) => item.id === "pro_solutions")).toBe(true);
  });

  it("shows active Staff only their internal console by default", () => {
    const staff = persona({
      staffStatus: "active",
      staffRole: "admin",
    });

    expect(ids(staff)).toEqual(["admin"]);
  });

  it("adds one clearly labelled isolated demo entry for explicitly authorized Staff", () => {
    const tester = persona({
      staffStatus: "active",
      staffRole: "operations",
      customPermissions: ["staff.marketplace.demo"],
    });
    const items = resolve(tester, { allowStaffMarketplaceDemo: true });

    expect(items.map((item) => item.id)).toEqual(["admin", "demo_workspace"]);
    expect(items[1]).toMatchObject({
      to: "/compte",
      isDemo: true,
      separatorBefore: true,
    });
    expect(items.some((item) => item.id === "pro_solutions")).toBe(false);
  });

  it("offers support rather than customer or internal tools to inactive Staff", () => {
    for (const staffStatus of ["suspended", "revoked"] as const) {
      expect(
        ids(
          persona({
            staffStatus,
            staffRole: "admin",
          }),
        ),
      ).toEqual(["support"]);
    }
  });

  it("removes customer actions that account status no longer authorizes", () => {
    const suspended = persona({ status: "suspended", isSuspended: true });

    expect(ids(suspended)).toEqual(["account", "purchases", "public_profile"]);
  });
});
