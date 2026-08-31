import type {
  CommercialPlanProfile,
  CommercialRule,
  CommissionPolicy,
  MonetizationCatalog,
  MonetizationEntitlement,
  MonetizationProduct,
} from "../schemas/monetization";
import { monetizationCatalogSchema } from "../schemas/monetization";
import { CANONICAL_TAXONOMY_IDS } from "./taxonomy-catalog";
import { BASELINE_MONETIZATION_CATALOG } from "./monetization-catalog";

const VERSION_ID = "commercial-fr-v4-draft";
const VERSION_NUMBER = 4;
const GENERATED_AT = "2026-08-31T00:00:00.000Z";
const TARGET_PLAN_IDS = [
  "pro.target.starter",
  "pro.target.growth",
  "pro.target.performance",
] as const;
const VERTICAL_MODULE_IDS = [
  "module.auto.v4",
  "module.immo.v4",
  "module.emploi.v4",
  "module.education-services.v4",
] as const;

const scope = (
  audience: MonetizationProduct["audience"] = "all",
  categoryIds: string[] = [],
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
  verticalIds: [],
});

const entitlement = (
  key: string,
  label: string,
  value: MonetizationEntitlement["value"],
  options: Partial<MonetizationEntitlement> = {},
): MonetizationEntitlement => ({
  key,
  label,
  description: `Droit commercial « ${label} » géré par le catalogue Shongre.`,
  value,
  featureType:
    typeof value === "boolean"
      ? "boolean"
      : typeof value === "number"
        ? options.recurringGrant
          ? "monetary_credit"
          : "integer_quota"
        : "level",
  availability: "enabled",
  implementationStatus: "ready",
  dependencies: [],
  adminHelpText:
    "Ce droit reste soumis à la validation, à la readiness et à la publication de la version commerciale.",
  mergePolicy:
    typeof value === "boolean"
      ? "boolean_or"
      : typeof value === "number"
        ? "max"
        : "override",
  categoryIds: [],
  ...options,
});

const suspendedEntitlement = (
  key: string,
  label: string,
  value: MonetizationEntitlement["value"],
  implementationStatus: "incomplete" | "external_dependency",
  dependencies: string[] = [],
) =>
  entitlement(key, label, value, {
    availability: "maintenance",
    implementationStatus,
    dependencies,
    adminHelpText:
      implementationStatus === "external_dependency"
        ? "Dépendance externe non validée : droit caché, non accordé et non achetable."
        : "Parcours de production incomplet : droit caché, non accordé et non achetable.",
  });

const planProfile = (
  tier: "essential" | "business" | "premium",
  displayOrder: number,
  upgrades: string[],
  downgrades: string[],
): CommercialPlanProfile => ({
  planType: "generic",
  familyId: "pro.target",
  tier,
  professionalOnly: true,
  targetCategoryIds: [],
  countryAvailability: ["FR"],
  trialPolicy: {
    enabled: false,
    requiresPaymentMethod: false,
    firstTimeCustomersOnly: true,
    autoConverts: false,
    eligibleAudiences: ["professional", "organization"],
    eligibleMarketCodes: ["FR"],
  },
  upgradeProductIds: upgrades,
  downgradeProductIds: downgrades,
  compatibleAddonIds: [...VERTICAL_MODULE_IDS],
  requiresBusinessVerification: true,
  financeCategory: "generic_subscription",
  displayOrder,
});

const createProduct = (input: {
  id: string;
  name: string;
  description: string;
  kind: MonetizationProduct["kind"];
  audience?: MonetizationProduct["audience"];
  categoryIds?: string[];
  status?: MonetizationProduct["status"];
  prices: Array<{
    suffix: string;
    amountMinor: number;
    billingPeriod: "once" | "month" | "year";
    durationDays?: number;
    trialDays?: number;
  }>;
  entitlements: MonetizationEntitlement[];
  commercialProfile: CommercialPlanProfile;
  recommended?: boolean;
  sourceConsumers?: string[];
}): MonetizationProduct => ({
  id: input.id,
  versionId: `${VERSION_ID}:${input.id}`,
  code: input.id,
  kind: input.kind,
  name: input.name,
  description: input.description,
  audience: input.audience || "all",
  scope: scope(input.audience, input.categoryIds),
  prices: input.prices.map((price) => ({
    id: `${VERSION_ID}:${input.id}:${price.suffix}`,
    amount: { amountMinor: price.amountMinor, currency: "EUR" },
    billingPeriod: price.billingPeriod,
    taxRateBps: 2_000,
    priceIncludesTax: false,
    durationDays: price.durationDays,
    trialDays: price.trialDays,
  })),
  entitlements: input.entitlements,
  compatibility: {
    requiresProductIds: [],
    excludesProductIds: [],
    maximumQuantity: 1,
  },
  status: input.status || "draft",
  recommended: input.recommended || false,
  sourceConsumers: input.sourceConsumers || ["solutions-pro"],
  commercialProfile: input.commercialProfile,
});

const oneTimeProfile = (
  familyId: string,
  verticalId?: CommercialPlanProfile["verticalId"],
): CommercialPlanProfile => ({
  planType: "addon",
  familyId,
  verticalId,
  professionalOnly: false,
  targetCategoryIds: [],
  countryAvailability: ["FR"],
  trialPolicy: {
    enabled: false,
    requiresPaymentMethod: true,
    firstTimeCustomersOnly: true,
    autoConverts: false,
    eligibleAudiences: ["all"],
    eligibleMarketCodes: ["FR"],
  },
  upgradeProductIds: [],
  downgradeProductIds: [],
  compatibleAddonIds: [],
  requiresBusinessVerification: false,
  financeCategory: "promotion",
  displayOrder: 100,
});

const TARGET_PRODUCTS: MonetizationProduct[] = [
  createProduct({
    id: "pro.target.starter",
    name: "Pro Starter",
    description:
      "Socle professionnel cible, soumis au parcours de migration contrôlé.",
    kind: "subscription",
    audience: "professional",
    prices: [
      { suffix: "month", amountMinor: 1_990, billingPeriod: "month" },
      { suffix: "year", amountMinor: 19_900, billingPeriod: "year" },
    ],
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 20),
      entitlement("teamMembers", "Membres d’équipe", 1),
      entitlement("professionalProfile", "Page professionnelle", true),
      entitlement("messaging", "Messagerie", true),
      entitlement("analyticsLevel", "Statistiques", "basic"),
      entitlement("promotionCredits", "Crédits de visibilité", 2, {
        recurringGrant: {
          creditType: "listing_promotion",
          quantity: 2,
          resetPeriod: "billing_period",
        },
      }),
      entitlement("supportTier", "Assistance", "standard"),
    ],
    commercialProfile: planProfile(
      "essential",
      10,
      ["pro.target.growth", "pro.target.performance"],
      [],
    ),
  }),
  createProduct({
    id: "pro.target.growth",
    name: "Pro Growth",
    description:
      "Offre de croissance avec capacités avancées activées selon readiness.",
    kind: "subscription",
    audience: "professional",
    recommended: true,
    prices: [
      { suffix: "month", amountMinor: 4_990, billingPeriod: "month" },
      { suffix: "year", amountMinor: 49_900, billingPeriod: "year" },
    ],
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 100),
      entitlement("teamMembers", "Membres d’équipe", 3),
      suspendedEntitlement("csvImport", "Import CSV", true, "incomplete"),
      suspendedEntitlement(
        "feedImport",
        "Import de flux",
        true,
        "external_dependency",
        ["csvImport"],
      ),
      entitlement("leadInbox", "Boîte de réception des leads", true),
      entitlement("analyticsLevel", "Statistiques", "advanced"),
      entitlement("promotionCredits", "Crédits de visibilité", 10, {
        recurringGrant: {
          creditType: "listing_promotion",
          quantity: 10,
          resetPeriod: "billing_period",
        },
      }),
      entitlement("eligibleVerticalTools", "Outils verticaux éligibles", true),
      entitlement("supportTier", "Assistance", "growth"),
    ],
    commercialProfile: planProfile(
      "business",
      20,
      ["pro.target.performance"],
      ["pro.target.starter"],
    ),
  }),
  createProduct({
    id: "pro.target.performance",
    name: "Pro Performance",
    description:
      "Offre haute capacité dont les intégrations restent soumises à readiness.",
    kind: "subscription",
    audience: "professional",
    prices: [
      { suffix: "month", amountMinor: 11_690, billingPeriod: "month" },
      { suffix: "year", amountMinor: 116_900, billingPeriod: "year" },
    ],
    entitlements: [
      entitlement("maxActiveListings", "Annonces actives", 500),
      entitlement("teamMembers", "Membres d’équipe", 10),
      suspendedEntitlement(
        "apiAccess",
        "Accès API",
        true,
        "external_dependency",
      ),
      suspendedEntitlement(
        "feedImport",
        "Import de flux",
        true,
        "external_dependency",
      ),
      suspendedEntitlement(
        "callTracking",
        "Suivi des appels",
        true,
        "external_dependency",
      ),
      suspendedEntitlement(
        "crmIntegration",
        "Intégration CRM",
        true,
        "external_dependency",
      ),
      entitlement("analyticsLevel", "Statistiques", "advanced"),
      entitlement("promotionCredits", "Crédits de visibilité", 30, {
        recurringGrant: {
          creditType: "listing_promotion",
          quantity: 30,
          resetPeriod: "billing_period",
        },
      }),
      suspendedEntitlement(
        "prioritySupport",
        "Assistance prioritaire",
        true,
        "incomplete",
      ),
    ],
    commercialProfile: planProfile(
      "premium",
      30,
      [],
      ["pro.target.growth", "pro.target.starter"],
    ),
  }),
  ...[
    ["module.auto.v4", "Module Auto", "auto"] as const,
    ["module.immo.v4", "Module Immobilier", "immo"] as const,
    ["module.emploi.v4", "Module Emploi", "emploi"] as const,
    [
      "module.education-services.v4",
      "Module Éducation et Services",
      "education",
    ] as const,
  ].map(([id, name, verticalId]) =>
    createProduct({
      id,
      name,
      description:
        "Module vertical attachable au socle Pro ; chaque capacité est accordée uniquement lorsqu’elle est opérationnelle.",
      kind: "pack",
      audience: "professional",
      prices: [{ suffix: "draft", amountMinor: 0, billingPeriod: "once" }],
      entitlements: [
        suspendedEntitlement(
          `${verticalId}.module`,
          `${name} configuré`,
          true,
          "incomplete",
        ),
      ],
      commercialProfile: {
        ...oneTimeProfile(`pro.module.${verticalId}`, verticalId),
        professionalOnly: true,
        financeCategory: "addon",
      },
    }),
  ),
];

const VISIBILITY_PRODUCTS: MonetizationProduct[] = [
  ["visibility.bump.v4", "Remonter l’annonce", 99, 1, "searchBumpCredits"],
  ["visibility.featured.3d.v4", "À la une — 3 jours", 199, 3, "spotlight"],
  ["visibility.featured.7d.v4", "À la une — 7 jours", 490, 7, "spotlight"],
  [
    "visibility.refresh.7d.v4",
    "Rafraîchissement quotidien — 7 jours",
    390,
    7,
    "dailyRefresh",
  ],
  ["visibility.urgent.v4", "Urgent", 99, 7, "urgent"],
  [
    "visibility.pack.general.v4",
    "Pack visibilité général",
    690,
    7,
    "generalVisibility",
  ],
  [
    "visibility.pack.vehicle.v4",
    "Pack visibilité véhicule",
    1_490,
    7,
    "vehicleVisibility",
  ],
  [
    "visibility.immo.top.a.v4",
    "Top Visibilité Immobilier A",
    2_690,
    7,
    "immoTopVisibility",
  ],
  [
    "visibility.immo.top.b.v4",
    "Top Visibilité Immobilier B",
    2_990,
    7,
    "immoTopVisibility",
  ],
].map(([id, name, amountMinor, durationDays, entitlementKey]) =>
  createProduct({
    id: String(id),
    name: String(name),
    description:
      "Placement rémunéré identifiable, isolé du score de pertinence organique.",
    kind:
      String(id).includes("featured") || String(id).includes("top")
        ? "sponsored_placement"
        : String(id).includes("pack")
          ? "pack"
          : "premium_option",
    prices: [
      {
        suffix: "once",
        amountMinor: Number(amountMinor),
        billingPeriod: "once",
        durationDays: Number(durationDays),
      },
    ],
    entitlements: [
      entitlement(
        String(entitlementKey),
        String(name),
        String(entitlementKey).includes("Credits") ? 1 : true,
      ),
    ],
    commercialProfile: oneTimeProfile("visibility.v4"),
    sourceConsumers: ["publish-wizard", "my-listings", "search"],
  }),
);

const DEFERRED_PRODUCTS: MonetizationProduct[] = [
  createProduct({
    id: "vehicle.additional-slot.v4",
    name: "Emplacement véhicule supplémentaire",
    description:
      "Capacité supplémentaire après contrôle atomique du quota Auto.",
    kind: "additional_listing",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    prices: [{ suffix: "once", amountMinor: 490, billingPeriod: "once" }],
    entitlements: [
      entitlement(
        "additionalActiveVehicles",
        "Véhicule actif supplémentaire",
        1,
      ),
    ],
    commercialProfile: oneTimeProfile("individual.vehicle", "auto"),
  }),
  createProduct({
    id: "vehicle.secure-payment.v4",
    name: "Paiement sécurisé véhicule",
    description:
      "Configuration désactivée jusqu’à validation juridique, prestataire et opérationnelle.",
    kind: "service_fee",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    status: "disabled",
    prices: [{ suffix: "once", amountMinor: 690, billingPeriod: "once" }],
    entitlements: [
      suspendedEntitlement(
        "secureVehiclePayment",
        "Paiement sécurisé véhicule",
        true,
        "external_dependency",
      ),
    ],
    commercialProfile: oneTimeProfile("deferred.vehicle", "auto"),
  }),
  createProduct({
    id: "vehicle.protection.v4",
    name: "Protection véhicule",
    description:
      "Protection partenaire désactivée dans l’attente des validations requises.",
    kind: "verification_service",
    audience: "individual",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    status: "disabled",
    prices: [
      {
        suffix: "3m",
        amountMinor: 4_690,
        billingPeriod: "once",
        durationDays: 90,
      },
      {
        suffix: "6m",
        amountMinor: 8_690,
        billingPeriod: "once",
        durationDays: 180,
      },
      {
        suffix: "12m",
        amountMinor: 13_300,
        billingPeriod: "once",
        durationDays: 365,
      },
    ],
    entitlements: [
      suspendedEntitlement(
        "vehicleProtection",
        "Protection véhicule",
        true,
        "external_dependency",
      ),
    ],
    commercialProfile: oneTimeProfile("deferred.vehicle", "auto"),
  }),
  createProduct({
    id: "tenant.premium-pass.v4",
    name: "Pass locataire premium",
    description:
      "Offre désactivée jusqu’à validation juridique et opérationnelle.",
    kind: "verification_service",
    status: "disabled",
    prices: [{ suffix: "once", amountMinor: 499, billingPeriod: "once" }],
    entitlements: [
      suspendedEntitlement(
        "tenantPremiumPass",
        "Pass locataire premium",
        true,
        "external_dependency",
      ),
    ],
    commercialProfile: oneTimeProfile("deferred.immo", "immo"),
  }),
  createProduct({
    id: "vehicle.valuation-report.v4",
    name: "Rapport de valorisation véhicule",
    description:
      "Rapport partenaire désactivé jusqu’à validation du fournisseur de données.",
    kind: "verification_service",
    categoryIds: [CANONICAL_TAXONOMY_IDS.vehicles],
    status: "disabled",
    prices: [{ suffix: "once", amountMinor: 469, billingPeriod: "once" }],
    entitlements: [
      suspendedEntitlement(
        "vehicleValuationReport",
        "Rapport de valorisation",
        true,
        "external_dependency",
      ),
    ],
    commercialProfile: oneTimeProfile("deferred.vehicle", "auto"),
  }),
];

const cloneBaselineProducts = () =>
  BASELINE_MONETIZATION_CATALOG.products.map((product) => ({
    ...structuredClone(product),
    versionId: `${VERSION_ID}:${product.id}`,
    prices: product.prices.map((price, index) => ({
      ...price,
      providerPriceId: undefined,
      id: `${VERSION_ID}:${product.id}:${price.billingPeriod}:${index + 1}`,
    })),
  }));

const targetMigration = (product: MonetizationProduct) => {
  const tier = product.commercialProfile.tier;
  const toProductId =
    tier === "premium" || tier === "enterprise"
      ? "pro.target.performance"
      : tier === "business"
        ? "pro.target.growth"
        : "pro.target.starter";
  return {
    id: `migration:${product.id}:target`,
    fromProductId: product.id,
    fromProductVersionId: product.versionId,
    toProductId,
    treatment: "customer_choice_required" as const,
    requiresCustomerAcceptance: true,
    preserveHistoricalPrice: true,
    preserveHistoricalEntitlements: true,
    shadowQuoteStatus: "not_run" as const,
    intentionalDifferences: [],
    rolloutStatus: "draft" as const,
  };
};

const targetProducts = [
  ...TARGET_PRODUCTS,
  ...VISIBILITY_PRODUCTS,
  ...DEFERRED_PRODUCTS,
];
const targetPriceEntries = targetProducts.flatMap((product) =>
  product.prices.map((price) => ({ product, price })),
);

const TARGET_COMMISSION_POLICY: CommissionPolicy = {
  id: "commission-policy-target-secure-transactions-fr",
  code: "marketplace.secure.target.fr",
  versionId: VERSION_ID,
  versionNumber: VERSION_NUMBER,
  name: "Transactions sécurisées cibles — France",
  description:
    "Matrice désactivée. Seule la catégorie canonique Électronique est liée ; les autres références restent bloquées jusqu’à leur binding taxonomique approuvé.",
  policyType: "base",
  status: "disabled",
  effectiveFrom: GENERATED_AT,
  rolloutBps: 0,
  rules: [
    {
      id: "commission-rule-target-electronics-fr",
      policyId: "commission-policy-target-secure-transactions-fr",
      versionId: VERSION_ID,
      name: "Électronique — référence 3 %",
      description:
        "Règle désactivée liée à la catégorie canonique Électronique.",
      priority: 500,
      scope: {
        countryCodes: ["FR"],
        marketCodes: ["FR"],
        currencies: ["EUR"],
        verticalIds: [],
        categoryIds: [CANONICAL_TAXONOMY_IDS.electronics],
        subcategoryIds: [],
        transactionTypes: ["marketplace_order"],
        sellerTypes: ["professional", "organization"],
        sellerSegments: [],
        planIds: [],
        organizationIds: [],
        accountIds: [],
        campaignIds: [],
        paymentMethods: [],
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
      effectiveFrom: GENERATED_AT,
    },
  ],
};

const rules: CommercialRule[] = [
  ...BASELINE_MONETIZATION_CATALOG.rules.map((rule) => ({
    ...structuredClone(rule),
    versionId: VERSION_ID,
    ...(rule.key === "fees.buyer_protection.fr"
      ? {
          id: "fees-buyer-protection-fr-target",
          status: "draft" as const,
          outcome: {
            feeRateBps: 170,
            fixedFeeMinor: 25,
            reasonCode: "BUYER_PROTECTION_FEE",
          },
        }
      : {}),
  })),
  {
    id: "fees-holiday-traveler-fr-target",
    setId: "commercial-core",
    versionId: VERSION_ID,
    key: "fees.holiday_traveler.fr",
    name: "Frais voyageur location saisonnière — cible désactivée",
    description:
      "Configuration à 4,7 %, désactivée jusqu’à validation juridique, fiscale, paiement et opérationnelle.",
    priority: 450,
    mandatory: false,
    scope: {
      ...scope("all", [CANONICAL_TAXONOMY_IDS.realEstateRentals]),
      publicationChannels: [],
    },
    conditions: [],
    outcome: {
      feeRateBps: 470,
      reasonCode: "HOLIDAY_TRAVELER_FEE",
    },
    status: "disabled",
  },
];

export const PROPOSED_MONETIZATION_DRAFT_CATALOG: MonetizationCatalog =
  monetizationCatalogSchema.parse({
    ...structuredClone(BASELINE_MONETIZATION_CATALOG),
    configurationVersionId: VERSION_ID,
    versionNumber: VERSION_NUMBER,
    generatedAt: GENERATED_AT,
    products: [...cloneBaselineProducts(), ...targetProducts],
    promotions: BASELINE_MONETIZATION_CATALOG.promotions.map((promotion) => ({
      ...structuredClone(promotion),
      id: `${VERSION_ID}:${promotion.code.toLowerCase()}`,
    })),
    rules,
    commissionPolicies: [
      ...BASELINE_MONETIZATION_CATALOG.commissionPolicies.map((policy) => ({
        ...structuredClone(policy),
        versionId: VERSION_ID,
        versionNumber: VERSION_NUMBER,
        rules: policy.rules.map((rule) => ({
          ...structuredClone(rule),
          versionId: VERSION_ID,
        })),
      })),
      TARGET_COMMISSION_POLICY,
    ],
    migrationMappings: BASELINE_MONETIZATION_CATALOG.products
      .filter(
        (product) =>
          product.status === "active" &&
          product.kind === "subscription" &&
          product.commercialProfile.professionalOnly,
      )
      .map(targetMigration),
    priceProtectionPolicies: [
      {
        id: "price-lock-founding-professional-12m",
        name: "Blocage de prix Founding Professional — 12 mois",
        protectionType: "price_lock",
        productIds: [...TARGET_PLAN_IDS],
        startsWhen: "paid_subscription_starts",
        durationMonths: 12,
        preservePriceId: true,
        requiresCustomerAcceptance: true,
        campaignId: "campaign-founding-professional",
        status: "draft",
      },
    ],
    campaigns: [
      {
        id: "campaign-founding-professional",
        code: "FOUNDING_PRO",
        name: "Founding Professional",
        status: "draft",
        productIds: [...TARGET_PLAN_IDS],
        eligibleMarketCodes: ["FR"],
        eligibleRegionCodes: [],
        eligibleVerticalIds: [
          "auto",
          "immo",
          "emploi",
          "education",
          "services",
        ],
        maximumVerticals: 1,
        enrollmentMethods: [
          "individual_enrollment",
          "organization_import",
          "campaign_eligibility",
        ],
        trialDays: 90,
        paymentMethodRequirement: "optional",
        reminderDaysBeforeEnd: [30, 14, 7, 1],
        gracePeriodDays: 0,
        conversionBehavior: "customer_selected_plan",
        priceProtectionPolicyId: "price-lock-founding-professional-12m",
        benefits: [
          "concierge_catalog_import",
          "verified_professional_page",
          "analytics_access",
          "weekly_value_report",
        ],
      },
    ],
    commercialEconomics: targetPriceEntries.map(({ product, price }) => ({
      id: `economics:${price.id}`,
      productId: product.id,
      priceId: price.id,
      marketCode: "FR",
      currency: "EUR",
      ...(product.id === "vehicle.secure-payment.v4"
        ? { referenceAmountMinor: 666 }
        : {}),
      approvalStatus: "missing_inputs",
      status: product.status === "disabled" ? "disabled" : "draft",
    })),
    providerMappings: TARGET_PRODUCTS.filter(
      (product) => product.kind === "subscription",
    ).flatMap((product) =>
      product.prices.map((price) => ({
        id: `stripe:production:${price.id}`,
        provider: "stripe",
        environment: "production" as const,
        marketCode: "FR" as const,
        internalReferenceType: "price" as const,
        internalReferenceId: price.id,
        synchronizationStatus: "missing" as const,
        status: "draft" as const,
      })),
    ),
    paidPlacementPolicies: VISIBILITY_PRODUCTS.filter(
      (product) => product.kind === "sponsored_placement",
    ).map((product) => ({
      id: `placement:${product.id}`,
      productId: product.id,
      inventoryScope: product.id.includes("immo") ? "category" : "search",
      visibleLabelMessageKey: "listing.paidPlacement.label",
      rotationStrategy: "paced_rotation",
      underDeliveryHandling: "credit",
      organicRankingIsolation: true,
      status: "draft",
    })),
    offerDefinitions: [
      {
        id: "enterprise-network-v4",
        name: "Enterprise / Network",
        offerType: "enterprise_network",
        pricingModel: "customer_specific_price_book",
        marketCodes: ["FR"],
        currency: "EUR",
        readiness: "incomplete",
        dependencies: ["enterprise_contract_approval", "customer_acceptance"],
        requiresCostValidation: true,
        requiresInternalApproval: true,
        requiresCustomerAcceptance: true,
        signedAgreementRequired: true,
        status: "draft",
      },
      ...[
        ["qualified-lead-v4", "Leads qualifiés", "qualified_lead"],
        ["advertising-v4", "Produits publicitaires", "advertising"],
        ["insurance-v4", "Assurance partenaire", "insurance"],
        ["warranty-v4", "Garantie partenaire", "warranty"],
        ["partner-services-v4", "Services partenaires", "partner_service"],
        [
          "visibility-immo-undefined-v4",
          "Variante Top Visibilité à définir",
          "undefined_visibility_variant",
        ],
      ].map(([id, name, offerType]) => ({
        id,
        name,
        offerType,
        pricingModel: "unpriced_draft" as const,
        marketCodes: ["FR" as const],
        currency: "EUR",
        readiness: "external_dependency" as const,
        dependencies: ["legal", "provider", "cost", "operations"],
        requiresCostValidation: true,
        requiresInternalApproval: true,
        requiresCustomerAcceptance: false,
        signedAgreementRequired: false,
        status: "disabled" as const,
      })),
    ],
    stale: false,
  });

export const PROPOSED_MONETIZATION_DRAFT_VERSION = {
  id: VERSION_ID,
  setId: "commercial-core",
  versionNumber: VERSION_NUMBER,
  marketCode: "FR" as const,
  status: "draft" as const,
  reason:
    "Brouillon cible Starter, Growth et Performance avec migration et garde-fous",
  createdBy: "system:reviewed-seed",
  createdAt: GENERATED_AT,
  productCount: PROPOSED_MONETIZATION_DRAFT_CATALOG.products.length,
  ruleCount:
    PROPOSED_MONETIZATION_DRAFT_CATALOG.rules.length +
    PROPOSED_MONETIZATION_DRAFT_CATALOG.commissionPolicies.reduce(
      (count, policy) => count + policy.rules.length,
      0,
    ),
  conflicts: [],
};
