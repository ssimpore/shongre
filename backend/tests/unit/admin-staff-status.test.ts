import { describe, expect, it } from "vitest";
import {
  DemoAdminRepository,
  DemoModerationRepository,
  DemoUserRepository,
  CANONICAL_DEMO_USERS,
} from "../../src/infrastructure/database/repositories/index.js";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { AdminService } from "../../src/modules/admin/admin.service.js";
import { SessionService } from "../../src/modules/auth/session.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";
import type { UserProfile } from "../../src/shared/types/index.js";

const target = CANONICAL_DEMO_USERS["thomas.laurent@example.fr"];
const adminUser = CANONICAL_DEMO_USERS["admin@shongre.com"];
const moderatorUser = CANONICAL_DEMO_USERS["moderation@shongre.com"];

const principal = (overrides: Partial<Principal> = {}): Principal => ({
  userId: adminUser.id,
  email: adminUser.email,
  role: "individual_buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "admin",
  mfaVerified: true,
  recentlyAuthenticated: true,
  capabilities: ["admin.staff.manage"],
  ...overrides,
});

function service(extraUsers: Record<string, UserProfile> = {}) {
  const users = new DemoUserRepository({
    ...CANONICAL_DEMO_USERS,
    ...extraUsers,
  });
  const audits = new DemoAdminRepository();
  return {
    users,
    audits,
    value: new AdminService(
      audits,
      users,
      new DemoModerationRepository(),
      new SessionService(new DemoAuthRepository()),
    ),
  };
}

describe("AdminService Staff lifecycle", () => {
  it("grants Staff without changing the target account type", async () => {
    const setup = service();
    const updated = await setup.value.updateStaffStatus({
      userId: target.id,
      status: "active",
      staffRole: "support_agent",
      reason: "Affectation approuvée par la direction du support",
      actor: principal(),
    });

    expect(updated).toMatchObject({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "support_agent",
    });
    expect((await setup.audits.getAuditLogs())[0]).toMatchObject({
      action: "staff_access_updated",
      target: target.name,
    });
  });

  it("rejects self-management and role-label-only actors", async () => {
    const setup = service();
    await expect(
      setup.value.updateStaffStatus({
        userId: adminUser.id,
        status: "suspended",
        staffRole: "admin",
        reason: "Suspension demandée pour vérifier le contrôle interne",
        actor: principal(),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      setup.value.updateStaffStatus({
        userId: target.id,
        status: "active",
        staffRole: "support_agent",
        reason: "Tentative sans statut Staff accordé par la plateforme",
        actor: principal({ staffStatus: "none", role: "admin" }),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserves owner grants for active owners", async () => {
    const setup = service();
    await expect(
      setup.value.updateStaffStatus({
        userId: target.id,
        status: "active",
        staffRole: "owner",
        reason: "Nomination proposée au niveau de gouvernance propriétaire",
        actor: principal(),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces MFA and recent authentication inside the domain service", async () => {
    const setup = service();

    await expect(
      setup.value.updateStaffStatus({
        userId: target.id,
        status: "active",
        staffRole: "support_agent",
        reason: "Affectation avec une session qui n’a pas validé le MFA",
        actor: principal({ mfaVerified: false }),
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "mfa_required" },
    });

    await expect(
      setup.value.updateStaffStatus({
        userId: target.id,
        status: "active",
        staffRole: "support_agent",
        reason: "Affectation avec une authentification devenue trop ancienne",
        actor: principal({ recentlyAuthenticated: false }),
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "recent_authentication_required" },
    });
  });

  it("prevents the ordinary account-status flow from bypassing Staff controls", async () => {
    const setup = service();

    await expect(
      setup.value.updateUserStatus({
        userId: moderatorUser.id,
        status: "suspended",
        reason: "Tentative de contournement du contrôle renforcé Staff",
        actor: principal(),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
