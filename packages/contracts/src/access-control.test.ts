import { describe, expect, it } from "vitest";
import {
  STAFF_ROLES,
  resolveEffectiveCapabilities,
  type AccessSubject,
} from "./access-control";

const capabilities = (subject: AccessSubject) =>
  new Set(resolveEffectiveCapabilities({ status: "active", ...subject }));

describe("canonical access-control policy", () => {
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
    "never grants customer capabilities implicitly to %s staff",
    (staffRole) => {
      const staff = capabilities({ accountType: "staff", staffRole });
      expect(staff.has("favorite.manage.own")).toBe(false);
      expect(staff.has("listing.create")).toBe(false);
      expect(staff.has("subscription.manage.own")).toBe(false);
    },
  );

  it("keeps administration, moderation and refunds separate", () => {
    const admin = capabilities({ accountType: "staff", staffRole: "admin" });
    const moderator = capabilities({
      accountType: "staff",
      staffRole: "moderator",
    });
    const finance = capabilities({
      accountType: "staff",
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
      accountType: "staff",
      staffRole: "commercial",
    });
    const admin = capabilities({ accountType: "staff", staffRole: "admin" });
    const owner = capabilities({ accountType: "staff", staffRole: "owner" });
    const finance = capabilities({
      accountType: "staff",
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
});
