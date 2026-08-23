/**
 * Canonical Shongre access-control vocabulary and deterministic policy resolver.
 *
 * This package is the shared public contract used by the frontend and backend.
 * It deliberately separates customer account family, professional vertical,
 * staff role, account status and direct capability overrides. Resource
 * ownership and organization scope remain request/resource-level decisions.
 */

export const ACCOUNT_TYPES = ["individual", "professional", "staff"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type LegacyAccountType = AccountType | "internal";

export const PROFESSIONAL_VERTICALS = [
  "generic",
  "real_estate",
  "automotive",
  "education",
  "employment",
] as const;
export type ProfessionalVertical = (typeof PROFESSIONAL_VERTICALS)[number];

export const STAFF_ROLES = [
  "support_agent",
  "moderator",
  "trust_safety",
  "compliance",
  "finance",
  "operations",
  "commercial",
  "content_manager",
  "market_manager",
  "admin",
  "owner",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "pending",
  "active",
  "restricted",
  "suspended",
  "banned",
  "closed",
] as const;
export type CanonicalAccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type AccountStatus =
  | CanonicalAccountStatus
  | "pending_verification"
  | "limited"
  | "disabled"
  | "archived"
  | "deleted";

export const PLATFORM_ROLES = [
  "guest",
  "buyer",
  "seller",
  "individual_buyer",
  "individual_seller",
  "pro_seller",
  "support",
  "moderator",
  "operations",
  "finance",
  "commercial",
  "content_manager",
  "market_manager",
  "admin",
  "super_admin",
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const CAPABILITIES = [
  "profile.read",
  "profile.update.own",
  "seller.profile.read",
  "seller.profile.update.own",
  "listing.read",
  "listing.create",
  "listing.update.own",
  "listing.delete.own",
  "listing.publish",
  "listing.mark_reserved",
  "listing.mark_sold",
  "listing.promote",
  "listing.moderate",
  "listing.feature",
  "listing.bulk_import",
  "message.read.own",
  "message.send",
  "message.block",
  "conversation.manage.own",
  "conversation.audit.privileged",
  "favorite.manage.own",
  "saved_search.manage.own",
  "order.create",
  "order.read.own",
  "order.manage.seller",
  "order.refund",
  "transaction.audit.finance",
  "finance.account.read.own",
  "finance.organization.read.own",
  "finance.platform.read",
  "finance.transactions.read",
  "finance.reconciliation.manage",
  "finance.payouts.manage",
  "finance.adjustments.create",
  "finance.exports.read",
  "payment.initiate",
  "payment.refund",
  "review.create",
  "review.update.own",
  "review.moderate",
  "store.manage.own",
  "store.analytics.read.own",
  "store.customization.manage",
  "subscription.manage.own",
  "subscription.upgrade",
  "monetization.manage",
  "monetization.pricing.update",
  "monetization.orders.read",
  "user.read",
  "user.manage",
  "user.suspend",
  "user.reactivate",
  "user.verify",
  "staff.support.access",
  "staff.operations.access",
  "staff.finance.access",
  "staff.commercial.access",
  "support.case.read",
  "support.case.manage",
  "compliance.review",
  "compliance.restrict_account",
  "report.create",
  "report.review",
  "moderation.review",
  "moderation.action",
  "market.manage",
  "market.configure",
  "taxonomy.manage",
  "course.read",
  "course.request.create",
  "course.profile.manage.own",
  "course.offer.manage.own",
  "course.lead.read.own",
  "course.lead.respond.own",
  "course.organization.manage.own",
  "course.booking.create",
  "course.admin.manage",
  "auto.read",
  "auto.vehicle.manage.own",
  "auto.dealer.manage.own",
  "auto.lead.manage.own",
  "auto.inventory.import.own",
  "auto.admin.manage",
  "immo.read",
  "immo.property.manage.own",
  "immo.agency.manage.own",
  "immo.lead.manage.own",
  "immo.inventory.import.own",
  "immo.admin.manage",
  "employment.read",
  "employment.candidate.manage.own",
  "employment.job.manage.own",
  "employment.recruiter.manage.own",
  "employment.application.manage.own",
  "employment.import.own",
  "employment.admin.manage",
  "provider.read",
  "provider.manage",
  "provider.configuration.read",
  "provider.configuration.manage",
  "provider.routing.manage",
  "provider.credentials.status.read",
  "provider.credentials.manage",
  "provider.health.read",
  "provider.test",
  "admin.access",
  "admin.configuration.manage",
  "admin.staff.manage",
  "admin.permissions.manage",
  "role.manage",
  "permission.manage",
  "audit.read",
  "crm.access",
  "crm.contact.read",
  "crm.contact.manage",
  "crm.company.read",
  "crm.company.manage",
  "crm.opportunity.read",
  "crm.opportunity.manage",
  "crm.ai_prospecting.use",
  "commercial_rules.read",
  "commercial_rules.edit",
  "commercial_rules.approve",
  "commercial_rules.publish",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const PUBLIC_CAPABILITIES = [
  "profile.read",
  "seller.profile.read",
  "listing.read",
  "report.create",
  "course.read",
  "auto.read",
  "immo.read",
  "employment.read",
] as const satisfies readonly Capability[];

const CUSTOMER_CORE_CAPABILITIES = [
  ...PUBLIC_CAPABILITIES,
  "profile.update.own",
  "seller.profile.update.own",
  "favorite.manage.own",
  "saved_search.manage.own",
  "message.read.own",
  "message.send",
  "message.block",
  "conversation.manage.own",
  "order.create",
  "order.read.own",
  "finance.account.read.own",
  "payment.initiate",
  "review.create",
  "review.update.own",
] as const satisfies readonly Capability[];

const INDIVIDUAL_CAPABILITIES = [
  ...CUSTOMER_CORE_CAPABILITIES,
  "listing.create",
  "listing.update.own",
  "listing.delete.own",
  "listing.publish",
  "listing.mark_reserved",
  "listing.mark_sold",
  "listing.promote",
  "order.manage.seller",
  "course.request.create",
  "course.booking.create",
  "course.profile.manage.own",
  "course.offer.manage.own",
  "course.lead.read.own",
  "course.lead.respond.own",
  "auto.vehicle.manage.own",
  "immo.property.manage.own",
  "employment.candidate.manage.own",
  "employment.job.manage.own",
] as const satisfies readonly Capability[];

const PROFESSIONAL_CORE_CAPABILITIES = [
  ...CUSTOMER_CORE_CAPABILITIES,
  "finance.organization.read.own",
  "subscription.manage.own",
  "subscription.upgrade",
] as const satisfies readonly Capability[];

export const VERTICAL_CAPABILITIES: Record<
  ProfessionalVertical,
  readonly Capability[]
> = {
  generic: [
    "listing.create",
    "listing.update.own",
    "listing.delete.own",
    "listing.publish",
    "listing.mark_reserved",
    "listing.mark_sold",
    "listing.promote",
    "listing.bulk_import",
    "order.manage.seller",
    "store.manage.own",
    "store.analytics.read.own",
    "store.customization.manage",
  ],
  real_estate: [
    "immo.property.manage.own",
    "immo.agency.manage.own",
    "immo.lead.manage.own",
    "immo.inventory.import.own",
  ],
  automotive: [
    "auto.vehicle.manage.own",
    "auto.dealer.manage.own",
    "auto.lead.manage.own",
    "auto.inventory.import.own",
  ],
  education: [
    "course.offer.manage.own",
    "course.lead.read.own",
    "course.lead.respond.own",
    "course.organization.manage.own",
  ],
  employment: [
    "employment.job.manage.own",
    "employment.recruiter.manage.own",
    "employment.application.manage.own",
    "employment.import.own",
  ],
};

export const STAFF_ROLE_CAPABILITIES: Record<StaffRole, readonly Capability[]> =
  {
    support_agent: [
      "admin.access",
      "staff.support.access",
      "support.case.read",
      "support.case.manage",
      "user.read",
      "provider.read",
      "provider.health.read",
    ],
    moderator: [
      "admin.access",
      "profile.read",
      "listing.read",
      "listing.moderate",
      "report.review",
      "moderation.review",
      "moderation.action",
      "review.moderate",
      "user.read",
    ],
    trust_safety: [
      "admin.access",
      "user.read",
      "user.verify",
      "user.suspend",
      "user.reactivate",
      "compliance.review",
      "compliance.restrict_account",
      "report.review",
      "audit.read",
    ],
    compliance: [
      "admin.access",
      "user.read",
      "user.verify",
      "compliance.review",
      "compliance.restrict_account",
      "audit.read",
    ],
    finance: [
      "admin.access",
      "staff.finance.access",
      "transaction.audit.finance",
      "finance.platform.read",
      "finance.transactions.read",
      "finance.reconciliation.manage",
      "finance.payouts.manage",
      "finance.adjustments.create",
      "finance.exports.read",
      "payment.refund",
      "order.refund",
      "monetization.orders.read",
      "commercial_rules.read",
      "commercial_rules.approve",
      "audit.read",
    ],
    operations: [
      "admin.access",
      "staff.operations.access",
      "user.read",
      "provider.read",
      "provider.configuration.read",
      "provider.health.read",
    ],
    commercial: [
      "admin.access",
      "staff.commercial.access",
      "user.read",
      "crm.access",
      "crm.contact.read",
      "crm.contact.manage",
      "crm.company.read",
      "crm.company.manage",
      "crm.opportunity.read",
      "crm.opportunity.manage",
      "crm.ai_prospecting.use",
      "commercial_rules.read",
      "commercial_rules.edit",
    ],
    content_manager: ["admin.access", "taxonomy.manage", "listing.feature"],
    market_manager: [
      "admin.access",
      "market.manage",
      "market.configure",
      "taxonomy.manage",
      "listing.feature",
      "provider.read",
      "provider.configuration.read",
      "provider.configuration.manage",
      "provider.health.read",
      "course.admin.manage",
      "auto.admin.manage",
      "immo.admin.manage",
      "employment.admin.manage",
    ],
    admin: [
      "admin.access",
      "admin.configuration.manage",
      "admin.staff.manage",
      "user.read",
      "user.manage",
      "market.manage",
      "market.configure",
      "taxonomy.manage",
      "monetization.manage",
      "monetization.pricing.update",
      "finance.platform.read",
      "finance.transactions.read",
      "finance.exports.read",
      "provider.read",
      "provider.manage",
      "provider.configuration.read",
      "provider.configuration.manage",
      "provider.routing.manage",
      "provider.credentials.status.read",
      "provider.health.read",
      "provider.test",
      "course.admin.manage",
      "auto.admin.manage",
      "immo.admin.manage",
      "employment.admin.manage",
      "role.manage",
      "audit.read",
      "commercial_rules.read",
      "commercial_rules.edit",
      "commercial_rules.approve",
      "commercial_rules.publish",
    ],
    owner: [
      "admin.access",
      "admin.configuration.manage",
      "admin.staff.manage",
      "admin.permissions.manage",
      "user.read",
      "user.manage",
      "market.manage",
      "market.configure",
      "taxonomy.manage",
      "monetization.manage",
      "monetization.pricing.update",
      "finance.platform.read",
      "finance.transactions.read",
      "finance.reconciliation.manage",
      "finance.payouts.manage",
      "finance.adjustments.create",
      "finance.exports.read",
      "provider.read",
      "provider.manage",
      "provider.configuration.read",
      "provider.configuration.manage",
      "provider.routing.manage",
      "provider.credentials.status.read",
      "provider.credentials.manage",
      "provider.health.read",
      "provider.test",
      "role.manage",
      "permission.manage",
      "audit.read",
      "commercial_rules.read",
      "commercial_rules.edit",
      "commercial_rules.approve",
      "commercial_rules.publish",
    ],
  };

export interface AccessSubject {
  accountType?: LegacyAccountType;
  primaryRole?: string;
  role?: string;
  staffRole?: StaffRole;
  professionalVertical?: ProfessionalVertical;
  status?: AccountStatus;
  customPermissions?: readonly Capability[];
  revokedPermissions?: readonly Capability[];
}

export interface CanonicalAccessContext {
  accountType: AccountType | "guest";
  staffRole?: StaffRole;
  professionalVertical?: ProfessionalVertical;
  status: CanonicalAccountStatus;
}

export function normalizeAccountType(
  accountType: LegacyAccountType | undefined,
  role?: string,
): AccountType | "guest" {
  if (!accountType && (!role || role === "guest")) return "guest";
  if (!accountType && staffRoleFromLegacyRole(role)) return "staff";
  if (accountType === "internal" || accountType === "staff") return "staff";
  if (accountType === "professional" || role === "pro_seller")
    return "professional";
  return "individual";
}

export function normalizeAccountStatus(
  status: AccountStatus | undefined,
): CanonicalAccountStatus {
  switch (status) {
    case "pending_verification":
      return "pending";
    case "limited":
      return "restricted";
    case "disabled":
    case "archived":
    case "deleted":
      return "closed";
    default:
      return status ?? "active";
  }
}

export function staffRoleFromLegacyRole(role?: string): StaffRole | undefined {
  switch (role) {
    case "support":
      return "support_agent";
    case "moderator":
      return "moderator";
    case "operations":
      return "operations";
    case "finance":
      return "finance";
    case "commercial":
      return "commercial";
    case "content_manager":
      return "content_manager";
    case "market_manager":
      return "market_manager";
    case "admin":
      return "admin";
    case "super_admin":
      return "owner";
    default:
      return undefined;
  }
}

export function canonicalAccessContext(
  subject: AccessSubject | null | undefined,
): CanonicalAccessContext {
  if (!subject) return { accountType: "guest", status: "active" };
  const role = subject.primaryRole ?? subject.role;
  const accountType = normalizeAccountType(subject.accountType, role);
  return {
    accountType,
    staffRole:
      accountType === "staff"
        ? (subject.staffRole ?? staffRoleFromLegacyRole(role))
        : undefined,
    professionalVertical:
      accountType === "professional"
        ? (subject.professionalVertical ?? "generic")
        : undefined,
    status: normalizeAccountStatus(subject.status),
  };
}

const RESTRICTED_CAPABILITIES = new Set<Capability>([
  "profile.read",
  "profile.update.own",
  "message.read.own",
  "order.read.own",
  "report.create",
]);

const SUSPENDED_CAPABILITIES = new Set<Capability>([
  "profile.read",
  "message.read.own",
  "order.read.own",
  "report.create",
]);

/** Resolve effective coarse-grained capabilities. Deny-by-default. */
export function resolveEffectiveCapabilities(
  subject: AccessSubject | null | undefined,
): Capability[] {
  const context = canonicalAccessContext(subject);
  const capabilities = new Set<Capability>();

  if (context.accountType === "guest") {
    PUBLIC_CAPABILITIES.forEach((capability) => capabilities.add(capability));
  } else if (context.accountType === "staff") {
    if (context.staffRole) {
      STAFF_ROLE_CAPABILITIES[context.staffRole].forEach((capability) =>
        capabilities.add(capability),
      );
    }
  } else if (context.accountType === "professional") {
    PROFESSIONAL_CORE_CAPABILITIES.forEach((capability) =>
      capabilities.add(capability),
    );
    VERTICAL_CAPABILITIES[context.professionalVertical ?? "generic"].forEach(
      (capability) => capabilities.add(capability),
    );
  } else {
    INDIVIDUAL_CAPABILITIES.forEach((capability) =>
      capabilities.add(capability),
    );
  }

  subject?.customPermissions?.forEach((capability) =>
    capabilities.add(capability),
  );
  subject?.revokedPermissions?.forEach((capability) =>
    capabilities.delete(capability),
  );

  if (context.status === "restricted") {
    return [...capabilities].filter((capability) =>
      RESTRICTED_CAPABILITIES.has(capability),
    );
  }
  if (context.status === "suspended") {
    return [...capabilities].filter((capability) =>
      SUSPENDED_CAPABILITIES.has(capability),
    );
  }
  if (context.status === "banned" || context.status === "closed") return [];
  if (context.status === "pending") {
    return [...capabilities].filter(
      (capability) =>
        PUBLIC_CAPABILITIES.includes(
          capability as (typeof PUBLIC_CAPABILITIES)[number],
        ) ||
        capability === "profile.update.own" ||
        capability === "report.create",
    );
  }
  return [...capabilities];
}

export function hasEffectiveCapability(
  subject: AccessSubject | null | undefined,
  capability: Capability,
): boolean {
  return resolveEffectiveCapabilities(subject).includes(capability);
}

export function accessSubjectForLegacyRole(
  role: PlatformRole,
): AccessSubject | null {
  if (role === "guest") return null;
  if (role === "pro_seller") {
    return {
      accountType: "professional",
      role,
      professionalVertical: "generic",
    };
  }
  const staffRole = staffRoleFromLegacyRole(role);
  if (staffRole) return { accountType: "staff", role, staffRole };
  return { accountType: "individual", role };
}

export function capabilitiesForLegacyRole(role: PlatformRole): Capability[] {
  return resolveEffectiveCapabilities(accessSubjectForLegacyRole(role));
}
