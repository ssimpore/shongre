import {
  ACCOUNT_TYPES,
  canonicalAccessContext,
  resolveEffectiveCapabilities,
  type AccountType,
  type Capability,
} from "@shongre/contracts/access-control";
import type { UserProfile } from "../types";
import type { ShongreProductId } from "../types";
import { hasProductAccess } from "../domains/user/user.domain";

export type RouteAccessClass =
  "authenticated" | "customer" | "professional" | "staff_capability";

export interface RoutePolicy {
  path: string;
  access: RouteAccessClass;
  capability?: Capability;
  alternativeCapabilities?: readonly Capability[];
  accountTypes: readonly AccountType[];
  requiresActiveStaff?: boolean;
  productId?: ShongreProductId;
}

const customer = (path: string, capability?: Capability): RoutePolicy => ({
  path,
  access: "customer",
  capability,
  accountTypes: ["individual", "professional"],
});

const professional = (path: string, capability: Capability): RoutePolicy => ({
  path,
  access: "professional",
  capability,
  accountTypes: ["professional"],
});

const staff = (path: string, capability: Capability): RoutePolicy => ({
  path,
  access: "staff_capability",
  capability,
  accountTypes: ACCOUNT_TYPES,
  requiresActiveStaff: true,
});

/**
 * Canonical policy inventory for every protected frontend route.
 *
 * Public routes remain explicit in the router because they have no access
 * policy. Protected navigation and router guards both read this registry.
 */
export const ROUTE_POLICIES = {
  staffMfa: {
    path: "/securite-interne",
    access: "authenticated",
    accountTypes: ACCOUNT_TYPES,
    requiresActiveStaff: true,
    capability: undefined,
    alternativeCapabilities: undefined,
  },
  publishListing: customer("/deposer", "listing.create"),
  publishCourse: customer("/deposer/education", "course.profile.manage.own"),
  publishAuto: customer("/deposer/auto", "auto.vehicle.manage.own"),
  publishRealEstate: customer("/deposer/immo", "immo.property.manage.own"),
  publishEmployment: customer("/deposer/emploi", "employment.job.manage.own"),
  applyEmployment: customer(
    "/emploi/offre/:slug/postuler",
    "employment.candidate.manage.own",
  ),
  requestCourse: customer("/education/demande", "course.request.create"),
  messagesShortcut: customer("/messages", "message.read.own"),

  accountOverview: customer("/compte"),
  accountListings: customer("/compte/annonces", "listing.create"),
  accountFavorites: customer("/compte/favoris", "favorite.manage.own"),
  accountSavedSearches: customer(
    "/compte/recherches",
    "saved_search.manage.own",
  ),
  accountMessages: customer("/compte/messages", "message.read.own"),
  accountNotifications: customer("/compte/notifications"),
  accountNotificationPreferences: customer("/compte/notifications/preferences"),
  accountPurchases: customer("/compte/achats", "order.read.own"),
  accountDigitalPurchases: customer(
    "/compte/achats-numeriques",
    "order.read.own",
  ),
  accountDigitalSeller: customer(
    "/compte/produits-numeriques",
    "listing.create",
  ),
  accountFinances: customer("/compte/finances", "finance.account.read.own"),
  accountVerification: customer("/compte/verification"),
  accountSecurity: customer("/compte/securite-compte"),
  accountType: customer("/compte/type-de-compte"),
  accountSupport: customer("/compte/support"),
  accountModerationAppeals: customer("/compte/recours", "report.create"),
  accountSupportDetail: customer("/compte/support/:id"),
  accountNewsletter: customer("/compte/newsletter"),
  accountProfile: customer("/compte/profil", "profile.update.own"),
  accountCourse: customer("/compte/education", "course.profile.manage.own"),
  accountCourseOrganization: professional(
    "/compte/education/organisation",
    "course.organization.manage.own",
  ),
  accountAuto: professional("/compte/auto", "auto.dealer.manage.own"),
  accountRealEstate: professional("/compte/immo", "immo.agency.manage.own"),
  accountEmploymentCandidate: customer(
    "/compte/emploi",
    "employment.candidate.manage.own",
  ),
  accountEmploymentRecruiter: professional(
    "/compte/emploi/recruteur",
    "employment.recruiter.manage.own",
  ),
  accountProDashboard: professional(
    "/compte/pro/tableau-de-bord",
    "store.analytics.read.own",
  ),
  accountProProspects: professional(
    "/compte/pro/prospects",
    "crm.prospecting.read",
  ),
  accountProStorefront: professional(
    "/compte/pro/vitrine",
    "store.customization.manage",
  ),
  accountProSubscriptions: professional(
    "/compte/pro/abonnements",
    "subscription.manage.own",
  ),
  accountProFinances: professional(
    "/compte/pro/finances",
    "finance.organization.read.own",
  ),
  standaloneProspects: {
    ...professional("/app", "crm.prospecting.read"),
    productId: "prospects",
  },
  standaloneInvoicing: {
    ...professional("/facturation/app", "invoice.read"),
    productId: "facturation",
  },

  adminOverview: staff("/admin", "admin.access"),
  adminAnalytics: {
    ...staff("/admin/analytics", "analytics.platform.read"),
    alternativeCapabilities: [
      "analytics.marketing.read",
      "analytics.finance.read",
      "analytics.technical.read",
    ],
  },
  adminSupport: staff("/admin/support", "support.case.read"),
  adminModeration: {
    ...staff("/admin/moderation", "moderation.review"),
    alternativeCapabilities: ["report.review", "listing.moderate"],
  },
  adminDigitalProducts: staff(
    "/admin/produits-numeriques",
    "moderation.review",
  ),
  adminUsers: staff("/admin/utilisateurs", "user.read"),
  adminVerifications: {
    ...staff("/admin/verifications", "compliance.review"),
  },
  adminMarkets: staff("/admin/marches", "market.manage"),
  adminProviders: staff("/admin/fournisseurs", "provider.read"),
  adminProviderDetail: staff(
    "/admin/fournisseurs/:providerId",
    "provider.read",
  ),
  adminTaxonomy: staff("/admin/taxonomie", "taxonomy.manage"),
  adminTaxonomyAlias: staff("/admin/taxonomy", "taxonomy.manage"),
  adminMonetization: staff("/admin/monetisation", "monetization.manage"),
  adminFinance: staff("/admin/finance", "finance.platform.read"),
  adminTrending: staff("/admin/tendances", "admin.configuration.manage"),
  adminFeatureFlags: staff(
    "/admin/fonctionnalites",
    "admin.configuration.manage",
  ),
  adminSolutions: staff("/admin/solutions", "admin.configuration.manage"),
  adminRoles: {
    ...staff("/admin/roles", "role.manage"),
    alternativeCapabilities: ["permission.manage"],
  },
  adminAudit: staff("/admin/audit", "audit.read"),
  adminMarketing: staff("/admin/marketing", "marketing.dashboard.read"),
  adminNewsletter: staff("/admin/newsletter", "marketing.dashboard.read"),
  adminCourse: staff("/admin/education", "course.admin.manage"),
  adminAuto: staff("/admin/auto", "auto.admin.manage"),
  adminRealEstate: staff("/admin/immo", "immo.admin.manage"),
  adminEmployment: staff("/admin/emploi", "employment.admin.manage"),
  adminCrm: staff("/admin/crm", "crm.access"),
  adminCrmContacts: staff("/admin/crm/contacts", "crm.contact.read"),
  adminCrmContactDetail: staff("/admin/crm/contacts/:id", "crm.contact.read"),
  adminCrmCompanies: staff("/admin/crm/entreprises", "crm.company.read"),
  adminCrmCompanyDetail: staff(
    "/admin/crm/entreprises/:id",
    "crm.company.read",
  ),
  adminCrmPipeline: staff("/admin/crm/pipeline", "crm.opportunity.read"),
  adminCrmOpportunityDetail: staff(
    "/admin/crm/opportunites/:id",
    "crm.opportunities.read",
  ),
  adminCrmProspecting: staff("/admin/crm/prospection", "crm.prospecting.read"),
  adminCrmTasks: staff("/admin/crm/taches", "crm.access"),
  adminCrmProducts: staff("/admin/crm/produits", "crm.products.read"),
  adminCrmAutomations: staff("/admin/crm/automations", "crm.automation.manage"),
  adminCrmReports: staff("/admin/crm/rapports", "crm.analytics.read"),
  adminCrmConfiguration: staff(
    "/admin/crm/configuration",
    "crm.configuration.manage",
  ),
  adminCrmPipelineSettings: staff(
    "/admin/crm/configuration/pipelines",
    "crm.pipelines.read",
  ),
  adminCrmCustomFields: staff(
    "/admin/crm/configuration/champs",
    "crm.custom_fields.read",
  ),
} as const satisfies Record<string, RoutePolicy>;

export type RoutePolicyId = keyof typeof ROUTE_POLICIES;

export function requiredRouteCapability(id: RoutePolicyId): Capability {
  const capability = ROUTE_POLICIES[id].capability;
  if (!capability) {
    throw new Error(`Route policy ${id} has no capability requirement.`);
  }
  return capability;
}

export function canAccessRoutePolicy(
  user: UserProfile | null,
  id: RoutePolicyId,
  options?: { allowStaffMarketplaceDemo?: boolean },
): boolean {
  const policy: RoutePolicy = ROUTE_POLICIES[id];
  const access = canonicalAccessContext(user);
  const capabilities = resolveEffectiveCapabilities(user);
  const staffMarketplaceDemo =
    options?.allowStaffMarketplaceDemo === true &&
    access.staffStatus === "active" &&
    capabilities.includes("staff.marketplace.demo");
  if (access.accountType === "guest") return false;
  if (
    access.staffStatus !== "none" &&
    (policy.access === "customer" || policy.access === "professional") &&
    !staffMarketplaceDemo
  ) {
    return false;
  }
  if (
    !policy.accountTypes.some((type) => type === access.accountType) &&
    !staffMarketplaceDemo
  ) {
    return false;
  }
  if (policy.requiresActiveStaff && access.staffStatus !== "active") {
    return false;
  }
  if (policy.productId && !hasProductAccess(user, policy.productId)) {
    return false;
  }
  if (
    policy.requiresActiveStaff &&
    !capabilities.includes("staff.internal.access")
  ) {
    return false;
  }
  if (!policy.capability) return true;
  if (
    staffMarketplaceDemo &&
    (policy.access === "customer" || policy.access === "professional")
  ) {
    return true;
  }
  return [policy.capability, ...(policy.alternativeCapabilities ?? [])].some(
    (capability) => capabilities.includes(capability),
  );
}
