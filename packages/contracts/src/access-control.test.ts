import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  ACCOUNT_STATUSES,
  CUSTOMER_MARKETPLACE_CAPABILITIES,
  PROFESSIONAL_VERTICALS,
  STAFF_ROLES,
  STAFF_STATUSES,
  canonicalAccessContext,
  evaluateAuthorization,
  hasEffectiveCapability,
  resolveCapabilityFacts,
  resolveEffectiveCapabilities,
  type AccessSubject,
} from "./access-control";

const capabilities = (subject: AccessSubject) =>
  new Set(resolveEffectiveCapabilities({ status: "active", ...subject }));

describe("canonical access-control policy", () => {
  it("keeps the canonical capability vocabulary unique", () => {
    expect(new Set(CAPABILITIES).size).toBe(CAPABILITIES.length);
  });

  it("models buying and selling as activities of one individual account", () => {
    const individual = capabilities({ accountType: "individual" });
    expect(individual.has("favorite.manage.own")).toBe(true);
    expect(individual.has("listing.create")).toBe(true);
    expect(individual.has("admin.access")).toBe(false);
  });

  it("adds only the selected professional vertical", () => {
    const automotive = capabilities({
      accountType: "professional",
      professionalVertical: "automotive",
    });
    expect(automotive.has("store.manage.own")).toBe(false);
    expect(automotive.has("auto.dealer.manage.own")).toBe(true);
    expect(automotive.has("auto.vehicle.manage.own")).toBe(true);
    expect(automotive.has("course.profile.manage.own")).toBe(false);
    expect(automotive.has("employment.candidate.manage.own")).toBe(false);
    expect(automotive.has("listing.create")).toBe(false);
    expect(automotive.has("immo.agency.manage.own")).toBe(false);
    expect(automotive.has("employment.recruiter.manage.own")).toBe(false);
  });

  it("lets an education professional manage the profile used by onboarding", () => {
    const education = capabilities({
      accountType: "professional",
      professionalVertical: "education",
    });

    expect(education.has("course.profile.manage.own")).toBe(true);
    expect(education.has("course.offer.manage.own")).toBe(true);
    expect(education.has("course.organization.manage.own")).toBe(true);
    expect(education.has("auto.vehicle.manage.own")).toBe(false);
  });

  it("keeps generic professional inventory separate from specialized verticals", () => {
    const generic = capabilities({
      accountType: "professional",
      professionalVertical: "generic",
    });
    expect(generic.has("listing.create")).toBe(true);
    expect(generic.has("store.manage.own")).toBe(true);
    expect(generic.has("auto.vehicle.manage.own")).toBe(false);
    expect(generic.has("immo.property.manage.own")).toBe(false);
  });

  it("grants customer CRM capabilities without leaking internal Shongre access", () => {
    const professional = capabilities({
      accountType: "professional",
      professionalVertical: "generic",
    });

    expect(professional.has("crm.dashboard.read")).toBe(true);
    expect(professional.has("crm.accounts.create")).toBe(true);
    expect(professional.has("crm.opportunities.transition")).toBe(true);
    expect(professional.has("marketing.campaigns.create")).toBe(true);
    expect(professional.has("marketing.campaigns.send")).toBe(true);
    expect(professional.has("marketing.campaigns.approve")).toBe(false);
    expect(professional.has("crm.prospecting.internal_first_party")).toBe(
      false,
    );
    expect(professional.has("crm.configuration.manage")).toBe(false);
    expect(professional.has("admin.access")).toBe(false);
  });

  it("grants tenant invoicing work without granting regulated transmission", () => {
    const professional = capabilities({
      accountType: "professional",
      professionalVertical: "generic",
    });

    expect(professional.has("invoice.read")).toBe(true);
    expect(professional.has("invoice.create")).toBe(true);
    expect(professional.has("invoice.finalize")).toBe(true);
    expect(professional.has("invoice.party.manage")).toBe(true);
    expect(professional.has("invoice.transmit")).toBe(false);
    expect(professional.has("invoicing.audit.read")).toBe(false);
  });

  it.each(STAFF_ROLES)(
    "gives %s only its internal Staff plane",
    (staffRole) => {
      const staff = capabilities({
        accountType: "individual",
        staffStatus: "active",
        staffRole,
      });
      expect(staff.has("staff.internal.access")).toBe(true);
      for (const capability of CUSTOMER_MARKETPLACE_CAPABILITIES) {
        expect(staff.has(capability)).toBe(false);
      }
    },
  );

  it("removes Staff capabilities immediately when the status is suspended or revoked", () => {
    for (const staffStatus of ["suspended", "revoked"] as const) {
      const staff = capabilities({
        accountType: "individual",
        staffStatus,
        staffRole: "admin",
      });
      expect(staff.has("admin.access")).toBe(false);
      expect(staff.has("staff.internal.access")).toBe(false);
      expect(staff.has("admin.staff.manage")).toBe(false);
      expect(staff.size).toBe(0);
    }
  });

  it("grants capability administration only to active admin and owner Staff", () => {
    for (const staffRole of STAFF_ROLES) {
      const staff = capabilities({
        accountType: "individual",
        staffStatus: "active",
        staffRole,
      });
      expect(staff.has("admin.permissions.manage")).toBe(
        staffRole === "admin" || staffRole === "owner",
      );
    }
  });

  it("does not synthesize Staff identity from legacy account-family values", () => {
    expect(canonicalAccessContext({ accountType: "staff" })).toMatchObject({
      accountType: "individual",
      staffStatus: "none",
      staffRole: undefined,
    });
    expect(
      resolveEffectiveCapabilities({ accountType: "internal" }),
    ).not.toContain("staff.internal.access");
  });

  it("never derives Staff authority from a legacy role label alone", () => {
    const forged = capabilities({
      accountType: "individual",
      role: "admin",
      staffStatus: "active",
    });
    expect(forged.has("admin.access")).toBe(false);
    expect(forged.has("admin.staff.manage")).toBe(false);
  });

  it("keeps administration, moderation and refunds separate", () => {
    const admin = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "admin",
    });
    const moderator = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "moderator",
    });
    const finance = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "finance",
    });

    expect(admin.has("admin.configuration.manage")).toBe(true);
    expect(admin.has("moderation.action")).toBe(false);
    expect(admin.has("order.refund")).toBe(false);
    expect(admin.has("finance.platform.read")).toBe(true);
    expect(admin.has("finance.reconciliation.manage")).toBe(false);
    expect(moderator.has("moderation.action")).toBe(true);
    expect(moderator.has("user.suspend")).toBe(false);
    expect(moderator.has("finance.platform.read")).toBe(false);
    expect(finance.has("order.refund")).toBe(true);
    expect(finance.has("finance.platform.read")).toBe(true);
    expect(finance.has("finance.reconciliation.manage")).toBe(true);
    expect(finance.has("admin.configuration.manage")).toBe(false);
  });

  it("reserves complimentary commercial grants for the platform owner", () => {
    const commercial = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "commercial",
    });
    const admin = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "admin",
    });
    const owner = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "owner",
    });
    const finance = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "finance",
    });

    expect(commercial.has("monetization.plans.manage")).toBe(true);
    expect(commercial.has("monetization.complimentary_grants.request")).toBe(
      true,
    );
    expect(admin.has("monetization.trials.manage")).toBe(true);
    expect(admin.has("monetization.complimentary_grants.request")).toBe(true);
    expect(admin.has("monetization.complimentary_grants.create")).toBe(false);
    expect(owner.has("monetization.complimentary_grants.create")).toBe(true);
    expect(finance.has("monetization.subscriptions.read")).toBe(true);
    expect(finance.has("monetization.plans.manage")).toBe(false);
  });

  it("applies lifecycle restrictions after grants and direct overrides", () => {
    const suspended = capabilities({
      accountType: "individual",
      status: "suspended",
      customPermissions: ["admin.configuration.manage"],
    });
    expect(suspended.has("profile.read")).toBe(true);
    expect(suspended.has("listing.create")).toBe(false);
    expect(suspended.has("admin.configuration.manage")).toBe(false);
  });

  it("never grants Staff-only overrides without an active Staff status", () => {
    const customer = capabilities({
      accountType: "individual",
      customPermissions: ["admin.configuration.manage"],
    });
    const revokedStaff = capabilities({
      accountType: "individual",
      staffStatus: "revoked",
      staffRole: "admin",
      customPermissions: ["admin.configuration.manage", "listing.read"],
    });

    expect(customer.has("admin.configuration.manage")).toBe(false);
    expect(revokedStaff.has("admin.configuration.manage")).toBe(false);
    expect(revokedStaff.has("listing.read")).toBe(false);
  });

  it("allows only an explicit active-Staff grant to enter the isolated marketplace demo", () => {
    const staffTester = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "operations",
      customPermissions: ["staff.marketplace.demo"],
    });
    const ordinaryStaff = capabilities({
      accountType: "individual",
      staffStatus: "active",
      staffRole: "operations",
    });
    const customer = capabilities({
      accountType: "individual",
      customPermissions: ["staff.marketplace.demo"],
    });

    expect(staffTester.has("staff.marketplace.demo")).toBe(true);
    expect(ordinaryStaff.has("staff.marketplace.demo")).toBe(false);
    expect(customer.has("staff.marketplace.demo")).toBe(false);
    expect(staffTester.has("listing.publish")).toBe(false);
    expect(staffTester.has("payment.initiate")).toBe(false);
    expect(staffTester.has("message.send")).toBe(false);
  });

  it("requires a resolved Staff role even when the membership status says active", () => {
    const inconsistentMembership = capabilities({
      accountType: "individual",
      staffStatus: "active",
      customPermissions: ["staff.internal.access"],
    });
    const internalFact = resolveCapabilityFacts({
      accountType: "individual",
      staffStatus: "active",
      customPermissions: ["staff.internal.access"],
    }).find((fact) => fact.capability === "staff.internal.access");

    expect(inconsistentMembership.has("staff.internal.access")).toBe(false);
    expect(internalFact).toMatchObject({
      directlyGranted: true,
      effective: false,
      ineffectiveReason: "inactive_staff",
    });
  });

  it("explains role, direct, revoked, and inactive sources without widening authority", () => {
    const facts = resolveCapabilityFacts({
      accountType: "individual",
      staffStatus: "suspended",
      staffRole: "admin",
      customPermissions: ["staff.internal.access", "listing.read"],
      revokedPermissions: ["listing.create"],
    });
    const byId = new Map(facts.map((fact) => [fact.capability, fact]));

    expect(byId.get("staff.internal.access")).toMatchObject({
      fromStaffRole: true,
      directlyGranted: true,
      effective: false,
      ineffectiveReason: "inactive_staff",
    });
    expect(byId.get("listing.read")).toMatchObject({
      directlyGranted: true,
      effective: false,
      ineffectiveReason: "staff_separation",
    });
    expect(byId.get("listing.create")).toMatchObject({
      fromCustomerAccount: false,
      directlyRevoked: true,
      effective: false,
      ineffectiveReason: "directly_revoked",
    });
  });

  it.each([
    ["guest read", null, "listing.read", true, null],
    ["guest write", null, "listing.create", false, "unauthenticated"],
    [
      "individual seller",
      { accountType: "individual", status: "active" },
      "listing.create",
      true,
      null,
    ],
    [
      "pending seller",
      { accountType: "individual", status: "pending" },
      "listing.create",
      false,
      "account_status",
    ],
    [
      "banned public read",
      { accountType: "individual", status: "banned" },
      "listing.read",
      false,
      "account_status",
    ],
    [
      "finance refund",
      {
        accountType: "individual",
        staffStatus: "active",
        staffRole: "finance",
      },
      "order.refund",
      true,
      null,
    ],
    [
      "admin moderation",
      {
        accountType: "individual",
        staffStatus: "active",
        staffRole: "admin",
      },
      "moderation.action",
      false,
      "missing_capability",
    ],
    [
      "suspended staff",
      {
        accountType: "individual",
        staffStatus: "suspended",
        staffRole: "finance",
      },
      "order.refund",
      false,
      "inactive_staff",
    ],
  ] as const)(
    "returns an explainable decision for %s",
    (_label, subject, capability, allowed, denialReason) => {
      expect(evaluateAuthorization({ subject }, { capability })).toMatchObject({
        allowed,
        denialReason,
      });
    },
  );

  it("narrows capabilities with ownership, organization, market, verification, entitlement and flags", () => {
    const customer = {
      accountType: "professional" as const,
      professionalVertical: "generic" as const,
      status: "active" as const,
    };
    const actor = {
      subject: customer,
      subjectId: "user-1",
      organizationIds: ["org-1"],
      verification: { identity: true },
      entitlements: ["bulkPublish"],
      featureFlags: ["listing-v2"],
    };
    const requirement = {
      capability: "listing.update.own" as const,
      accountTypes: ["professional" as const],
      requiredVerification: ["identity" as const],
      entitlement: "bulkPublish",
      featureFlag: "listing-v2",
      market: { code: "FR", enabled: true },
      resourceScope: "owner_or_organization" as const,
      resource: { organizationId: "org-1" },
    };

    expect(evaluateAuthorization(actor, requirement).allowed).toBe(true);
    expect(
      evaluateAuthorization(actor, {
        ...requirement,
        resource: { organizationId: "org-2" },
      }).denialReason,
    ).toBe("resource_scope");
    expect(
      evaluateAuthorization({ ...actor, entitlements: [] }, requirement)
        .denialReason,
    ).toBe("entitlement_required");
    expect(
      evaluateAuthorization({ ...actor, verification: {} }, requirement)
        .denialReason,
    ).toBe("verification_required");
    expect(
      evaluateAuthorization({ ...actor, featureFlags: [] }, requirement)
        .denialReason,
    ).toBe("feature_disabled");
  });

  it("requires explicit market assignment for non-owner Staff", () => {
    const staff = {
      accountType: "individual" as const,
      status: "active" as const,
      staffStatus: "active" as const,
      staffRole: "market_manager" as const,
    };
    const requirement = {
      capability: "market.configure" as const,
      market: { code: "BE", enabled: true },
    };

    expect(
      evaluateAuthorization(
        { subject: staff, marketCodes: ["FR"] },
        requirement,
      ).denialReason,
    ).toBe("market_scope");
    expect(
      evaluateAuthorization(
        { subject: staff, marketCodes: ["BE"] },
        requirement,
      ).allowed,
    ).toBe(true);
    expect(
      evaluateAuthorization(
        {
          subject: { ...staff, staffRole: "owner" },
          marketCodes: [],
        },
        { ...requirement, capability: "market.manage" },
      ).allowed,
    ).toBe(true);
  });

  it("never re-derives a denied server capability from a presentation role", () => {
    expect(
      evaluateAuthorization(
        {
          subject: {
            accountType: "individual",
            staffStatus: "active",
            staffRole: "admin",
          },
          effectiveCapabilities: [],
        },
        { capability: "admin.access" },
      ).denialReason,
    ).toBe("missing_capability");
  });

  it("rejects a cross-plane capability even when an upstream projection contains it", () => {
    expect(
      evaluateAuthorization(
        {
          subject: {
            accountType: "individual",
            staffStatus: "active",
            staffRole: "admin",
          },
          effectiveCapabilities: ["listing.create"],
        },
        { capability: "listing.create" },
      ).denialReason,
    ).toBe("staff_separation");
  });

  it("does not let a stale capability projection bypass account lifecycle", () => {
    expect(
      evaluateAuthorization(
        {
          subject: { accountType: "individual", status: "banned" },
          effectiveCapabilities: ["listing.create"],
        },
        { capability: "listing.create" },
      ).denialReason,
    ).toBe("account_status");
    expect(
      evaluateAuthorization(
        {
          subject: { accountType: "individual", status: "suspended" },
          effectiveCapabilities: ["profile.read"],
        },
        { capability: "profile.read" },
      ).allowed,
    ).toBe(true);
  });

  it("asks a guest to sign in before evaluating identity-bound context", () => {
    expect(
      evaluateAuthorization(
        { subject: null },
        {
          capability: "listing.read",
          accountTypes: ["professional"],
          requiredVerification: ["identity"],
        },
      ),
    ).toMatchObject({
      allowed: false,
      denialReason: "unauthenticated",
      remediation: "sign_in",
    });
  });

  it("exhaustively preserves canonical grants across actor, status and capability combinations", () => {
    const subjects: Array<AccessSubject | null> = [
      null,
      ...ACCOUNT_STATUSES.map((status) => ({
        accountType: "individual" as const,
        status,
      })),
      ...PROFESSIONAL_VERTICALS.flatMap((professionalVertical) =>
        ACCOUNT_STATUSES.map((status) => ({
          accountType: "professional" as const,
          professionalVertical,
          status,
        })),
      ),
      ...STAFF_ROLES.flatMap((staffRole) =>
        STAFF_STATUSES.filter((staffStatus) => staffStatus !== "none").map(
          (staffStatus) => ({
            accountType: "individual" as const,
            status: "active" as const,
            staffStatus,
            staffRole,
          }),
        ),
      ),
    ];

    for (const subject of subjects) {
      for (const capability of CAPABILITIES) {
        const decision = evaluateAuthorization({ subject }, { capability });
        expect(decision.allowed).toBe(
          hasEffectiveCapability(subject, capability),
        );

        if (decision.allowed && capability.endsWith(".own")) {
          expect(
            evaluateAuthorization(
              { subject, subjectId: "actor" },
              {
                capability,
                resourceScope: "owner",
                resource: { ownerIds: ["actor"] },
              },
            ).allowed,
          ).toBe(true);
          expect(
            evaluateAuthorization(
              { subject, subjectId: "actor" },
              {
                capability,
                resourceScope: "owner",
                resource: { ownerIds: ["foreign"] },
              },
            ).denialReason,
          ).toBe("resource_scope");
        }
      }
    }
  });
});
