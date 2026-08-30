import { afterEach, describe, expect, it } from "vitest";
import { authorizationService } from "../security/authorization.service";
import { storageService } from "../services/storage.service";
import type { Permission } from "../types";
import { DEMO_USERS } from "./initialDemoData";

const cases = [
  ["pro_immo_clara", "immo.agency.manage.own"],
  ["pro_auto_michel", "auto.dealer.manage.own"],
  ["pro_courses_sophie", "course.organization.manage.own"],
  ["pro_employment_clara", "employment.recruiter.manage.own"],
] as const satisfies ReadonlyArray<readonly [string, Permission]>;

const workspacePermissions: Permission[] = cases.map(
  ([, permission]) => permission,
);

afterEach(() => {
  storageService.remove("shongre_users_v1");
});

describe("vertical Pro demo personas", () => {
  it.each(cases)(
    "scopes %s to its own professional workspace",
    (key, permission) => {
      const user = DEMO_USERS[key];
      expect(user).toMatchObject({
        accountType: "professional",
        primaryRole: "pro_seller",
        status: "active",
        isVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        activePlanId: "pro_business",
      });
      expect(authorizationService.can(user, permission)).toBe(true);
      workspacePermissions
        .filter((candidate) => candidate !== permission)
        .forEach((candidate) => {
          expect(authorizationService.can(user, candidate)).toBe(false);
        });
    },
  );

  it("adds new canonical personas to an older persisted demo user store", () => {
    storageService.set("shongre_users_v1", {
      buyer_thomas: DEMO_USERS.buyer_thomas,
    });

    expect(storageService.getUsers()).toMatchObject({
      pro_immo_clara: { id: "user_immo_clara" },
      pro_auto_michel: { id: "user_dealer_owner" },
      pro_courses_sophie: { id: "user_tutor_sophie" },
      pro_employment_clara: { id: "user_employment_clara" },
    });
  });

  it("migrates persisted legacy Staff account types without a storage reset", () => {
    storageService.set("shongre_users_v1", {
      admin_antoine: {
        ...DEMO_USERS.admin_antoine,
        accountType: "staff",
        staffStatus: undefined,
        primaryRole: "admin",
        role: "admin",
      } as any,
    });

    expect(storageService.getUsers().admin_antoine).toMatchObject({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "admin",
      primaryRole: "buyer",
    });
  });

  it("adopts newer versioned Staff demo grants without overwriting later admin changes", () => {
    storageService.set("shongre_users_v1", {
      ops_elena: {
        ...DEMO_USERS.ops_elena,
        customPermissions: undefined,
        capabilityOverrideVersion: undefined,
      } as any,
    });

    expect(storageService.getUsers().ops_elena).toMatchObject({
      accountType: "individual",
      customPermissions: ["staff.marketplace.demo"],
      capabilityOverrideVersion: 1,
    });

    storageService.set("shongre_users_v1", {
      ops_elena: {
        ...DEMO_USERS.ops_elena,
        customPermissions: [],
        capabilityOverrideVersion: 2,
      },
    });

    expect(storageService.getUsers().ops_elena).toMatchObject({
      customPermissions: [],
      capabilityOverrideVersion: 2,
    });
  });
});
