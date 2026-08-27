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
  "analytics.platform.read",
  "analytics.marketing.read",
  "analytics.finance.read",
  "analytics.technical.read",
  "store.customization.manage",
  "subscription.manage.own",
  "subscription.upgrade",
  "monetization.manage",
  "monetization.pricing.update",
  "monetization.orders.read",
  "monetization.plans.read",
  "monetization.plans.manage",
  "monetization.pricing.manage",
  "monetization.promotions.read",
  "monetization.promotions.manage",
  "monetization.trials.manage",
  "monetization.subscriptions.read",
  "monetization.subscriptions.manage",
  "monetization.complimentary_grants.request",
  "monetization.complimentary_grants.create",
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
  "compliance.sensitive.read",
  "compliance.policy.read",
  "compliance.policy.manage",
  "compliance.retention.manage",
  "compliance.audit.read",
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
  "crm.prospecting.read",
  "crm.prospecting.profiles.manage",
  "crm.prospecting.discover",
  "crm.prospecting.import",
  "crm.prospecting.enrich",
  "crm.prospecting.score",
  "crm.prospecting.merge",
  "crm.prospecting.lists.manage",
  "crm.prospecting.campaigns.manage",
  "crm.prospecting.outreach.approve",
  "crm.prospecting.sources.manage",
  "crm.prospecting.compliance.manage",
  "crm.prospecting.analytics.read",
  "crm.prospecting.export",
  "crm.prospecting.convert_shongre",
  "crm.prospecting.internal_first_party",
  "crm.dashboard.read",
  "crm.accounts.read",
  "crm.accounts.create",
  "crm.accounts.update",
  "crm.accounts.delete",
  "crm.accounts.export",
  "crm.contacts.read",
  "crm.contacts.create",
  "crm.contacts.update",
  "crm.contacts.delete",
  "crm.contacts.export",
  "crm.pipelines.read",
  "crm.pipelines.manage",
  "crm.opportunities.read",
  "crm.opportunities.create",
  "crm.opportunities.update",
  "crm.opportunities.transition",
  "crm.opportunities.delete",
  "crm.opportunities.export",
  "crm.tasks.read",
  "crm.tasks.create",
  "crm.tasks.complete",
  "crm.tasks.manage",
  "crm.activities.read",
  "crm.activities.create",
  "crm.activities.manage",
  "crm.analytics.read",
  "crm.automation.manage",
  "crm.email.send",
  "crm.email.read",
  "crm.email.templates.manage",
  "crm.ai.use",
  "crm.configuration.manage",
  "crm.products.read",
  "crm.products.manage",
  "crm.quotes.read",
  "crm.quotes.create",
  "crm.quotes.manage",
  "crm.custom_fields.read",
  "crm.custom_fields.manage",
  "marketing.dashboard.read",
  "marketing.profiles.read",
  "marketing.profiles.manage",
  "marketing.profiles.export",
  "marketing.lists.read",
  "marketing.lists.manage",
  "marketing.segments.read",
  "marketing.segments.manage",
  "marketing.campaigns.read",
  "marketing.campaigns.create",
  "marketing.campaigns.update",
  "marketing.campaigns.approve",
  "marketing.campaigns.send",
  "marketing.campaigns.pause",
  "marketing.campaigns.cancel",
  "marketing.templates.read",
  "marketing.templates.manage",
  "marketing.automation.read",
  "marketing.automation.manage",
  "marketing.analytics.read",
  "marketing.senders.manage",
  "marketing.domains.manage",
  "marketing.compliance.read",
  "marketing.compliance.manage",
  "marketing.settings.manage",
  "commercial_rules.read",
  "commercial_rules.edit",
  "commercial_rules.approve",
  "commercial_rules.publish",
  "commissions.read",
  "commissions.simulate",
  "commissions.manage",
  "commissions.publish",
  "commissions.override_account",
  "commissions.promotions.manage",
  "commissions.analytics.read",
  "finance.commission_revenue.read",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const CRM_COMMERCIAL_CAPABILITIES = [
  "crm.access",
  "crm.contact.read",
  "crm.contact.manage",
  "crm.company.read",
  "crm.company.manage",
  "crm.opportunity.read",
  "crm.opportunity.manage",
  "crm.ai_prospecting.use",
  "crm.prospecting.read",
  "crm.prospecting.discover",
  "crm.prospecting.import",
  "crm.prospecting.enrich",
  "crm.prospecting.score",
  "crm.prospecting.lists.manage",
  "crm.prospecting.campaigns.manage",
  "crm.prospecting.analytics.read",
  "crm.prospecting.convert_shongre",
  "crm.dashboard.read",
  "crm.accounts.read",
  "crm.accounts.create",
  "crm.accounts.update",
  "crm.accounts.export",
  "crm.contacts.read",
  "crm.contacts.create",
  "crm.contacts.update",
  "crm.contacts.export",
  "crm.pipelines.read",
  "crm.opportunities.read",
  "crm.opportunities.create",
  "crm.opportunities.update",
  "crm.opportunities.transition",
  "crm.tasks.read",
  "crm.tasks.create",
  "crm.tasks.complete",
  "crm.tasks.manage",
  "crm.activities.read",
  "crm.activities.create",
  "crm.activities.manage",
  "crm.analytics.read",
  "crm.email.send",
  "crm.email.read",
  "crm.ai.use",
  "crm.products.read",
  "crm.quotes.read",
  "crm.quotes.create",
  "crm.custom_fields.read",
] as const satisfies readonly Capability[];

const CRM_ADMIN_CAPABILITIES = [
  ...CRM_COMMERCIAL_CAPABILITIES,
  "crm.accounts.delete",
  "crm.contacts.delete",
  "crm.pipelines.manage",
  "crm.opportunities.delete",
  "crm.opportunities.export",
  "crm.contacts.export",
  "crm.prospecting.profiles.manage",
  "crm.prospecting.merge",
  "crm.prospecting.outreach.approve",
  "crm.prospecting.sources.manage",
  "crm.prospecting.compliance.manage",
  "crm.prospecting.export",
  "crm.prospecting.internal_first_party",
  "crm.automation.manage",
  "crm.email.templates.manage",
  "crm.configuration.manage",
  "crm.products.manage",
  "crm.quotes.manage",
  "crm.custom_fields.manage",
] as const satisfies readonly Capability[];

const MARKETING_EDITOR_CAPABILITIES = [
  "marketing.dashboard.read",
  "marketing.profiles.read",
  "marketing.lists.read",
  "marketing.lists.manage",
  "marketing.segments.read",
  "marketing.segments.manage",
  "marketing.campaigns.read",
  "marketing.campaigns.create",
  "marketing.campaigns.update",
  "marketing.campaigns.send",
  "marketing.campaigns.pause",
  "marketing.campaigns.cancel",
  "marketing.templates.read",
  "marketing.templates.manage",
  "marketing.analytics.read",
  "marketing.compliance.read",
] as const satisfies readonly Capability[];

const MARKETING_ADMIN_CAPABILITIES = [
  ...MARKETING_EDITOR_CAPABILITIES,
  "marketing.profiles.manage",
  "marketing.profiles.export",
  "marketing.campaigns.approve",
  "marketing.automation.read",
  "marketing.automation.manage",
  "marketing.senders.manage",
  "marketing.domains.manage",
  "marketing.compliance.manage",
  "marketing.settings.manage",
] as const satisfies readonly Capability[];

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
  ...CRM_COMMERCIAL_CAPABILITIES,
  ...MARKETING_EDITOR_CAPABILITIES,
  "finance.organization.read.own",
  "subscription.manage.own",
  "subscription.upgrade",
  "crm.prospecting.read",
  "crm.prospecting.profiles.manage",
  "crm.prospecting.discover",
  "crm.prospecting.import",
  "crm.prospecting.enrich",
  "crm.prospecting.score",
  "crm.prospecting.lists.manage",
  "crm.prospecting.campaigns.manage",
  "crm.prospecting.analytics.read",
  "crm.prospecting.convert_shongre",
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
      "commissions.read",
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
      "compliance.audit.read",
      "report.review",
      "audit.read",
    ],
    compliance: [
      "admin.access",
      "user.read",
      "user.verify",
      "compliance.review",
      "compliance.restrict_account",
      "compliance.sensitive.read",
      "compliance.policy.read",
      "compliance.policy.manage",
      "compliance.retention.manage",
      "compliance.audit.read",
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
      "monetization.plans.read",
      "monetization.promotions.read",
      "monetization.subscriptions.read",
      "commercial_rules.read",
      "commercial_rules.approve",
      "commissions.read",
      "commissions.simulate",
      "commissions.manage",
      "commissions.analytics.read",
      "finance.commission_revenue.read",
      "analytics.finance.read",
      "audit.read",
    ],
    operations: [
      "admin.access",
      "staff.operations.access",
      "user.read",
      "provider.read",
      "provider.configuration.read",
      "provider.health.read",
      "analytics.platform.read",
      "analytics.technical.read",
    ],
    commercial: [
      "admin.access",
      "staff.commercial.access",
      "user.read",
      ...CRM_COMMERCIAL_CAPABILITIES,
      "marketing.dashboard.read",
      "marketing.profiles.read",
      "marketing.lists.read",
      "marketing.segments.read",
      "marketing.campaigns.read",
      "marketing.analytics.read",
      "analytics.platform.read",
      "analytics.marketing.read",
      "commercial_rules.read",
      "commercial_rules.edit",
      "monetization.plans.read",
      "monetization.plans.manage",
      "monetization.pricing.manage",
      "monetization.promotions.read",
      "monetization.promotions.manage",
      "monetization.trials.manage",
      "monetization.subscriptions.read",
      "monetization.subscriptions.manage",
      "monetization.complimentary_grants.request",
      "commissions.read",
      "commissions.simulate",
      "commissions.promotions.manage",
    ],
    content_manager: [
      "admin.access",
      "taxonomy.manage",
      "listing.feature",
      ...MARKETING_EDITOR_CAPABILITIES,
      "analytics.marketing.read",
    ],
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
      "analytics.platform.read",
      "analytics.marketing.read",
      "analytics.technical.read",
      ...MARKETING_EDITOR_CAPABILITIES,
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
      "monetization.plans.read",
      "monetization.plans.manage",
      "monetization.pricing.manage",
      "monetization.promotions.read",
      "monetization.promotions.manage",
      "monetization.trials.manage",
      "monetization.subscriptions.read",
      "monetization.subscriptions.manage",
      "monetization.complimentary_grants.request",
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
      "commissions.read",
      "commissions.simulate",
      "commissions.manage",
      "commissions.publish",
      "commissions.override_account",
      "commissions.promotions.manage",
      "commissions.analytics.read",
      "finance.commission_revenue.read",
      "analytics.platform.read",
      "analytics.marketing.read",
      "analytics.finance.read",
      "analytics.technical.read",
      ...CRM_ADMIN_CAPABILITIES,
      ...MARKETING_ADMIN_CAPABILITIES,
    ],
    owner: [
      "admin.access",
      "admin.configuration.manage",
      "admin.staff.manage",
      "admin.permissions.manage",
      "compliance.policy.read",
      "compliance.policy.manage",
      "compliance.retention.manage",
      "compliance.audit.read",
      "user.read",
      "user.manage",
      "market.manage",
      "market.configure",
      "taxonomy.manage",
      "monetization.manage",
      "monetization.pricing.update",
      "monetization.plans.read",
      "monetization.plans.manage",
      "monetization.pricing.manage",
      "monetization.promotions.read",
      "monetization.promotions.manage",
      "monetization.trials.manage",
      "monetization.subscriptions.read",
      "monetization.subscriptions.manage",
      "monetization.complimentary_grants.request",
      "monetization.complimentary_grants.create",
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
      "commissions.read",
      "commissions.simulate",
      "commissions.manage",
      "commissions.publish",
      "commissions.override_account",
      "commissions.promotions.manage",
      "commissions.analytics.read",
      "finance.commission_revenue.read",
      "analytics.platform.read",
      "analytics.marketing.read",
      "analytics.finance.read",
      "analytics.technical.read",
      ...CRM_ADMIN_CAPABILITIES,
      ...MARKETING_ADMIN_CAPABILITIES,
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
