import { describe, it, expect } from "vitest";
import { authorizationService } from "./authorization.service";
import { UserProfile } from "../types";

describe("AuthorizationService - RBAC Permissions & Security Rules", () => {
  it("allows guests to read public listings and search", () => {
    expect(authorizationService.can(null, "listing.read")).toBe(true);
    expect(authorizationService.can(null, "listing.create")).toBe(false);
    expect(authorizationService.can(null, "moderation.review")).toBe(false);
  });

  it("allows individual buyer to create reservations and send messages", () => {
    const buyer: Partial<UserProfile> = {
      id: "user-thomas",
      role: "buyer",
      primaryRole: "buyer",
      status: "active",
    };

    expect(authorizationService.can(buyer as UserProfile, "order.create")).toBe(
      true,
    );
    expect(authorizationService.can(buyer as UserProfile, "message.send")).toBe(
      true,
    );
    expect(authorizationService.can(buyer as UserProfile, "user.suspend")).toBe(
      false,
    );
    expect(
      authorizationService.can(buyer as UserProfile, "course.request.create"),
    ).toBe(true);
    expect(
      authorizationService.can(buyer as UserProfile, "course.admin.manage"),
    ).toBe(false);
    // Buyer and seller are activities of the same individual identity.
    expect(
      authorizationService.can(buyer as UserProfile, "listing.create"),
    ).toBe(true);
  });

  it("enforces resource ownership when editing an announcement", () => {
    const seller: Partial<UserProfile> = {
      id: "user-seller-1",
      role: "seller",
      primaryRole: "seller",
      status: "active",
    };

    const ownListing = { sellerId: "user-seller-1", id: "list-1" };
    const otherListing = { sellerId: "user-seller-2", id: "list-2" };

    expect(
      authorizationService.can(
        seller as UserProfile,
        "listing.update.own",
        ownListing,
      ),
    ).toBe(true);
    expect(
      authorizationService.can(
        seller as UserProfile,
        "listing.update.own",
        otherListing,
      ),
    ).toBe(false);
  });

  it("restricts suspended users from creating listings or orders", () => {
    const suspendedUser: Partial<UserProfile> = {
      id: "user-bad",
      role: "seller",
      primaryRole: "seller",
      status: "suspended",
      isSuspended: true,
    };

    expect(
      authorizationService.can(suspendedUser as UserProfile, "listing.create"),
    ).toBe(false);
    expect(
      authorizationService.can(suspendedUser as UserProfile, "order.create"),
    ).toBe(false);
    // But allows reading profile and reporting
    expect(
      authorizationService.can(suspendedUser as UserProfile, "profile.read"),
    ).toBe(true);
    expect(
      authorizationService.can(suspendedUser as UserProfile, "report.create"),
    ).toBe(true);
  });

  it("keeps moderation separate from platform administration", () => {
    const moderator: Partial<UserProfile> = {
      id: "mod-1",
      accountType: "individual",
      staffStatus: "active",
      staffRole: "moderator",
      role: "buyer",
      primaryRole: "buyer",
      status: "active",
    };

    const admin: Partial<UserProfile> = {
      id: "admin-1",
      accountType: "individual",
      staffStatus: "active",
      staffRole: "admin",
      role: "buyer",
      primaryRole: "buyer",
      status: "active",
    };

    expect(
      authorizationService.can(moderator as UserProfile, "moderation.review"),
    ).toBe(true);
    expect(
      authorizationService.can(moderator as UserProfile, "listing.moderate"),
    ).toBe(true);
    expect(authorizationService.can(admin as UserProfile, "audit.read")).toBe(
      true,
    );
    expect(authorizationService.can(admin as UserProfile, "user.suspend")).toBe(
      false,
    );
    expect(
      authorizationService.can(admin as UserProfile, "moderation.review"),
    ).toBe(false);
    expect(
      authorizationService.can(admin as UserProfile, "course.admin.manage"),
    ).toBe(true);
  });

  it("scopes professional tools to the selected vertical", () => {
    const automotivePro: Partial<UserProfile> = {
      id: "auto-pro",
      accountType: "professional",
      role: "pro_seller",
      primaryRole: "pro_seller",
      professionalVertical: "automotive",
      status: "active",
    };

    expect(
      authorizationService.can(
        automotivePro as UserProfile,
        "auto.dealer.manage.own",
      ),
    ).toBe(true);
    expect(
      authorizationService.can(
        automotivePro as UserProfile,
        "immo.agency.manage.own",
      ),
    ).toBe(false);
    expect(
      authorizationService.can(
        automotivePro as UserProfile,
        "course.profile.manage.own",
      ),
    ).toBe(false);
    expect(
      authorizationService.can(
        automotivePro as UserProfile,
        "employment.candidate.manage.own",
      ),
    ).toBe(false);
    expect(
      authorizationService.can(automotivePro as UserProfile, "listing.create"),
    ).toBe(false);
  });

  it("does not grant commercial entitlements to staff administrators", () => {
    const admin: Partial<UserProfile> = {
      id: "admin-1",
      accountType: "individual",
      staffStatus: "active",
      staffRole: "admin",
      role: "admin",
      primaryRole: "admin",
      status: "active",
      activePlanId: "pro_enterprise",
    };
    expect(
      authorizationService.hasEntitlement(
        admin as UserProfile,
        "bulkImportExport",
      ),
    ).toBe(false);
  });

  it("rejects Staff-only direct overrides without an active membership", () => {
    const customer: Partial<UserProfile> = {
      id: "customer-with-forged-override",
      accountType: "individual",
      role: "individual_buyer",
      primaryRole: "individual_buyer",
      status: "active",
      customPermissions: ["admin.access"],
    };
    const revokedStaff: Partial<UserProfile> = {
      ...customer,
      id: "revoked-staff-with-override",
      staffStatus: "revoked",
      staffRole: "admin",
    };

    expect(
      authorizationService.can(customer as UserProfile, "admin.access"),
    ).toBe(false);
    expect(
      authorizationService.can(revokedStaff as UserProfile, "admin.access"),
    ).toBe(false);
    expect(
      authorizationService.can(revokedStaff as UserProfile, "listing.read"),
    ).toBe(true);
  });
});
