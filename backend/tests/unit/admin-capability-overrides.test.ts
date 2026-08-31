import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITIES,
  CUSTOMER_MARKETPLACE_CAPABILITIES,
  type Capability,
} from "@shongre/contracts/access-control";
import {
  CANONICAL_DEMO_USERS,
  DemoAdminRepository,
  DemoModerationRepository,
  DemoUserRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { AdminService } from "../../src/modules/admin/admin.service.js";
import { SessionService } from "../../src/modules/auth/session.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";
import type { UserProfile } from "../../src/shared/types/index.js";

const target = CANONICAL_DEMO_USERS["thomas.laurent@example.fr"];
const adminUser = CANONICAL_DEMO_USERS["admin@shongre.com"];

const principal = (overrides: Partial<Principal> = {}): Principal => ({
  userId: adminUser.id,
  email: adminUser.email,
  role: "individual_buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "admin",
  mfaVerified: true,
  recentlyAuthenticated: true,
  capabilities: ["staff.internal.access", "admin.permissions.manage"],
  ...overrides,
});

function setup(extraUsers: Record<string, UserProfile> = {}) {
  const users = new DemoUserRepository({
    ...CANONICAL_DEMO_USERS,
    ...extraUsers,
  });
  const audits = new DemoAdminRepository();
  const auth = new DemoAuthRepository();
  const sessions = new SessionService(auth);
  return {
    users,
    audits,
    auth,
    sessions,
    service: new AdminService(
      audits,
      users,
      new DemoModerationRepository(),
      sessions,
    ),
  };
}

describe("AdminService capability overrides", () => {
  it("returns a complete, explainable projection", async () => {
    const subject = setup();
    const projection = await subject.service.getCapabilityOverrides({
      userId: target.id,
      actor: principal(),
    });

    expect(projection).toMatchObject({
      userId: target.id,
      accountType: "individual",
      staffStatus: "none",
      staffRole: null,
      version: 1,
    });
    expect(projection.capabilities).toHaveLength(CAPABILITIES.length);
    expect(
      projection.capabilities.every((entry) => entry.label.length > 0),
    ).toBe(true);
    expect(
      projection.capabilities.find(
        (entry) => entry.capability === "listing.create",
      ),
    ).toMatchObject({
      fromCustomerAccount: true,
      effective: true,
      ineffectiveReason: null,
    });
  });

  it("updates with optimistic concurrency, audits before/after state, and revokes sessions", async () => {
    const subject = setup();
    const auditSpy = vi.spyOn(subject.audits, "saveAuditLog");
    const tokens = await subject.sessions.create(target, "password");

    const updated = await subject.service.updateCapabilityOverrides({
      userId: target.id,
      actor: principal(),
      customPermissions: ["listing.read"],
      revokedPermissions: ["listing.create"],
      reason: "Réduction temporaire validée pendant la revue du compte",
      expectedVersion: 1,
      requestId: "req-capability-1",
    });

    expect(updated.version).toBe(2);
    expect(
      updated.capabilities.find(
        (entry) => entry.capability === "listing.create",
      ),
    ).toMatchObject({
      directlyRevoked: true,
      effective: false,
      ineffectiveReason: "directly_revoked",
    });
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "capability_overrides_updated",
        metadata: expect.objectContaining({
          previousCustomPermissions: [],
          newCustomPermissions: ["listing.read"],
          previousRevokedPermissions: [],
          newRevokedPermissions: ["listing.create"],
          previousVersion: 1,
          newVersion: 2,
          requestId: "req-capability-1",
        }),
      }),
    );
    expect(await subject.auth.findSessionById(tokens.sessionId)).toMatchObject({
      revokedReason: "capability_overrides_changed",
    });

    await expect(
      subject.service.updateCapabilityOverrides({
        userId: target.id,
        actor: principal(),
        customPermissions: [],
        revokedPermissions: [],
        reason: "Tentative depuis une projection devenue obsolète",
        expectedVersion: 1,
        requestId: "req-capability-stale",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("enforces active Staff, MFA, recent authentication, and the dedicated capability", async () => {
    const subject = setup();
    const read = (actor: Principal) =>
      subject.service.getCapabilityOverrides({ userId: target.id, actor });

    await expect(
      read(principal({ staffStatus: "suspended" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(read(principal({ mfaVerified: false }))).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
        details: { reason: "mfa_required" },
      },
    );
    await expect(
      read(principal({ recentlyAuthenticated: false })),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "recent_authentication_required" },
    });
    await expect(read(principal({ capabilities: [] }))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("never grants or exposes customer capabilities for a Staff target", async () => {
    const staffTarget: UserProfile = {
      ...target,
      id: "staff-target",
      email: "staff-target@example.test",
      staffStatus: "active",
      staffRole: "support_agent",
      customPermissions: ["listing.read"],
    };
    const subject = setup({ [staffTarget.email]: staffTarget });
    const projection = await subject.service.getCapabilityOverrides({
      userId: staffTarget.id,
      actor: principal(),
    });

    expect(
      projection.capabilities.some((entry) =>
        CUSTOMER_MARKETPLACE_CAPABILITIES.includes(
          entry.capability as (typeof CUSTOMER_MARKETPLACE_CAPABILITIES)[number],
        ),
      ),
    ).toBe(false);
    await expect(
      subject.service.updateCapabilityOverrides({
        userId: staffTarget.id,
        actor: principal(),
        customPermissions: ["listing.create"],
        revokedPermissions: [],
        reason: "Tentative de pont vers la marketplace client interdite",
        expectedVersion: 1,
        requestId: "req-staff-marketplace-denied",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grants the dedicated Staff demo capability through the audited override workflow only", async () => {
    const staffTarget: UserProfile = {
      ...target,
      id: "staff-demo-target",
      email: "staff-demo-target@example.test",
      staffStatus: "active",
      staffRole: "operations",
      customPermissions: [],
    };
    const subject = setup({ [staffTarget.email]: staffTarget });
    const auditSpy = vi.spyOn(subject.audits, "saveAuditLog");

    const updated = await subject.service.updateCapabilityOverrides({
      userId: staffTarget.id,
      actor: principal(),
      customPermissions: ["staff.marketplace.demo"],
      revokedPermissions: [],
      reason:
        "Accès temporaire au bac à sable pour une démonstration contrôlée",
      expectedVersion: 1,
      requestId: "req-staff-demo-grant",
    });

    expect(
      updated.capabilities.find(
        (entry) => entry.capability === "staff.marketplace.demo",
      ),
    ).toMatchObject({ directlyGranted: true, effective: true });
    expect(
      updated.capabilities.some((entry) =>
        CUSTOMER_MARKETPLACE_CAPABILITIES.includes(
          entry.capability as (typeof CUSTOMER_MARKETPLACE_CAPABILITIES)[number],
        ),
      ),
    ).toBe(false);
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "capability_overrides_updated",
        metadata: expect.objectContaining({
          newCustomPermissions: ["staff.marketplace.demo"],
          requestId: "req-staff-demo-grant",
        }),
      }),
    );
  });

  it("rejects self-management, contradictory inputs, unknown capabilities, and owner escalation", async () => {
    const ownerTarget: UserProfile = {
      ...target,
      id: "owner-target",
      email: "owner-target@example.test",
      staffStatus: "active",
      staffRole: "owner",
    };
    const subject = setup({ [ownerTarget.email]: ownerTarget });
    const base = {
      actor: principal(),
      customPermissions: [] as Capability[],
      revokedPermissions: [] as Capability[],
      reason: "Décision motivée pour le test de gouvernance des accès",
      expectedVersion: 1,
      requestId: "req-capability-governance",
    };

    await expect(
      subject.service.updateCapabilityOverrides({
        ...base,
        userId: adminUser.id,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      subject.service.updateCapabilityOverrides({
        ...base,
        userId: target.id,
        customPermissions: ["listing.read"],
        revokedPermissions: ["listing.read"],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      subject.service.updateCapabilityOverrides({
        ...base,
        userId: target.id,
        customPermissions: ["unknown.capability" as Capability],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      subject.service.updateCapabilityOverrides({
        ...base,
        userId: target.id,
        customPermissions: ["permission.manage"],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      subject.service.updateCapabilityOverrides({
        ...base,
        userId: ownerTarget.id,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets administrators remediate owner-only grants and owners manage the full canonical set", async () => {
    const compromisedTarget: UserProfile = {
      ...target,
      customPermissions: ["permission.manage"],
      capabilityOverrideVersion: 1,
    };
    const subject = setup({ [compromisedTarget.email]: compromisedTarget });

    const remediated = await subject.service.updateCapabilityOverrides({
      userId: compromisedTarget.id,
      actor: principal(),
      customPermissions: [],
      revokedPermissions: ["permission.manage"],
      reason: "Retrait de la permission de gouvernance attribuée par erreur",
      expectedVersion: 1,
      requestId: "req-capability-remediation",
    });
    expect(
      remediated.capabilities.find(
        (entry) => entry.capability === "permission.manage",
      ),
    ).toMatchObject({ directlyRevoked: true, effective: false });

    const ownerManaged = await subject.service.updateCapabilityOverrides({
      userId: compromisedTarget.id,
      actor: principal({ userId: "owner-actor", staffRole: "owner" }),
      customPermissions: [...CAPABILITIES],
      revokedPermissions: [],
      reason: "Configuration complète approuvée par le propriétaire plateforme",
      expectedVersion: 2,
      requestId: "req-capability-owner-complete",
    });
    expect(ownerManaged.capabilities).toHaveLength(CAPABILITIES.length);
    expect(
      ownerManaged.capabilities.every((entry) => entry.directlyGranted),
    ).toBe(true);
  });
});
