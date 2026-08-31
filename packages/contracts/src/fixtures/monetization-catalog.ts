import type {
  BusinessVertical,
  BusinessVerticalCode,
  CommercialPlanProfile,
  CommissionPolicy,
  CommercialRule,
  MonetizationCatalog,
  MonetizationEntitlement,
  MonetizationProduct,
} from "../schemas/monetization";
import { CANONICAL_TAXONOMY_IDS } from "./taxonomy-catalog";
import {
  isCommercialAudienceCompatible,
  monetizationCatalogSchema,
} from "../schemas/monetization";

// Commercial terms are immutable once published. Education is published as a
// new version; v1/v2 subscriptions and financial snapshots keep their IDs.
const VERSION_ID = "commercial-fr-v3";
const VERSION_NUMBER = 3;
const PUBLISHED_AT = "2026-08-24T00:00:00.000Z";

export const BASELINE_BUSINESS_VERTICALS: BusinessVertical[] = [
  {
    id: "general",
    name: "Général",
    description: "Outils professionnels transverses Shongre.",
    categoryIds: [],
    capabilityKeys: ["listing.publish", "store.manage.own"],
    status: "active",
    sortOrder: 0,
  },
  {
    id: "auto",
    name: "Auto",
    description: "Stock, leads et opérations de concession.",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    capabilityKeys: ["auto.dealer.manage.own", "auto.inventory.import.own"],
    status: "active",
    sortOrder: 10,
  },
  {
    id: "immo",
    name: "Immo",
    description: "Portefeuille, demandes et opérations d’agence.",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    capabilityKeys: ["immo.agency.manage.own", "immo.inventory.import.own"],
    status: "active",
    sortOrder: 20,
  },
  {
    id: "emploi",
    name: "Emploi",
    description: "Offres, recruteurs et gestion des candidatures.",
    categoryIds: [CANONICAL_TAXONOMY_IDS.jobs],
    capabilityKeys: [
      "employment.recruiter.manage.own",
      "employment.application.manage.own",
    ],
    status: "active",
    sortOrder: 30,
  },
  {
    id: "education",
    name: "Éducation",
    description: "Cours, profils enseignants et gestion des demandes.",
    categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
    capabilityKeys: [
      "course.offer.manage.own",
      "course.organization.manage.own",
    ],
    status: "active",
    sortOrder: 40,
  },
  {
    id: "services",
    name: "Services",
    description: "Future offre professionnelle pour les prestataires.",
    categoryIds: [],
    capabilityKeys: [],
    status: "disabled",
    sortOrder: 50,
  },
];

const PLAN_PROFILE_CONFIG: Record<
  string,
  Pick<
    CommercialPlanProfile,
    | "familyId"
    | "tier"
    | "upgradeProductIds"
    | "downgradeProductIds"
    | "displayOrder"
  >
> = {
  "plan.pro.free": {
    familyId: "generic.pro",
    tier: "free",
    upgradeProductIds: [
      "plan.pro.business",
      "auto.dealer.starter",
      "immo.agency.starter",
      "employment.employer.starter",
      "course.tutor.pro",
    ],
    downgradeProductIds: [],
    displayOrder: 0,
  },
  "plan.pro.starter": {
    familyId: "generic.pro.legacy",
    tier: "essential",
    upgradeProductIds: ["plan.pro.business"],
    downgradeProductIds: ["plan.pro.free"],
    displayOrder: 90,
  },
  "plan.pro.business": {
    familyId: "generic.pro",
    tier: "business",
    upgradeProductIds: [
      "auto.dealer.growth",
      "immo.agency.growth",
      "employment.employer.growth",
      "course.tutor.premium",
    ],
    downgradeProductIds: ["plan.pro.free"],
    displayOrder: 10,
  },
  "plan.pro.enterprise": {
    familyId: "generic.pro.legacy",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: ["plan.pro.business"],
    displayOrder: 100,
  },
  "auto.dealer.starter": {
    familyId: "vertical.auto",
    tier: "essential",
    upgradeProductIds: ["auto.dealer.growth"],
    downgradeProductIds: ["plan.pro.business", "plan.pro.free"],
    displayOrder: 10,
  },
  "auto.dealer.growth": {
    familyId: "vertical.auto",
    tier: "business",
    upgradeProductIds: ["auto.dealer.network"],
    downgradeProductIds: ["auto.dealer.starter", "plan.pro.business"],
    displayOrder: 20,
  },
  "auto.dealer.network": {
    familyId: "vertical.auto",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: ["auto.dealer.growth", "auto.dealer.starter"],
    displayOrder: 30,
  },
  "immo.agency.starter": {
    familyId: "vertical.immo",
    tier: "essential",
    upgradeProductIds: ["immo.agency.growth"],
    downgradeProductIds: ["plan.pro.business", "plan.pro.free"],
    displayOrder: 10,
  },
  "immo.agency.growth": {
    familyId: "vertical.immo",
    tier: "business",
    upgradeProductIds: ["immo.agency.network"],
    downgradeProductIds: ["immo.agency.starter", "plan.pro.business"],
    displayOrder: 20,
  },
  "immo.agency.network": {
    familyId: "vertical.immo",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: ["immo.agency.growth", "immo.agency.starter"],
    displayOrder: 30,
  },
  "employment.employer.free": {
    familyId: "vertical.emploi",
    tier: "free",
    upgradeProductIds: ["employment.employer.starter"],
    downgradeProductIds: [],
    displayOrder: 0,
  },
  "employment.employer.starter": {
    familyId: "vertical.emploi",
    tier: "essential",
    upgradeProductIds: ["employment.employer.growth"],
    downgradeProductIds: ["employment.employer.free", "plan.pro.business"],
    displayOrder: 10,
  },
  "employment.employer.growth": {
    familyId: "vertical.emploi",
    tier: "business",
    upgradeProductIds: ["employment.agency"],
    downgradeProductIds: ["employment.employer.starter"],
    displayOrder: 20,
  },
  "employment.agency": {
    familyId: "vertical.emploi",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: [
      "employment.employer.growth",
      "employment.employer.starter",
    ],
    displayOrder: 30,
  },
  "employment.network": {
    familyId: "vertical.emploi.legacy",
    tier: "enterprise",
    upgradeProductIds: [],
    downgradeProductIds: ["employment.agency"],
    displayOrder: 100,
  },
  "course.tutor.free": {
    familyId: "vertical.education",
    tier: "free",
    upgradeProductIds: ["course.tutor.pro"],
    downgradeProductIds: [],
    displayOrder: 0,
  },
  "course.tutor.pro": {
    familyId: "vertical.education",
    tier: "essential",
    upgradeProductIds: ["course.tutor.premium"],
    downgradeProductIds: ["course.tutor.free", "plan.pro.business"],
    displayOrder: 10,
  },
  "course.tutor.premium": {
    familyId: "vertical.education",
    tier: "business",
    upgradeProductIds: ["course.school.organization"],
    downgradeProductIds: ["course.tutor.pro"],
    displayOrder: 20,
  },
  "course.school.organization": {
    familyId: "vertical.education",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: ["course.tutor.premium", "course.tutor.pro"],
    displayOrder: 30,
  },
  "course.training.essential": {
    familyId: "vertical.education.legacy",
    tier: "essential",
    upgradeProductIds: [],
    downgradeProductIds: [],
    displayOrder: 100,
  },
  "course.training.business": {
    familyId: "vertical.education.legacy",
    tier: "business",
    upgradeProductIds: [],
    downgradeProductIds: [],
    displayOrder: 110,
  },
  "course.training.premium": {
    familyId: "vertical.education.legacy",
    tier: "premium",
    upgradeProductIds: [],
    downgradeProductIds: [],
    displayOrder: 120,
  },
};

const scope = (
  audience: MonetizationProduct["audience"] = "all",
  categoryIds: string[] = [],
  verticalId?: BusinessVerticalCode,
) => ({
  marketCodes: ["FR"],
  currencies: ["EUR"],
  categoryIds,
  subcategoryIds: [],
  typeIds: [],
  subtypeIds: [],
  audiences: [audience],
  planIds: [],
  customerSegments: [],
  publicationChannels: ["web", "mobile"],
  verticalIds: verticalId ? [verticalId] : [],
});

const entitlement = (
  key: string,
  label: string,
  value: MonetizationEntitlement["value"],
  unit?: string,
  recurringGrant?: MonetizationEntitlement["recurringGrant"],
): MonetizationEntitlement => ({
  key,
  label,
  description: `Droit commercial « ${label} » contrôlé par le catalogue Shongre.`,
  value,
  unit,
  featureType:
    typeof value === "boolean"
      ? "boolean"
      : typeof value === "number"
        ? recurringGrant
          ? "monetary_credit"
          : "integer_quota"
        : "level",
  availability: "enabled",
  implementationStatus: "ready",
  dependencies: [],
  adminHelpText:
    "Modifiez cette valeur dans un brouillon, puis validez et publiez la version commerciale.",
  mergePolicy:
    typeof value === "boolean"
      ? "boolean_or"
      : typeof value === "number"
        ? "max"
        : "override",
  categoryIds: [],
  recurringGrant,
});

const FEATURE_DEPENDENCIES: Record<string, string[]> = {
  inventoryXmlImport: ["inventoryCsvImport"],
  xmlImport: ["csvImport"],
  apiSync: ["csvImport"],
  branchPermissions: ["maxLocations", "maxTeamMembers"],
  teamPermissions: ["maxTeamMembers"],
  bulkCourseManagement: ["courseCatalog"],
};

/**
 * Engineering readiness is deliberately separate from commercial activation.
 * Admin may disable, maintain or beta-label a ready feature, but cannot turn an
 * incomplete implementation into a paid promise through configuration alone.
 */
const INCOMPLETE_FEATURES_BY_PRODUCT: Record<string, Set<string>> = {
  "premium.visibility_bundle": new Set(["searchBumpCredits"]),
  "auto.dealer.starter": new Set(["savedTemplates"]),
  "auto.dealer.growth": new Set([
    "maxTeamMembers",
    "maxLocations",
    "savedTemplates",
    "duplicateListings",
    "bulkActions",
    "inventoryCsvImport",
    "inventoryXmlImport",
    "prioritySupport",
  ]),
  "auto.dealer.network": new Set([
    "maxTeamMembers",
    "maxLocations",
    "inventoryCsvImport",
    "inventoryXmlImport",
    "inventoryApiSync",
    "exportTools",
    "branchPermissions",
    "apiAccess",
    "prioritySupport",
  ]),
  auto_addon_secure_sale: new Set(["secureSale"]),
  auto_addon_urgent: new Set(["urgent"]),
  auto_addon_bump: new Set(["searchBumpCredits"]),
  auto_addon_featured: new Set(["featured"]),
  auto_addon_featured_30d: new Set(["featured"]),
  auto_addon_bump_pack_10: new Set(["searchBumpCredits"]),
  auto_addon_homepage: new Set(["homepageSpotlight"]),
  auto_addon_category: new Set(["categorySpotlight"]),
  auto_addon_qualified_lead: new Set(["qualifiedLeadCredits"]),
  auto_addon_sponsored_dealer: new Set(["sponsoredDealer"]),
  "immo.agency.starter": new Set(["savedTemplates"]),
  "immo.agency.growth": new Set([
    "maxTeamMembers",
    "maxLocations",
    "bulkActions",
    "csvImport",
    "xmlImport",
    "savedTemplates",
    "duplicateListings",
    "prioritySupport",
  ]),
  "immo.agency.network": new Set([
    "maxTeamMembers",
    "maxLocations",
    "agencyGroups",
    "csvImport",
    "xmlImport",
    "inventoryApiSync",
    "teamPermissions",
    "apiAccess",
    "prioritySupport",
  ]),
  immo_urgent: new Set(["urgent"]),
  immo_bump: new Set(["searchBumpCredits"]),
  immo_featured: new Set(["featured"]),
  immo_featured_30d: new Set(["featured"]),
  immo_bump_pack_10: new Set(["searchBumpCredits"]),
  immo_home_spotlight: new Set(["homepageSpotlight"]),
  immo_local_spotlight: new Set(["localSpotlight"]),
  immo_qualified_lead: new Set(["qualifiedLeadCredits"]),
  immo_sponsored_agency: new Set(["sponsoredAgency"]),
  "employment.visibility.pack": new Set([
    "urgentHiringBadge",
    "scheduledSearchBumps",
    "featuredPlacementDays",
    "advancedAnalytics",
  ]),
  "employment.employer.starter": new Set([
    "maxRecruiterSeats",
    "reusableTemplates",
  ]),
  "employment.employer.growth": new Set([
    "maxRecruiterSeats",
    "reusableTemplates",
  ]),
  "employment.agency": new Set([
    "maxRecruiterSeats",
    "reusableTemplates",
    "csvImport",
    "apiSync",
  ]),
  "employment.addon.urgent": new Set(["urgentHiringBadge"]),
  "employment.addon.bump": new Set(["scheduledSearchBumps"]),
  "employment.addon.featured": new Set(["featuredPlacement"]),
  "employment.addon.local": new Set(["localSpotlight"]),
  "employment.addon.seat": new Set(["additionalRecruiterSeats"]),
  "employment.addon.job-credit": new Set(["additionalActiveJobs"]),
  "employment.addon.analytics": new Set(["advancedAnalytics"]),
  "employment.addon.distribution": new Set(["distributionIntegration"]),
  addon_featured_subject: new Set(["featuredSubject"]),
  addon_local_spotlight: new Set(["localSpotlight"]),
  addon_search_bump: new Set(["searchBumpCredits"]),
  addon_qualified_lead: new Set(["qualifiedLeadCredits"]),
  addon_verification: new Set(["documentVerification"]),
  "course.tutor.premium": new Set([
    "teamMembers",
    "locations",
    "organizationStorefront",
    "courseCatalog",
    "bulkCourseManagement",
  ]),
  "course.school.organization": new Set([
    "teamMembers",
    "locations",
    "organizationStorefront",
    "courseCatalog",
    "csvImport",
    "apiAccess",
    "centralLeadInbox",
    "bulkCourseManagement",
    "reporting",
  ]),
};

const EXTERNAL_DEPENDENCY_FEATURES_BY_PRODUCT: Record<string, Set<string>> = {
  "auto.dealer.network": new Set(["inventoryApiSync", "apiAccess"]),
  auto_addon_secure_sale: new Set(["secureSale"]),
  "immo.agency.network": new Set(["inventoryApiSync", "apiAccess"]),
  "employment.agency": new Set(["apiSync"]),
  "employment.addon.distribution": new Set(["distributionIntegration"]),
  "course.school.organization": new Set(["apiAccess"]),
};

function withFeatureReadiness(
  productId: string,
  entry: MonetizationEntitlement,
): MonetizationEntitlement {
  const incomplete = INCOMPLETE_FEATURES_BY_PRODUCT[productId]?.has(entry.key);
  const externalDependency = EXTERNAL_DEPENDENCY_FEATURES_BY_PRODUCT[
    productId
  ]?.has(entry.key);
  const implementationStatus = externalDependency
    ? "external_dependency"
    : incomplete
      ? "incomplete"
      : "ready";
  return {
    ...entry,
    dependencies: FEATURE_DEPENDENCIES[entry.key] || entry.dependencies,
    availability:
      implementationStatus === "ready" ? entry.availability : "maintenance",
    implementationStatus,
    adminHelpText:
      implementationStatus === "external_dependency"
        ? "Promesse commerciale suspendue : configurez, déployez et validez la dépendance externe avant réactivation."
        : implementationStatus === "incomplete"
          ? "Promesse commerciale suspendue : le parcours de production complet doit être livré et validé avant réactivation."
          : entry.adminHelpText,
  };
}

function verticalForCategories(
  categoryIds: string[] = [],
): BusinessVerticalCode | undefined {
  if (categoryIds.includes(CANONICAL_TAXONOMY_IDS.vehicles)) return "auto";
  if (categoryIds.includes(CANONICAL_TAXONOMY_IDS.realEstate)) return "immo";
  if (categoryIds.includes(CANONICAL_TAXONOMY_IDS.jobs)) return "emploi";
  if (categoryIds.includes(CANONICAL_TAXONOMY_IDS.courses)) return "education";
  return undefined;
}

const product = (input: {
  id: string;
  kind: MonetizationProduct["kind"];
  name: string;
  description: string;
  audience?: MonetizationProduct["audience"];
  categoryIds?: string[];
  amountMinor: number;
  annualAmountMinor?: number;
  taxRateBps?: number;
  durationDays?: number;
  trialDays?: number;
  entitlements?: MonetizationEntitlement[];
  recommended?: boolean;
  status?: MonetizationProduct["status"];
  consumers?: string[];
}): MonetizationProduct => ({
  id: input.id,
  versionId: `${VERSION_ID}:${input.id}`,
  code: input.id,
  kind: input.kind,
  name: input.name,
  description: input.description,
  audience: input.audience || "all",
  scope: scope(
    input.audience,
    input.categoryIds,
    verticalForCategories(input.categoryIds),
  ),
  prices: [
    {
      id: `${VERSION_ID}:${input.id}:month-or-once`,
      amount: { amountMinor: input.amountMinor, currency: "EUR" },
      billingPeriod: input.kind === "subscription" ? "month" : "once",
      taxRateBps: input.taxRateBps || 0,
      priceIncludesTax: input.taxRateBps === 0,
      durationDays: input.durationDays,
      trialDays: input.trialDays,
    },
    ...(input.annualAmountMinor === undefined
      ? []
      : [
          {
            id: `${VERSION_ID}:${input.id}:year`,
            amount: {
              amountMinor: input.annualAmountMinor,
              currency: "EUR",
            },
            billingPeriod: "year" as const,
            taxRateBps: input.taxRateBps || 0,
            priceIncludesTax: input.taxRateBps === 0,
          },
        ]),
  ],
  entitlements: (input.entitlements || []).map((source) => {
    const entry = withFeatureReadiness(input.id, source);
    return {
      ...entry,
      mergePolicy:
        input.kind === "credit_pack" && typeof entry.value === "number"
          ? "additive"
          : entry.mergePolicy,
      verticalId: verticalForCategories(input.categoryIds),
      categoryIds: input.categoryIds || [],
    };
  }),
  compatibility: {
    requiresProductIds: [],
    excludesProductIds: [],
    maximumQuantity: 1,
  },
  status: input.status || "active",
  recommended: input.recommended || false,
  effectiveFrom: PUBLISHED_AT,
  sourceConsumers: input.consumers || [],
  commercialProfile: (() => {
    const verticalId = verticalForCategories(input.categoryIds);
    const configured = PLAN_PROFILE_CONFIG[input.id];
    const isSubscription = input.kind === "subscription";
    const planType = isSubscription
      ? verticalId
        ? "vertical"
        : input.amountMinor === 0
          ? "free"
          : "generic"
      : input.kind === "standard_listing"
        ? "free"
        : verticalId
          ? "addon"
          : "bundle";
    const financeCategory = isSubscription
      ? verticalId === "auto"
        ? "auto_subscription"
        : verticalId === "immo"
          ? "immo_subscription"
          : verticalId === "emploi"
            ? "employment_subscription"
            : verticalId === "education"
              ? "education_subscription"
              : "generic_subscription"
      : ["premium_option", "sponsored_placement"].includes(input.kind)
        ? "promotion"
        : verticalId
          ? "addon"
          : "marketplace_service";
    return {
      planType,
      familyId:
        configured?.familyId ||
        (verticalId ? `addon.${verticalId}` : `product.${input.kind}`),
      verticalId,
      tier: configured?.tier,
      professionalOnly: ["professional", "organization"].includes(
        input.audience || "all",
      ),
      targetCategoryIds: input.categoryIds || [],
      countryAvailability: ["FR"],
      trialPolicy: {
        enabled: Boolean(input.trialDays),
        durationDays: input.trialDays,
        requiresPaymentMethod: true,
        firstTimeCustomersOnly: true,
        autoConverts: true,
        eligibleAudiences: [input.audience || "all"],
        eligibleMarketCodes: ["FR"],
      },
      upgradeProductIds: configured?.upgradeProductIds || [],
      downgradeProductIds: configured?.downgradeProductIds || [],
      compatibleAddonIds: [],
      requiresBusinessVerification: isSubscription && Boolean(verticalId),
      financeCategory,
      displayOrder: configured?.displayOrder || 100,
    } satisfies CommercialPlanProfile;
  })(),
});

export const BASELINE_MONETIZATION_PRODUCTS: MonetizationProduct[] = [
  product({
    id: "listing.standard.individual",
    kind: "standard_listing",
    name: "Particulier",
    description: "Publication standard pour les particuliers.",
    audience: "individual",
    amountMinor: 0,
    durationDays: 60,
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 20),
      entitlement("maxPhotosPerListing", "Photos par annonce", 8),
    ],
    consumers: ["generic-publication", "transactions", "solutions-pro"],
  }),
  product({
    id: "plan.pro.free",
    kind: "subscription",
    name: "Shongre Free",
    description:
      "Découvrir les outils professionnels avec une capacité limitée.",
    audience: "professional",
    amountMinor: 0,
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 5),
      entitlement("maxPhotosPerListing", "Photos par annonce", 8),
      entitlement("teamMembers", "Membres d’équipe", 1),
      entitlement("professionalProfile", "Profil professionnel", true),
      entitlement("analyticsLevel", "Statistiques", "basic"),
    ],
    consumers: ["solutions-pro", "seller-workspace", "generic-publication"],
  }),
  product({
    id: "plan.pro.starter",
    kind: "subscription",
    name: "Shongre Pro Essential — historique",
    description: "Ancienne offre conservée pour les contrats existants.",
    audience: "professional",
    amountMinor: 2900,
    annualAmountMinor: 28800,
    taxRateBps: 2000,
    status: "archived",
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 50),
      entitlement("maxPhotosPerListing", "Photos par annonce", 15),
      entitlement("teamMembers", "Membres d’équipe", 1),
      entitlement("storefrontCustomization", "Vitrine personnalisée", true),
    ],
    consumers: ["solutions-pro", "seller-workspace", "generic-publication"],
  }),
  product({
    id: "plan.pro.business",
    kind: "subscription",
    name: "Shongre Pro",
    description:
      "Vitrine, outils de publication et suivi d’activité pour les professionnels généralistes.",
    audience: "professional",
    amountMinor: 1990,
    annualAmountMinor: 19900,
    taxRateBps: 2000,
    recommended: true,
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 50),
      entitlement(
        "maxMonthlyPublications",
        "Nouvelles publications par mois",
        100,
      ),
      entitlement("maxPhotosPerListing", "Photos par annonce", 15),
      entitlement("teamMembers", "Membres d’équipe", 1),
      entitlement("professionalProfile", "Profil professionnel", true),
      entitlement("storefrontCustomization", "Vitrine professionnelle", true),
      entitlement("analyticsLevel", "Statistiques", "standard"),
      entitlement("monthlyBumpCredits", "Remontées mensuelles", 1, undefined, {
        creditType: "search_bump",
        quantity: 1,
        resetPeriod: "billing_period",
      }),
      entitlement("billingInvoices", "Factures", true),
    ],
    consumers: ["solutions-pro", "seller-workspace", "generic-publication"],
  }),
  product({
    id: "plan.pro.enterprise",
    kind: "subscription",
    name: "Shongre Pro Premium — historique",
    description: "Ancienne offre conservée pour les contrats existants.",
    audience: "professional",
    amountMinor: 19900,
    annualAmountMinor: 202800,
    taxRateBps: 2000,
    status: "archived",
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 2000),
      entitlement("maxPhotosPerListing", "Photos par annonce", 25),
      entitlement("teamMembers", "Membres d’équipe", 100),
      entitlement("apiAccess", "Accès API", true),
      entitlement("analyticsLevel", "Niveau analytique", "enterprise"),
    ],
    consumers: ["solutions-pro", "seller-workspace", "generic-publication"],
  }),
  product({
    id: "premium.urgent",
    kind: "premium_option",
    name: "Urgent 7 jours",
    description: "Badge Urgent identifiable pendant sept jours.",
    amountMinor: 390,
    taxRateBps: 2000,
    durationDays: 7,
    entitlements: [entitlement("urgent", "Urgent", true)],
    consumers: ["publish-wizard", "my-listings", "solutions-pro"],
  }),
  product({
    id: "premium.search_bump",
    kind: "premium_option",
    name: "Remonter l’annonce",
    description:
      "Placement rémunéré identifiable, sans modifier l’âge réel de l’annonce.",
    amountMinor: 190,
    taxRateBps: 2000,
    durationDays: 1,
    entitlements: [entitlement("searchBumpCredits", "Remontées", 1)],
    consumers: ["publish-wizard", "my-listings", "solutions-pro"],
  }),
  product({
    id: "premium.highlight",
    kind: "sponsored_placement",
    name: "À la une 30 jours",
    description: "Placement sponsorisé identifiable pendant trente jours.",
    amountMinor: 1990,
    taxRateBps: 2000,
    durationDays: 30,
    entitlements: [entitlement("spotlight", "À la une", true)],
    consumers: ["publish-wizard", "my-listings", "solutions-pro"],
  }),
  product({
    id: "premium.visibility_bundle",
    kind: "pack",
    name: "Pack de 10 remontées",
    description: "Dix crédits pour remonter explicitement des annonces.",
    amountMinor: 1490,
    taxRateBps: 2000,
    durationDays: 365,
    entitlements: [entitlement("searchBumpCredits", "Remontées", 10)],
    consumers: ["publish-wizard", "my-listings", "solutions-pro"],
  }),
  product({
    id: "premium.spotlight",
    kind: "sponsored_placement",
    name: "À la une 7 jours",
    description:
      "Placement sponsorisé identifiable dans la sélection éditoriale.",
    amountMinor: 790,
    taxRateBps: 2000,
    durationDays: 7,
    entitlements: [entitlement("spotlight", "À la une", true)],
    consumers: ["publish-wizard", "home-discovery", "search"],
  }),
  product({
    id: "delivery.hand_delivery",
    kind: "service_fee",
    name: "Remise en main propre",
    description: "Remise directe avec validation sécurisée.",
    amountMinor: 0,
    entitlements: [],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "delivery.relay_point",
    kind: "service_fee",
    name: "Livraison en point relais",
    description:
      "Tarif de référence France pour un colis standard en point relais.",
    amountMinor: 490,
    entitlements: [
      entitlement("tier.small.amountMinor", "Petit colis", 349),
      entitlement("tier.medium.amountMinor", "Colis moyen", 490),
      entitlement("tier.large.amountMinor", "Grand colis", 640),
      entitlement("tier.xlarge.amountMinor", "Très grand colis", 990),
    ],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "delivery.home",
    kind: "service_fee",
    name: "Livraison à domicile",
    description: "Tarif de référence France pour un colis standard à domicile.",
    amountMinor: 690,
    entitlements: [
      entitlement("tier.small.amountMinor", "Petit colis", 590),
      entitlement("tier.medium.amountMinor", "Colis moyen", 690),
      entitlement("tier.large.amountMinor", "Grand colis", 890),
      entitlement("tier.xlarge.amountMinor", "Très grand colis", 1490),
    ],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "delivery.express",
    kind: "service_fee",
    name: "Livraison express",
    description: "Tarif de référence France pour un colis standard express.",
    amountMinor: 1290,
    entitlements: [
      entitlement("tier.small.amountMinor", "Petit colis", 1090),
      entitlement("tier.medium.amountMinor", "Colis moyen", 1290),
      entitlement("tier.large.amountMinor", "Grand colis", 1590),
      entitlement("tier.xlarge.amountMinor", "Très grand colis", 2490),
    ],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "delivery.bulky",
    kind: "service_fee",
    name: "Livraison volumineuse",
    description: "Tarif de référence France pour une livraison volumineuse.",
    amountMinor: 2500,
    entitlements: [],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "delivery.seller_direct",
    kind: "service_fee",
    name: "Livraison directe par le vendeur",
    description: "Tarif de référence configuré pour la livraison vendeur.",
    amountMinor: 1500,
    entitlements: [],
    consumers: ["checkout", "transaction-pricing", "fulfillment"],
  }),
  product({
    id: "auto.private.free",
    kind: "standard_listing",
    name: "Particulier Auto Gratuit",
    description: "Une annonce véhicule active.",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    amountMinor: 0,
    entitlements: [
      entitlement("maxActiveVehicles", "Véhicules actifs", 1),
      entitlement("maxPhotosPerVehicle", "Photos", 12),
    ],
    consumers: ["auto-publish", "auto-catalog"],
  }),
  product({
    id: "auto.private.secure",
    kind: "pack",
    name: "Vente Sérénité",
    description:
      "Accompagnement documentaire et parcours de vente renforcé, selon disponibilité.",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    amountMinor: 4990,
    taxRateBps: 2000,
    durationDays: 30,
    recommended: true,
    entitlements: [
      entitlement("maxPhotosPerVehicle", "Photos", 24),
      entitlement("includedUrgentCredits", "Crédits Urgent", 1),
      entitlement("includedBumpCredits", "Crédits remontée", 2),
      entitlement("includedFeaturedCredits", "Crédits À la une", 1),
      entitlement("vehicleVideo", "Vidéo véhicule", true),
      entitlement("detailedAnalytics", "Statistiques détaillées", true),
    ],
    consumers: ["auto-publish", "auto-catalog", "auto-checkout"],
  }),
  product({
    id: "auto.dealer.starter",
    kind: "subscription",
    name: "Shongre Auto Essential",
    description:
      "Stock, vitrine et boîte de réception pour une petite concession.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    amountMinor: 2990,
    annualAmountMinor: 29900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveVehicles", "Véhicules actifs", 20),
      entitlement("maxMonthlyPublications", "Publications par mois", 30),
      entitlement("maxPhotosPerVehicle", "Photos par véhicule", 15),
      entitlement("maxVideosPerVehicle", "Vidéos par véhicule", 1),
      entitlement("maxTeamMembers", "Utilisateurs professionnels", 1),
      entitlement("maxLocations", "Concessions", 1),
      entitlement("publicStorefront", "Page concession", true),
      entitlement("leadAssignment", "Boîte de réception des demandes", true),
      entitlement("savedTemplates", "Modèles de véhicules", true),
      entitlement("analyticsLevel", "Statistiques", "standard"),
      entitlement(
        "monthlyPromotionCredits",
        "Crédits remontée mensuels",
        1,
        undefined,
        {
          creditType: "auto_visibility",
          quantity: 1,
          resetPeriod: "billing_period",
        },
      ),
      entitlement("billingInvoices", "Factures", true),
    ],
    consumers: ["auto-publish", "auto-dealer-workspace"],
  }),
  product({
    id: "auto.dealer.growth",
    kind: "subscription",
    name: "Shongre Auto Business",
    description:
      "Capacité de stock étendue, suivi des leads et statistiques avancées.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    amountMinor: 5990,
    annualAmountMinor: 59900,
    taxRateBps: 2000,
    trialDays: 30,
    recommended: true,
    entitlements: [
      entitlement("maxActiveVehicles", "Véhicules actifs", 80),
      entitlement("maxMonthlyPublications", "Publications par mois", 150),
      entitlement("maxPhotosPerVehicle", "Photos par véhicule", 25),
      entitlement("maxVideosPerVehicle", "Vidéos par véhicule", 2),
      entitlement("maxTeamMembers", "Utilisateurs professionnels", 3),
      entitlement("maxLocations", "Concessions", 2),
      entitlement("publicStorefront", "Vitrine concession", true),
      entitlement(
        "leadAssignment",
        "Qualification et attribution des leads",
        true,
      ),
      entitlement("leadReminders", "Relances de leads", true),
      entitlement("savedTemplates", "Modèles enregistrés", true),
      entitlement("duplicateListings", "Duplication d’annonces", true),
      entitlement("bulkActions", "Actions groupées", true),
      entitlement("inventoryCsvImport", "Import CSV", true),
      entitlement("inventoryXmlImport", "Import XML", true),
      entitlement("detailedAnalytics", "Statistiques avancées", true),
      entitlement(
        "monthlyPromotionCredits",
        "Crédits remontée mensuels",
        5,
        undefined,
        {
          creditType: "auto_visibility",
          quantity: 5,
          resetPeriod: "billing_period",
        },
      ),
      entitlement("prioritySupport", "Assistance prioritaire", true),
    ],
    consumers: ["auto-publish", "auto-dealer-workspace"],
  }),
  product({
    id: "auto.dealer.network",
    kind: "subscription",
    name: "Shongre Auto Scale",
    description:
      "Capacité de stock étendue, gestion avancée des leads et statistiques réseau.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    amountMinor: 11990,
    annualAmountMinor: 119900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveVehicles", "Véhicules actifs", 250),
      entitlement("maxMonthlyPublications", "Publications par mois", 500),
      entitlement("maxPhotosPerVehicle", "Photos par véhicule", 40),
      entitlement("maxVideosPerVehicle", "Vidéos par véhicule", 3),
      entitlement("maxTeamMembers", "Utilisateurs professionnels", 10),
      entitlement("maxLocations", "Concessions", 5),
      entitlement("publicStorefront", "Vitrine concession", true),
      entitlement("inventoryCsvImport", "Import CSV", true),
      entitlement("inventoryXmlImport", "Import XML / flux", true),
      entitlement("inventoryApiSync", "Synchronisation API", true),
      entitlement("leadAssignment", "Gestion avancée des leads", true),
      entitlement("networkAnalytics", "Statistiques équipe et réseau", true),
      entitlement("exportTools", "Exports et rapports", true),
      entitlement("branchPermissions", "Permissions par site", true),
      entitlement(
        "monthlyPromotionCredits",
        "Crédits remontée mensuels",
        15,
        undefined,
        {
          creditType: "auto_visibility",
          quantity: 15,
          resetPeriod: "billing_period",
        },
      ),
      entitlement("apiAccess", "Accès API", true),
      entitlement("prioritySupport", "Assistance prioritaire", true),
    ],
    consumers: ["auto-publish", "auto-dealer-workspace"],
  }),
  ...[
    [
      "auto_addon_secure_sale",
      "service_fee",
      "Vente Sérénité",
      4990,
      undefined,
      "secureSale",
    ],
    ["auto_addon_urgent", "premium_option", "Urgent Auto", 790, 7, "urgent"],
    [
      "auto_addon_bump",
      "premium_option",
      "Remonter l’annonce Auto",
      490,
      1,
      "searchBumpCredits",
    ],
    [
      "auto_addon_featured",
      "sponsored_placement",
      "À la une Auto",
      1490,
      7,
      "featured",
    ],
    [
      "auto_addon_featured_30d",
      "sponsored_placement",
      "À la une Auto 30 jours",
      3990,
      30,
      "featured",
    ],
    [
      "auto_addon_bump_pack_10",
      "pack",
      "Pack de 10 remontées Auto",
      3490,
      365,
      "searchBumpCredits",
    ],
    [
      "auto_addon_homepage",
      "sponsored_placement",
      "Spotlight accueil Auto",
      2990,
      7,
      "homepageSpotlight",
    ],
    [
      "auto_addon_category",
      "sponsored_placement",
      "Spotlight catégorie Auto",
      1990,
      7,
      "categorySpotlight",
    ],
    [
      "auto_addon_qualified_lead",
      "credit_pack",
      "Lead acheteur qualifié Auto",
      590,
      undefined,
      "qualifiedLeadCredits",
    ],
    [
      "auto_addon_sponsored_dealer",
      "sponsored_placement",
      "Concession sponsorisée",
      4990,
      30,
      "sponsoredDealer",
    ],
  ].map(([id, kind, name, amountMinor, durationDays, entitlementKey]) =>
    product({
      id: String(id),
      kind: kind as MonetizationProduct["kind"],
      name: String(name),
      description: "Option commerciale Auto configurable et identifiable.",
      categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
      amountMinor: Number(amountMinor),
      taxRateBps: 2000,
      durationDays:
        durationDays === undefined ? undefined : Number(durationDays),
      entitlements: [
        entitlement(
          String(entitlementKey),
          String(name),
          String(id) === "auto_addon_bump_pack_10"
            ? 10
            : kind === "credit_pack"
              ? 1
              : true,
        ),
      ],
      consumers: ["auto-catalog", "auto-publish", "auto-checkout"],
    }),
  ),
  ...[
    [
      "auto_addon_inspection_referral",
      "Demande d’inspection",
      "inspectionReferral",
    ],
    ["auto_addon_warranty_referral", "Demande de garantie", "warrantyReferral"],
    [
      "auto_addon_financing_referral",
      "Demande de financement",
      "financingReferral",
    ],
    [
      "auto_addon_insurance_referral",
      "Demande d’assurance",
      "insuranceReferral",
    ],
    [
      "auto_addon_delivery_referral",
      "Demande de livraison",
      "deliveryReferral",
    ],
    ["auto_addon_trade_in_referral", "Demande de reprise", "tradeInReferral"],
  ].map(([id, name, entitlementKey]) =>
    product({
      id: String(id),
      kind: "service_fee",
      name: String(name),
      description: "Réservé à une future intégration partenaire validée.",
      categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
      amountMinor: 0,
      taxRateBps: 2000,
      status: "disabled",
      entitlements: [entitlement(String(entitlementKey), String(name), true)],
      consumers: ["auto-catalog", "auto-partner-referrals"],
    }),
  ),
  product({
    id: "course.tutor.free",
    kind: "subscription",
    name: "Shongre Education Free",
    description:
      "Profil enseignant et gestion de demandes pour démarrer gratuitement.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
    amountMinor: 0,
    entitlements: [
      entitlement("maxActiveOffers", "Cours actifs", 3),
      entitlement("maxPhotosPerCourse", "Photos par cours", 8),
      entitlement("teamMembers", "Instructeurs", 1),
      entitlement("professionalProfile", "Profil enseignant", true),
      entitlement("leadManagement", "Gestion des demandes", true),
    ],
    consumers: ["course-onboarding", "course-workspace"],
  }),
  product({
    id: "course.tutor.pro",
    kind: "subscription",
    name: "Shongre Education Pro",
    description:
      "Présentation enrichie, demandes et statistiques pour un enseignant professionnel.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
    amountMinor: 790,
    annualAmountMinor: 7900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveOffers", "Cours actifs", 15),
      entitlement("maxPhotosPerCourse", "Photos par cours", 15),
      entitlement("maxMonthlyLeads", "Demandes mensuelles", 30),
      entitlement("teamMembers", "Instructeurs", 1),
      entitlement(
        "professionalProfile",
        "Profil enseignant professionnel",
        true,
      ),
      entitlement("profileMedia", "Présentation enrichie", true),
      entitlement("leadManagement", "CRM essentiel", true),
      entitlement("detailedAnalytics", "Statistiques", true),
      entitlement(
        "visibilityCreditsMonthly",
        "Crédit promotion mensuel",
        1,
        undefined,
        {
          creditType: "course_visibility",
          quantity: 1,
          resetPeriod: "billing_period",
        },
      ),
    ],
    consumers: ["course-onboarding", "course-workspace"],
  }),
  product({
    id: "course.tutor.premium",
    kind: "subscription",
    name: "Shongre Education Studio",
    description:
      "Capacité étendue, CRM avancé et statistiques pour une activité de cours.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
    amountMinor: 2490,
    annualAmountMinor: 24900,
    taxRateBps: 2000,
    trialDays: 30,
    recommended: true,
    entitlements: [
      entitlement("maxActiveOffers", "Cours actifs", 50),
      entitlement("maxPhotosPerCourse", "Photos par cours", 25),
      entitlement("maxMonthlyLeads", "Demandes mensuelles", 150),
      entitlement("teamMembers", "Instructeurs", 5),
      entitlement("locations", "Studios", 1),
      entitlement("organizationStorefront", "Page studio", true),
      entitlement("courseCatalog", "Catalogue de cours", true),
      entitlement("leadManagement", "CRM avancé", true),
      entitlement("bulkCourseManagement", "Duplication et modèles", true),
      entitlement("detailedAnalytics", "Statistiques avancées", true),
      entitlement(
        "visibilityCreditsMonthly",
        "Crédits promotion mensuels",
        5,
        undefined,
        {
          creditType: "course_visibility",
          quantity: 5,
          resetPeriod: "billing_period",
        },
      ),
    ],
    consumers: ["course-onboarding", "course-workspace"],
  }),
  product({
    id: "course.school.organization",
    kind: "subscription",
    name: "Shongre Education Organisme",
    description:
      "Volumes élevés de cours et demandes, CRM et statistiques avancées.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
    amountMinor: 5990,
    annualAmountMinor: 59900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveOffers", "Cours actifs", 200),
      entitlement("maxPhotosPerCourse", "Photos par cours", 40),
      entitlement("maxMonthlyLeads", "Demandes mensuelles", 500),
      entitlement("teamMembers", "Instructeurs", 20),
      entitlement("locations", "Établissements", 10),
      entitlement("organizationStorefront", "Profil organisme", true),
      entitlement("courseCatalog", "Grand catalogue", true),
      entitlement("csvImport", "Import CSV du catalogue", true),
      entitlement("apiAccess", "Fondations API / flux", true),
      entitlement("centralLeadInbox", "CRM centralisé", true),
      entitlement("bulkCourseManagement", "Gestion groupée", true),
      entitlement("detailedAnalytics", "Statistiques avancées", true),
      entitlement("reporting", "Rapports", true),
      entitlement(
        "visibilityCreditsMonthly",
        "Crédits promotion mensuels",
        15,
        undefined,
        {
          creditType: "course_visibility",
          quantity: 15,
          resetPeriod: "billing_period",
        },
      ),
    ],
    consumers: ["course-onboarding", "course-workspace"],
  }),
  ...[
    [
      "addon_featured_subject",
      "sponsored_placement",
      "Mise en avant matière",
      990,
      7,
      "featuredSubject",
    ],
    [
      "addon_local_spotlight",
      "sponsored_placement",
      "Visibilité locale Éducation",
      790,
      7,
      "localSpotlight",
    ],
    [
      "addon_search_bump",
      "premium_option",
      "Remonter le profil",
      390,
      1,
      "searchBumpCredits",
    ],
    [
      "addon_qualified_lead",
      "credit_pack",
      "Crédit demande qualifiée",
      250,
      undefined,
      "qualifiedLeadCredits",
    ],
    [
      "addon_verification",
      "verification_service",
      "Vérification de justificatif",
      1200,
      undefined,
      "documentVerification",
    ],
  ].map(([id, kind, name, amountMinor, durationDays, entitlementKey]) =>
    product({
      id: String(id),
      kind: kind as MonetizationProduct["kind"],
      name: String(name),
      description: "Option commerciale Éducation configurable par marché.",
      categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
      amountMinor: Number(amountMinor),
      taxRateBps: 2000,
      durationDays:
        durationDays === undefined ? undefined : Number(durationDays),
      entitlements: [
        entitlement(
          String(entitlementKey),
          String(name),
          kind === "credit_pack" ? 1 : true,
        ),
      ],
      consumers: ["course-catalog", "course-workspace", "course-checkout"],
    }),
  ),
  product({
    id: "immo.owner.free",
    kind: "standard_listing",
    name: "Propriétaire Gratuit",
    description:
      "Publication immobilière standard accessible aux particuliers.",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    amountMinor: 0,
    durationDays: 60,
    entitlements: [
      entitlement("maxActiveListings", "Biens actifs", 1),
      entitlement("maxMedia", "Médias", 12),
    ],
    consumers: ["immo-publish", "immo-catalog"],
  }),
  product({
    id: "immo.owner.visibility",
    kind: "pack",
    name: "Pack Visibilité Propriétaire",
    description: "Médias renforcés et crédits visibilité.",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    amountMinor: 2990,
    taxRateBps: 2000,
    durationDays: 30,
    entitlements: [
      entitlement("maxActiveListings", "Biens actifs", 3),
      entitlement("maxMedia", "Médias", 30),
      entitlement("includedBumpCredits", "Remontées", 3),
    ],
    recommended: true,
    consumers: ["immo-publish", "immo-catalog"],
  }),
  product({
    id: "immo.agency.starter",
    kind: "subscription",
    name: "Shongre Immo Essential",
    description:
      "Portefeuille, page agence et gestion des demandes pour une petite agence.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    amountMinor: 2990,
    annualAmountMinor: 29900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveListings", "Biens actifs", 15),
      entitlement("maxMonthlyPublications", "Publications par mois", 30),
      entitlement("maxMedia", "Photos par bien", 20),
      entitlement("maxVideosPerListing", "Vidéos par bien", 1),
      entitlement(
        "maxVirtualToursPerListing",
        "Visites virtuelles par bien",
        1,
      ),
      entitlement("maxTeamMembers", "Agents", 1),
      entitlement("maxLocations", "Agences", 1),
      entitlement("professionalStorefront", "Page agence", true),
      entitlement("leadManagement", "Gestion des demandes", true),
      entitlement("savedTemplates", "Modèles de biens", true),
      entitlement("analyticsLevel", "Statistiques", "standard"),
      entitlement(
        "monthlyPromotionCredits",
        "Crédit remontée mensuel",
        1,
        undefined,
        {
          creditType: "immo_visibility",
          quantity: 1,
          resetPeriod: "billing_period",
        },
      ),
    ],
    consumers: ["immo-publish", "immo-agency-workspace"],
  }),
  product({
    id: "immo.agency.growth",
    kind: "subscription",
    name: "Shongre Immo Business",
    description:
      "Portefeuille étendu, attribution des demandes et statistiques avancées.",
    audience: "professional",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    amountMinor: 6990,
    annualAmountMinor: 69900,
    taxRateBps: 2000,
    trialDays: 30,
    recommended: true,
    entitlements: [
      entitlement("maxActiveListings", "Biens actifs", 75),
      entitlement("maxMonthlyPublications", "Publications par mois", 150),
      entitlement("maxMedia", "Photos par bien", 35),
      entitlement("maxVideosPerListing", "Vidéos par bien", 2),
      entitlement(
        "maxVirtualToursPerListing",
        "Visites virtuelles par bien",
        2,
      ),
      entitlement("maxTeamMembers", "Agents", 5),
      entitlement("maxLocations", "Agences", 2),
      entitlement("professionalStorefront", "Vitrine agence", true),
      entitlement("leadManagement", "Gestion et attribution des leads", true),
      entitlement("leadAttribution", "Attribution des demandes", true),
      entitlement("advancedAnalytics", "Statistiques avancées", true),
      entitlement("bulkActions", "Actions groupées", true),
      entitlement("csvImport", "Import CSV", true),
      entitlement("xmlImport", "Import XML / flux", true),
      entitlement("savedTemplates", "Modèles enregistrés", true),
      entitlement("duplicateListings", "Duplication et republication", true),
      entitlement(
        "monthlyPromotionCredits",
        "Crédits remontée mensuels",
        5,
        undefined,
        {
          creditType: "immo_visibility",
          quantity: 5,
          resetPeriod: "billing_period",
        },
      ),
      entitlement("prioritySupport", "Assistance prioritaire", true),
    ],
    consumers: ["immo-publish", "immo-agency-workspace"],
  }),
  product({
    id: "immo.agency.network",
    kind: "subscription",
    name: "Shongre Immo Agency+",
    description:
      "Portefeuille grande capacité, attribution avancée et statistiques de portefeuille.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    amountMinor: 12990,
    annualAmountMinor: 129900,
    taxRateBps: 2000,
    trialDays: 30,
    entitlements: [
      entitlement("maxActiveListings", "Biens actifs", 250),
      entitlement("maxMonthlyPublications", "Publications par mois", 500),
      entitlement("maxMedia", "Photos par bien", 50),
      entitlement("maxVideosPerListing", "Vidéos par bien", 3),
      entitlement(
        "maxVirtualToursPerListing",
        "Visites virtuelles par bien",
        3,
      ),
      entitlement("maxTeamMembers", "Agents", 15),
      entitlement("maxLocations", "Agences", 10),
      entitlement("agencyGroups", "Groupes d’agences", true),
      entitlement("csvImport", "Import CSV", true),
      entitlement("xmlImport", "Flux immobiliers", true),
      entitlement("inventoryApiSync", "Synchronisation API", true),
      entitlement("teamPermissions", "Permissions d’équipe", true),
      entitlement("leadAttribution", "Attribution avancée des leads", true),
      entitlement("portfolioAnalytics", "Statistiques de portefeuille", true),
      entitlement("reporting", "Exports et rapports", true),
      entitlement(
        "monthlyPromotionCredits",
        "Crédits remontée mensuels",
        15,
        undefined,
        {
          creditType: "immo_visibility",
          quantity: 15,
          resetPeriod: "billing_period",
        },
      ),
      entitlement("apiAccess", "Accès API", true),
      entitlement("prioritySupport", "Assistance prioritaire", true),
    ],
    consumers: ["immo-publish", "immo-agency-workspace"],
  }),
  ...[
    ["immo_urgent", "premium_option", "Urgent Immo", 790, 7, "urgent"],
    [
      "immo_bump",
      "premium_option",
      "Remonter l’annonce Immo",
      490,
      1,
      "searchBumpCredits",
    ],
    [
      "immo_featured",
      "sponsored_placement",
      "À la une Immo",
      1490,
      7,
      "featured",
    ],
    [
      "immo_featured_30d",
      "sponsored_placement",
      "À la une Immo 30 jours",
      3990,
      30,
      "featured",
    ],
    [
      "immo_bump_pack_10",
      "pack",
      "Pack de 10 remontées Immo",
      3490,
      365,
      "searchBumpCredits",
    ],
    [
      "immo_home_spotlight",
      "sponsored_placement",
      "Spotlight accueil Immo",
      2990,
      7,
      "homepageSpotlight",
    ],
    [
      "immo_local_spotlight",
      "sponsored_placement",
      "Spotlight local Immo",
      1990,
      7,
      "localSpotlight",
    ],
    [
      "immo_qualified_lead",
      "credit_pack",
      "Crédit lead qualifié Immo",
      590,
      undefined,
      "qualifiedLeadCredits",
    ],
    [
      "immo_sponsored_agency",
      "sponsored_placement",
      "Agence sponsorisée",
      4990,
      30,
      "sponsoredAgency",
    ],
  ].map(([id, kind, name, amountMinor, durationDays, entitlementKey]) =>
    product({
      id: String(id),
      kind: kind as MonetizationProduct["kind"],
      name: String(name),
      description: "Option commerciale Immo configurable et identifiable.",
      categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
      amountMinor: Number(amountMinor),
      taxRateBps: 2000,
      durationDays:
        durationDays === undefined ? undefined : Number(durationDays),
      entitlements: [
        entitlement(
          String(entitlementKey),
          String(name),
          String(id) === "immo_bump_pack_10"
            ? 10
            : kind === "credit_pack"
              ? 1
              : true,
        ),
      ],
      consumers: ["immo-catalog", "immo-publish", "immo-checkout"],
    }),
  ),
  product({
    id: "employment.employer.free",
    kind: "subscription",
    name: "Shongre Emploi Free",
    description:
      "Un profil employeur et un flux de candidatures essentiel, sans abonnement payant.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.jobs],
    amountMinor: 0,
    entitlements: [
      entitlement("maxActiveJobs", "Offres actives", 1),
      entitlement("maxMonthlyPublications", "Publications par mois", 3),
      entitlement("maxRecruiterSeats", "Recruteurs", 1),
      entitlement("employerProfile", "Profil employeur", true),
      entitlement("applicationWorkflow", "Gestion des candidatures", true),
      entitlement("basicAnalytics", "Statistiques essentielles", true),
    ],
    consumers: [
      "employment-publish",
      "employment-catalog",
      "employment-workspace",
    ],
  }),
  product({
    id: "employment.visibility.pack",
    kind: "pack",
    name: "Pack Visibilité Recrutement",
    description:
      "Visibilité facultative, identifiable et configurable par marché.",
    audience: "organization",
    categoryIds: [CANONICAL_TAXONOMY_IDS.jobs],
    amountMinor: 5900,
    taxRateBps: 2000,
    durationDays: 30,
    entitlements: [
      entitlement("urgentHiringBadge", "Badge recrutement urgent", true),
      entitlement("scheduledSearchBumps", "Remontées programmées", 4),
      entitlement("featuredPlacementDays", "Jours à la une", 14),
      entitlement("advancedAnalytics", "Statistiques détaillées", true),
    ],
    consumers: [
      "employment-publish",
      "employment-catalog",
      "employment-checkout",
    ],
  }),
  ...[
    [
      "employment.employer.starter",
      "Shongre Emploi Recruit",
      1990,
      19900,
      5,
      10,
      2,
      1,
      false,
    ],
    [
      "employment.employer.growth",
      "Shongre Emploi Business",
      4990,
      49900,
      20,
      40,
      5,
      5,
      true,
    ],
    [
      "employment.agency",
      "Shongre Emploi Scale",
      9990,
      99900,
      75,
      150,
      15,
      15,
      false,
    ],
    [
      "employment.network",
      "Emploi Enterprise — historique",
      0,
      0,
      1000,
      1000,
      500,
      0,
      false,
    ],
  ].map(
    ([
      id,
      name,
      amountMinor,
      annualAmountMinor,
      maxActiveJobs,
      maxMonthlyPublications,
      maxRecruiterSeats,
      promotionCredits,
      recommended,
    ]) =>
      product({
        id: String(id),
        kind: "subscription",
        name: String(name),
        description:
          "Offre employeur configurable, avec quotas et habilitations centralisés.",
        audience: "organization",
        categoryIds: [CANONICAL_TAXONOMY_IDS.jobs],
        amountMinor: Number(amountMinor),
        annualAmountMinor: Number(annualAmountMinor),
        taxRateBps: Number(amountMinor) > 0 ? 2000 : 0,
        trialDays: String(id) === "employment.network" ? undefined : 30,
        recommended: Boolean(recommended),
        status: String(id) === "employment.network" ? "disabled" : "active",
        entitlements: [
          entitlement("maxActiveJobs", "Offres actives", Number(maxActiveJobs)),
          entitlement(
            "maxMonthlyPublications",
            "Publications par mois",
            Number(maxMonthlyPublications),
          ),
          entitlement(
            "maxRecruiterSeats",
            "Recruteurs",
            Number(maxRecruiterSeats),
          ),
          entitlement("employerStorefront", "Page employeur", true),
          entitlement("candidatePipeline", "Pipeline de candidatures", true),
          entitlement("reusableTemplates", "Modèles d’offres", true),
          entitlement(
            "candidateAssignment",
            "Affectation des candidatures",
            String(id) !== "employment.employer.starter",
          ),
          entitlement(
            "interviewScheduling",
            "Planification d’entretiens",
            String(id) !== "employment.employer.starter",
          ),
          entitlement(
            "advancedAnalytics",
            "Statistiques avancées",
            String(id) !== "employment.employer.starter",
          ),
          entitlement(
            "csvImport",
            "Import d’offres",
            ["employment.agency", "employment.network"].includes(String(id)),
          ),
          entitlement(
            "apiSync",
            "Fondations ATS / API",
            ["employment.agency", "employment.network"].includes(String(id)),
          ),
          entitlement(
            "includedPromotionCredits",
            "Crédits d’offre sponsorisée mensuels",
            Number(promotionCredits),
            undefined,
            Number(promotionCredits) > 0
              ? {
                  creditType: "employment_visibility",
                  quantity: Number(promotionCredits),
                  resetPeriod: "billing_period",
                }
              : undefined,
          ),
        ],
        consumers: [
          "employment-publish",
          "employment-catalog",
          "employment-workspace",
        ],
      }),
  ),
  ...[
    [
      "employment.addon.urgent",
      "premium_option",
      "Recrutement urgent",
      900,
      7,
      "urgentHiringBadge",
    ],
    [
      "employment.addon.bump",
      "premium_option",
      "Remonter l’offre",
      1500,
      7,
      "scheduledSearchBumps",
    ],
    [
      "employment.addon.featured",
      "sponsored_placement",
      "À la une Emploi",
      2900,
      14,
      "featuredPlacement",
    ],
    [
      "employment.addon.local",
      "sponsored_placement",
      "Mise en avant locale",
      1900,
      7,
      "localSpotlight",
    ],
    [
      "employment.addon.seat",
      "credit_pack",
      "Siège recruteur supplémentaire",
      1200,
      30,
      "additionalRecruiterSeats",
    ],
    [
      "employment.addon.job-credit",
      "credit_pack",
      "Crédit d’offre active",
      2500,
      30,
      "additionalActiveJobs",
    ],
    [
      "employment.addon.analytics",
      "premium_option",
      "Statistiques étendues",
      3900,
      30,
      "advancedAnalytics",
    ],
    [
      "employment.addon.distribution",
      "service_fee",
      "Diffusion partenaire",
      4900,
      30,
      "distributionIntegration",
    ],
  ].map(([id, kind, name, amountMinor, durationDays, entitlementKey]) =>
    product({
      id: String(id),
      kind: kind as MonetizationProduct["kind"],
      name: String(name),
      description:
        "Option Emploi facultative, non présélectionnée et configurable par marché.",
      categoryIds: [CANONICAL_TAXONOMY_IDS.jobs],
      amountMinor: Number(amountMinor),
      taxRateBps: 2000,
      durationDays: Number(durationDays),
      entitlements: [
        entitlement(
          String(entitlementKey),
          String(name),
          kind === "credit_pack" ? 1 : true,
        ),
      ],
      consumers: [
        "employment-catalog",
        "employment-publish",
        "employment-checkout",
      ],
    }),
  ),
  ...[
    ["course.training.essential", "Cours Essential", 4900, 49000, 10, 2, false],
    ["course.training.business", "Cours Business", 11900, 119000, 75, 10, true],
    ["course.training.premium", "Cours Premium", 24900, 249000, 500, 50, false],
  ].map(
    ([
      id,
      name,
      amountMinor,
      annualAmountMinor,
      maxActiveOffers,
      teamMembers,
      recommended,
    ]) =>
      product({
        id: String(id),
        kind: "subscription",
        name: String(name),
        description:
          "Offre pour organismes, écoles et équipes de formation professionnelles.",
        audience: "organization",
        categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
        amountMinor: Number(amountMinor),
        annualAmountMinor: Number(annualAmountMinor),
        taxRateBps: 2000,
        status: "archived",
        recommended: Boolean(recommended),
        entitlements: [
          entitlement(
            "maxActiveOffers",
            "Cours actifs",
            Number(maxActiveOffers),
          ),
          entitlement("teamMembers", "Membres", Number(teamMembers)),
          entitlement(
            "advancedAnalytics",
            "Statistiques avancées",
            String(id) !== "course.training.essential",
          ),
        ],
        consumers: ["course-onboarding", "course-workspace", "solutions-pro"],
      }),
  ),
];

for (const plan of BASELINE_MONETIZATION_PRODUCTS.filter(
  (candidate) =>
    candidate.status === "active" && candidate.kind === "subscription",
)) {
  const verticalId = plan.commercialProfile.verticalId;
  plan.commercialProfile.compatibleAddonIds =
    BASELINE_MONETIZATION_PRODUCTS.filter(
      (candidate) =>
        candidate.status === "active" &&
        candidate.commercialProfile.planType === "addon" &&
        candidate.commercialProfile.verticalId === verticalId &&
        isCommercialAudienceCompatible(candidate.audience, plan.audience),
    ).map((candidate) => candidate.id);
}

const ruleScope = (
  marketCodes: string[],
  audiences: CommercialRule["scope"]["audiences"] = [],
  categoryIds: string[] = [],
): CommercialRule["scope"] => ({
  marketCodes,
  currencies: [],
  categoryIds,
  subcategoryIds: [],
  typeIds: [],
  subtypeIds: [],
  audiences,
  planIds: [],
  customerSegments: [],
  publicationChannels: [],
  verticalIds: [],
});

const rule = (
  id: string,
  name: string,
  priority: number,
  scopeValue: CommercialRule["scope"],
  outcome: CommercialRule["outcome"],
  conditions: CommercialRule["conditions"] = [],
): CommercialRule => ({
  id,
  setId: "commercial-core",
  versionId: VERSION_ID,
  key: id,
  name,
  description: name,
  priority,
  mandatory: false,
  scope: scopeValue,
  conditions,
  outcome,
  status: "active",
  effectiveFrom: PUBLISHED_AT,
});

export const BASELINE_COMMERCIAL_RULES: CommercialRule[] = [
  rule(
    "listing.individual.standard",
    "Publication standard Particulier",
    500,
    ruleScope(["FR"], ["individual"]),
    {
      eligible: true,
      quotaLimit: 20,
      quotaPeriodDays: 60,
      durationDays: 60,
      reasonCode: "STANDARD_LISTING_INCLUDED",
    },
  ),
  rule(
    "listing.individual.employment",
    "Publication Emploi Particulier",
    800,
    ruleScope(["FR"], ["individual"], [CANONICAL_TAXONOMY_IDS.jobs]),
    {
      eligible: true,
      quotaLimit: 1,
      quotaPeriodDays: 30,
      durationDays: 30,
      reasonCode: "EMPLOYMENT_INDIVIDUAL_INCLUDED",
    },
  ),
  rule(
    "listing.professional.standard",
    "Publication standard Professionnel",
    500,
    ruleScope(["FR"], ["professional"]),
    {
      eligible: true,
      quotaLimit: 50,
      quotaPeriodDays: 30,
      durationDays: 60,
      reasonCode: "PRO_STANDARD_LISTING_INCLUDED",
    },
  ),
  rule(
    "listing.organization.standard",
    "Publication standard Organisation",
    500,
    ruleScope(["FR"], ["organization"]),
    {
      eligible: true,
      quotaLimit: 250,
      quotaPeriodDays: 30,
      durationDays: 60,
      reasonCode: "ORGANIZATION_STANDARD_LISTING_INCLUDED",
    },
  ),
  rule(
    "listing.individual.auto",
    "Publication Auto Particulier",
    700,
    ruleScope(["FR"], ["individual"], [CANONICAL_TAXONOMY_IDS.vehicles]),
    {
      eligible: true,
      quotaLimit: 1,
      quotaPeriodDays: 60,
      durationDays: 60,
      reasonCode: "AUTO_INDIVIDUAL_INCLUDED",
    },
  ),
  rule(
    "listing.individual.immo",
    "Publication Immo Particulier",
    700,
    ruleScope(["FR"], ["individual"], [CANONICAL_TAXONOMY_IDS.realEstate]),
    {
      eligible: true,
      quotaLimit: 1,
      quotaPeriodDays: 60,
      durationDays: 60,
      reasonCode: "IMMO_INDIVIDUAL_INCLUDED",
    },
  ),
  rule(
    "listing.individual.courses",
    "Publication Cours Particulier",
    700,
    ruleScope(["FR"], ["individual"], [CANONICAL_TAXONOMY_IDS.courses]),
    {
      eligible: true,
      quotaLimit: 1,
      quotaPeriodDays: 30,
      durationDays: 60,
      reasonCode: "COURSE_INDIVIDUAL_INCLUDED",
    },
  ),
  ...[
    ["FR", 400, 70],
    ["BE", 450, 80],
    ["CH", 350, 100],
    ["LU", 400, 70],
    ["DE", 400, 70],
    ["ES", 450, 70],
  ].map(([market, rate, fixed]) =>
    rule(
      `fees.buyer_protection.${String(market).toLowerCase()}`,
      `Protection acheteur ${market}`,
      400,
      ruleScope([String(market)]),
      {
        feeRateBps: Number(rate),
        fixedFeeMinor: Number(fixed),
        reasonCode: "BUYER_PROTECTION_FEE",
      },
    ),
  ),
  ...[
    ["FR", 2000],
    ["BE", 2100],
    ["CH", 810],
    ["LU", 1700],
    ["DE", 1900],
    ["ES", 2100],
  ].map(([market, rate]) =>
    rule(
      `tax.digital.${String(market).toLowerCase()}`,
      `Taxe services numériques ${market}`,
      300,
      ruleScope([String(market)]),
      { taxRateBps: Number(rate), reasonCode: "DIGITAL_SERVICES_TAX" },
    ),
  ),
  rule(
    "transaction.range.fr",
    "Bornes transactionnelles France",
    300,
    ruleScope(["FR"]),
    {
      minimumAmountMinor: 100,
      maximumAmountMinor: 1_500_000,
      reasonCode: "TRANSACTION_AMOUNT_RANGE",
    },
  ),
  rule(
    "payout.instant.fr",
    "Frais de virement instantané France",
    300,
    ruleScope(["FR"]),
    {
      feeRateBps: 100,
      fixedFeeMinor: 50,
      reasonCode: "INSTANT_PAYOUT_FEE",
    },
  ),
];

const emptyCommissionScope = {
  countryCodes: [],
  marketCodes: [],
  currencies: [],
  verticalIds: [],
  categoryIds: [],
  subcategoryIds: [],
  transactionTypes: [],
  sellerTypes: [],
  sellerSegments: [],
  planIds: [],
  organizationIds: [],
  accountIds: [],
  campaignIds: [],
  paymentMethods: [],
};

/**
 * Migrated canonical commission policies.
 *
 * There is intentionally no zero-percent individual rule: the engine's safe
 * default is zero when no active eligible policy exists. The Courses policy is
 * retained as disabled configuration until its payment/booking/payout chain is
 * operational; merely publishing a course must never earn a commission.
 */
export const BASELINE_COMMISSION_POLICIES: CommissionPolicy[] = [
  {
    id: "commission-policy-marketplace-pro-fr",
    code: "marketplace.professional.fr",
    versionId: VERSION_ID,
    versionNumber: VERSION_NUMBER,
    name: "Transactions marketplace professionnelles — France",
    description:
      "Commission acquise uniquement après réussite du paiement d’une commande marketplace éligible.",
    policyType: "base",
    status: "active",
    effectiveFrom: PUBLISHED_AT,
    rolloutBps: 10_000,
    rules: [
      {
        id: "commission-rule-marketplace-pro-fr",
        policyId: "commission-policy-marketplace-pro-fr",
        versionId: VERSION_ID,
        name: "Professionnel marketplace France",
        description: "Taux historique migré de 3 % sur le sous-total article.",
        priority: 400,
        scope: {
          ...emptyCommissionScope,
          countryCodes: ["FR"],
          marketCodes: ["FR"],
          currencies: ["EUR"],
          transactionTypes: ["marketplace_order"],
          sellerTypes: ["professional", "organization"],
        },
        effect: {
          kind: "commission",
          base: "item_subtotal",
          model: { type: "percentage", rateBps: 300 },
          allocation: {
            sellerBps: 10_000,
            buyerBps: 0,
            platformAbsorbedBps: 0,
          },
          tax: { mode: "inclusive", rateBps: 2_000 },
          roundingMode: "half_up",
          earningEvent: "payment_succeeded",
          refundPolicy: "proportional",
        },
        effectiveFrom: PUBLISHED_AT,
      },
    ],
  },
  {
    id: "commission-policy-courses-fr",
    code: "courses.booking.fr",
    versionId: VERSION_ID,
    versionNumber: VERSION_NUMBER,
    name: "Réservations Education — France",
    description:
      "Taux historique conservé mais désactivé tant que booking, paiement et payout ne sont pas opérationnels.",
    policyType: "base",
    status: "disabled",
    effectiveFrom: PUBLISHED_AT,
    rolloutBps: 0,
    rules: [
      {
        id: "commission-rule-courses-fr",
        policyId: "commission-policy-courses-fr",
        versionId: VERSION_ID,
        name: "Réservation Education France",
        description: "Commission de 12 % sur réservation de cours finalisée.",
        priority: 650,
        scope: {
          ...emptyCommissionScope,
          countryCodes: ["FR"],
          marketCodes: ["FR"],
          currencies: ["EUR"],
          verticalIds: ["education"],
          categoryIds: [CANONICAL_TAXONOMY_IDS.courses],
          transactionTypes: ["course_booking"],
        },
        effect: {
          kind: "commission",
          base: "subtotal_after_discount",
          model: { type: "percentage", rateBps: 1_200 },
          allocation: {
            sellerBps: 10_000,
            buyerBps: 0,
            platformAbsorbedBps: 0,
          },
          tax: { mode: "inclusive", rateBps: 2_000 },
          roundingMode: "half_up",
          earningEvent: "service_completed",
          refundPolicy: "proportional",
        },
        effectiveFrom: PUBLISHED_AT,
      },
    ],
  },
];

export const BASELINE_MONETIZATION_CATALOG: MonetizationCatalog =
  monetizationCatalogSchema.parse({
    configurationVersionId: VERSION_ID,
    versionNumber: VERSION_NUMBER,
    marketCode: "FR",
    currency: "EUR",
    generatedAt: PUBLISHED_AT,
    subscriptionPolicy: {
      id: "subscription-policy-fr-v3",
      immediateUpgrade: "allowed",
      upgradeProration: "linear_remaining_time",
      downgradeTiming: "period_end",
      samePlanRenewalTiming: "period_end",
      billingIntervalChangeTiming: "period_end",
      cancellationTiming: "period_end",
      // The commercial grace duration has not been approved. The published
      // catalog therefore keeps paid access fail-closed after payment failure.
      paymentFailureAccess: "suspend_immediately",
      // Live provider plan mutation is release-gated until synchronized price
      // mappings and sandbox evidence exist. Demo transitions remain local.
      providerPlanChange: "not_configured",
    },
    verticals: BASELINE_BUSINESS_VERTICALS,
    products: BASELINE_MONETIZATION_PRODUCTS,
    promotions: [
      {
        id: "promotion-welcome-draft",
        code: "WELCOME10",
        name: "Bienvenue — brouillon",
        status: "draft",
        scope: scope("all"),
        productIds: ["premium.urgent", "premium.search_bump"],
        discountType: "percentage",
        discountValue: 1000,
        stackingPolicy: "exclusive",
        maximumRedemptionsPerAccount: 1,
        activationMode: "coupon",
        eligibleCustomerType: "new",
        durationBillingPeriods: 1,
        minimumCommitmentPeriods: 0,
        campaignId: "campaign-welcome-2026",
        verticalIds: [],
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-09-30T23:59:59.000Z",
      },
      {
        id: "promotion-auto-launch-2026",
        code: "AUTO2026",
        name: "Lancement Auto — Founding Pros",
        status: "active",
        scope: scope("professional", [CANONICAL_TAXONOMY_IDS.vehicles], "auto"),
        productIds: [
          "auto.dealer.starter",
          "auto.dealer.growth",
          "auto.dealer.network",
        ],
        discountType: "percentage",
        discountValue: 5000,
        stackingPolicy: "exclusive",
        maximumRedemptions: 500,
        maximumRedemptionsPerAccount: 1,
        activationMode: "coupon",
        eligibleCustomerType: "new",
        freePeriodDays: 90,
        durationBillingPeriods: 3,
        minimumCommitmentPeriods: 0,
        campaignId: "campaign-auto-launch-2026",
        verticalIds: ["auto"],
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
    ],
    rules: BASELINE_COMMERCIAL_RULES,
    commissionPolicies: BASELINE_COMMISSION_POLICIES,
    stale: false,
  });

/** Stable user-safe copy for machine reason codes returned by rule and pricing APIs. */
export const COMMERCIAL_REASON_MESSAGES = {
  ELIGIBLE: {
    fr: "Cette action est disponible.",
    en: "This action is available.",
  },
  QUOTA_EXHAUSTED: {
    fr: "Votre quota disponible est épuisé.",
    en: "Your available quota is exhausted.",
  },
  STANDARD_LISTING_INCLUDED: {
    fr: "Cette publication est incluse.",
    en: "This listing is included.",
  },
  PRO_STANDARD_LISTING_INCLUDED: {
    fr: "Cette publication est incluse dans votre offre Pro.",
    en: "This listing is included in your Pro plan.",
  },
  ORGANIZATION_STANDARD_LISTING_INCLUDED: {
    fr: "Cette publication est incluse dans l’offre de votre organisation.",
    en: "This listing is included in your organization plan.",
  },
  AUTO_INDIVIDUAL_INCLUDED: {
    fr: "Une annonce Auto est incluse pour les particuliers.",
    en: "One Auto listing is included for individuals.",
  },
  IMMO_INDIVIDUAL_INCLUDED: {
    fr: "Une annonce Immobilier est incluse pour les particuliers.",
    en: "One Real Estate listing is included for individuals.",
  },
  COURSE_INDIVIDUAL_INCLUDED: {
    fr: "Une annonce Éducation est incluse pour les particuliers.",
    en: "One Education listing is included for individuals.",
  },
  EMPLOYMENT_INDIVIDUAL_INCLUDED: {
    fr: "Une offre d’emploi standard est incluse pour les particuliers éligibles.",
    en: "One standard job posting is included for eligible individuals.",
  },
  CATALOG_PRICE: {
    fr: "Prix issu du catalogue publié.",
    en: "Price resolved from the published catalog.",
  },
  PROMOTION_APPLIED: {
    fr: "La promotion a été appliquée.",
    en: "The promotion was applied.",
  },
  PROMOTION_VALID: {
    fr: "Ce code promotionnel est valide.",
    en: "This promotion code is valid.",
  },
  PROMOTION_NOT_FOUND: {
    fr: "Ce code promotionnel est inconnu.",
    en: "This promotion code was not found.",
  },
  PROMOTION_DISABLED: {
    fr: "Ce code promotionnel n’est pas actif.",
    en: "This promotion code is not active.",
  },
  PROMOTION_NOT_STARTED: {
    fr: "Cette promotion n’a pas encore commencé.",
    en: "This promotion has not started yet.",
  },
  PROMOTION_EXPIRED: {
    fr: "Cette promotion est terminée.",
    en: "This promotion has ended.",
  },
  PROMOTION_SCOPE_MISMATCH: {
    fr: "Cette promotion ne s’applique pas à votre contexte.",
    en: "This promotion does not apply to your context.",
  },
  PROMOTION_PRODUCT_MISMATCH: {
    fr: "Cette promotion ne s’applique pas aux offres sélectionnées.",
    en: "This promotion does not apply to the selected products.",
  },
  PROMOTION_LIMIT_REACHED: {
    fr: "Cette promotion a atteint sa limite d’utilisation.",
    en: "This promotion has reached its redemption limit.",
  },
  PROMOTION_ACCOUNT_LIMIT_REACHED: {
    fr: "Vous avez déjà utilisé cette promotion.",
    en: "You have already used this promotion.",
  },
} as const;

export type CommercialReasonCode = keyof typeof COMMERCIAL_REASON_MESSAGES;
