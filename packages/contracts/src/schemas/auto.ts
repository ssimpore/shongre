import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

/** Public, versioned contracts for the specialized automotive vertical. */
export const AUTO_SCHEMA_VERSION = 1 as const;
export const autoVerticalSchema = z.literal("automotive");
export const autoSchemaVersionSchema = z.literal(AUTO_SCHEMA_VERSION);

export const vehicleTypeSchema = z.enum([
  "car",
  "motorcycle",
  "utility",
  "truck",
  "motorhome",
  "boat",
  "agricultural",
  "construction",
  "parts",
  "other",
]);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

export const sellerTypeSchema = z.enum(["individual", "dealer"]);
export const vehicleConditionSchema = z.enum([
  "new",
  "excellent",
  "good",
  "fair",
  "damaged",
  "for_parts",
]);
export const vehicleLifecycleSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "reserved",
  "sold",
  "expired",
  "suspended",
  "rejected",
  "archived",
]);
export const fuelTypeSchema = z.enum([
  "petrol",
  "diesel",
  "electric",
  "hybrid",
  "plug_in_hybrid",
  "lpg",
  "hydrogen",
  "other",
]);
export const transmissionSchema = z.enum([
  "manual",
  "automatic",
  "semi_automatic",
  "other",
]);
export const mileageUnitSchema = z.enum(["km", "mi", "hours"]);

export const autoFeatureFlagsSchema = z.object({
  verticalEnabled: z.boolean(),
  comparisonsEnabled: z.boolean(),
  savedSearchesEnabled: z.boolean(),
  structuredLeadsEnabled: z.boolean(),
  appointmentsEnabled: z.boolean(),
  dealerImportsEnabled: z.boolean(),
  dealerApiSyncEnabled: z.boolean(),
  paidOffersEnabled: z.boolean(),
  secureSaleEnabled: z.boolean(),
  financingReferralsEnabled: z.boolean(),
  insuranceReferralsEnabled: z.boolean(),
  inspectionReferralsEnabled: z.boolean(),
  warrantyReferralsEnabled: z.boolean(),
  deliveryReferralsEnabled: z.boolean(),
  tradeInReferralsEnabled: z.boolean(),
  boatListingsEnabled: z.boolean(),
});
export type AutoFeatureFlags = z.infer<typeof autoFeatureFlagsSchema>;

export const autoEntitlementsSchema = z.object({
  maxActiveVehicles: z.number().int().nonnegative(),
  maxPhotosPerVehicle: z.number().int().nonnegative(),
  maxVideosPerVehicle: z.number().int().nonnegative(),
  maxTeamMembers: z.number().int().nonnegative(),
  maxLocations: z.number().int().nonnegative(),
  monthlyPromotionCredits: z.number().int().nonnegative(),
  includedUrgentCredits: z.number().int().nonnegative(),
  includedBumpCredits: z.number().int().nonnegative(),
  includedFeaturedCredits: z.number().int().nonnegative(),
  inventoryCsvImport: z.boolean(),
  inventoryXmlImport: z.boolean(),
  inventoryApiSync: z.boolean(),
  leadAssignment: z.boolean(),
  leadReminders: z.boolean(),
  publicStorefront: z.boolean(),
  vehicleVideo: z.boolean(),
  vehicleView360: z.boolean(),
  detailedAnalytics: z.boolean(),
  networkAnalytics: z.boolean(),
  apiAccess: z.boolean(),
  centralizedBilling: z.boolean(),
  branchPermissions: z.boolean(),
  stockTransfers: z.boolean(),
  customPlan: z.boolean(),
  serviceLevelAgreement: z.boolean(),
  prioritySupport: z.boolean(),
});
export type AutoEntitlements = z.infer<typeof autoEntitlementsSchema>;

export const autoPlanSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  audience: z.enum(["individual", "dealer"]),
  vehicleTypes: z.array(vehicleTypeSchema).min(1).optional(),
  name: z.string().min(1),
  description: z.string(),
  monthlyPrice: moneySchema.optional(),
  annualPrice: moneySchema.optional(),
  durationDays: z.number().int().positive().optional(),
  trialDays: z.number().int().nonnegative().optional(),
  taxRateBps: z.number().int().nonnegative(),
  isActive: z.boolean(),
  isRecommended: z.boolean(),
  entitlements: autoEntitlementsSchema,
});
export type AutoPlan = z.infer<typeof autoPlanSchema>;

export const autoAddOnSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  vehicleType: vehicleTypeSchema.optional(),
  type: z.enum([
    "secure_sale",
    "urgent",
    "search_bump",
    "featured",
    "homepage_spotlight",
    "category_spotlight",
    "qualified_lead",
    "sponsored_dealer",
    "inspection_referral",
    "warranty_referral",
    "financing_referral",
    "insurance_referral",
    "delivery_referral",
    "trade_in_referral",
    "extra_vehicle_pack",
    "lead_credit_pack",
  ]),
  name: z.string().min(1),
  description: z.string(),
  price: moneySchema,
  taxRateBps: z.number().int().nonnegative(),
  validityDays: z.number().int().positive().optional(),
  creditQuantity: z.number().int().positive().optional(),
  isActive: z.boolean(),
});
export type AutoAddOn = z.infer<typeof autoAddOnSchema>;

export const vehicleTypeConfigSchema = z.object({
  type: vehicleTypeSchema,
  slug: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  iconName: z.string(),
  schemaVersion: z.number().int().positive(),
  isActive: z.boolean(),
  requiredFieldIds: z.array(z.string()),
  filterFieldIds: z.array(z.string()),
  sortOrder: z.number().int(),
});
export type VehicleTypeConfig = z.infer<typeof vehicleTypeConfigSchema>;

export const vehicleAttributeDefinitionSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  vehicleTypes: z.array(vehicleTypeSchema).min(1),
  label: z.string().min(1),
  fieldType: z.enum([
    "text",
    "number",
    "boolean",
    "single_select",
    "multi_select",
    "date",
  ]),
  unit: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        sortOrder: z.number().int(),
      }),
    )
    .optional(),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number().int(),
  schemaVersion: z.number().int().positive(),
  isActive: z.boolean(),
});
export type VehicleAttributeDefinition = z.infer<
  typeof vehicleAttributeDefinitionSchema
>;

export const vehicleCatalogEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["make", "model", "generation", "trim"]),
  parentId: z.string().optional(),
  vehicleTypes: z.array(vehicleTypeSchema).min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  startsYear: z.number().int().min(1880).max(2200).optional(),
  endsYear: z.number().int().min(1880).max(2200).optional(),
  isActive: z.boolean(),
});
export type VehicleCatalogEntry = z.infer<typeof vehicleCatalogEntrySchema>;

export const vehicleTechnicalSchema = z.object({
  bodyType: z.string().optional(),
  modelYear: z.number().int().min(1880).max(2200),
  firstRegistrationDate: z.string().optional(),
  mileage: z.number().int().nonnegative(),
  mileageUnit: mileageUnitSchema,
  fuelType: fuelTypeSchema,
  transmission: transmissionSchema,
  powerKw: z.number().int().nonnegative().optional(),
  powerHp: z.number().int().nonnegative().optional(),
  fiscalPower: z.number().int().nonnegative().optional(),
  batteryCapacityKwh: z.number().nonnegative().optional(),
  electricRangeKm: z.number().int().nonnegative().optional(),
  chargingPowerKw: z.number().nonnegative().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  doors: z.number().int().nonnegative().optional(),
  seats: z.number().int().nonnegative().optional(),
  co2GramsPerKm: z.number().int().nonnegative().optional(),
  critAirClass: z.string().optional(),
});
export type VehicleTechnical = z.infer<typeof vehicleTechnicalSchema>;

export const vehicleHistorySchema = z.object({
  condition: vehicleConditionSchema,
  accidentStatus: z.enum([
    "none_declared",
    "repaired",
    "known_damage",
    "unknown",
  ]),
  previousOwnerCount: z.number().int().nonnegative().optional(),
  maintenanceBookStatus: z.enum(["complete", "partial", "none", "unknown"]),
  inspectionStatus: z.enum([
    "not_applicable",
    "valid",
    "due_soon",
    "expired",
    "unknown",
  ]),
  inspectionValidUntil: z.string().optional(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  warrantyLabel: z.string().optional(),
});
export type VehicleHistory = z.infer<typeof vehicleHistorySchema>;

export const vehicleDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "registration_certificate",
    "roadworthiness_inspection",
    "histovec_or_non_pledge",
    "transfer_document",
    "maintenance_invoice",
    "warranty",
    "other",
  ]),
  status: z.enum([
    "missing",
    "uploaded_private",
    "pending_review",
    "verified",
    "rejected",
    "expired",
  ]),
  publicLabel: z.string(),
  expiresAt: z.string().optional(),
  updatedAt: z.string(),
});
export type VehicleDocument = z.infer<typeof vehicleDocumentSchema>;

export const vehicleTrustSchema = z.object({
  sellerIdentity: z.enum(["not_submitted", "pending", "verified", "rejected"]),
  professionalBusiness: z.enum([
    "not_applicable",
    "not_submitted",
    "pending",
    "verified",
    "rejected",
  ]),
  vinOnFile: z.boolean(),
  documents: z.array(vehicleDocumentSchema),
  historyReportStatus: z.enum([
    "unavailable",
    "declared",
    "uploaded_private",
    "verified",
  ]),
  publicBadges: z.array(z.string()),
});
export type VehicleTrust = z.infer<typeof vehicleTrustSchema>;

export const vehicleSellerSummarySchema = z.object({
  id: z.string().min(1),
  type: sellerTypeSchema,
  displayName: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().url().optional(),
  locationLabel: z.string(),
  responseTimeMinutes: z.number().int().nonnegative().optional(),
  memberSinceYear: z.number().int().min(2000).max(2200),
  verifiedBusiness: z.boolean(),
});
export type VehicleSellerSummary = z.infer<typeof vehicleSellerSummarySchema>;

export const priceEstimateSchema = z.object({
  band: z.enum([
    "below_market",
    "within_market",
    "above_market",
    "insufficient_data",
  ]),
  low: moneySchema.optional(),
  high: moneySchema.optional(),
  sampleSize: z.number().int().nonnegative(),
  generatedAt: z.string(),
  disclaimer: z.string(),
});
export type PriceEstimate = z.infer<typeof priceEstimateSchema>;

export const vehiclePublicSchema = z.object({
  id: z.string().min(1),
  schemaVersion: autoSchemaVersionSchema,
  vertical: autoVerticalSchema,
  slug: z.string().min(1),
  vehicleType: vehicleTypeSchema,
  lifecycle: vehicleLifecycleSchema,
  marketCodes: z.array(marketCodeSchema).min(1),
  title: z.string().min(3),
  description: z.string(),
  makeId: z.string().optional(),
  makeLabel: z.string().min(1),
  modelId: z.string().optional(),
  modelLabel: z.string().min(1),
  generationLabel: z.string().optional(),
  trimLabel: z.string().optional(),
  technical: vehicleTechnicalSchema,
  history: vehicleHistorySchema,
  price: moneySchema,
  priceIncludesTax: z.boolean(),
  priceNegotiable: z.boolean().optional(),
  financingAvailable: z.boolean().optional(),
  financingMonthlyEstimate: moneySchema.optional(),
  financingDisclaimer: z.string().optional(),
  locationLabel: z.string(),
  seller: vehicleSellerSummarySchema,
  mediaUrls: z.array(z.string().url()),
  equipment: z.array(z.string()),
  dynamicAttributes: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
  trust: vehicleTrustSchema,
  priceEstimate: priceEstimateSchema.optional(),
  promotionLabels: z.array(
    z.enum(["urgent", "featured", "sponsored", "bumped"]),
  ),
  isFavorite: z.boolean(),
  publishedAt: z.string(),
  sortDate: z.string(),
  updatedAt: z.string(),
});
export type VehiclePublic = z.infer<typeof vehiclePublicSchema>;

export const vehiclePrivateSchema = vehiclePublicSchema
  .extend({
    ownerUserId: z.string().optional(),
    dealerOrganizationId: z.string().optional(),
    dealerLocationId: z.string().optional(),
    stockReference: z.string().optional(),
    vinMasked: z.string().optional(),
    vinHash: z.string().optional(),
    registrationHash: z.string().optional(),
    moderationStatus: z.enum([
      "draft",
      "pending_review",
      "approved",
      "rejected",
      "suspended",
    ]),
    moderationReason: z.string().optional(),
    planId: z.string(),
    documents: z.array(vehicleDocumentSchema),
    riskSignals: z.array(
      z.enum([
        "duplicate_vin",
        "duplicate_registration",
        "price_outlier",
        "identity_mismatch",
        "document_mismatch",
        "inconsistent_mileage",
        "duplicate_photo",
        "reused_description",
        "rapid_republication",
        "contact_abuse",
        "suspected_account_takeover",
      ]),
    ),
    createdAt: z.string(),
  })
  .superRefine((vehicle, context) => {
    if (Boolean(vehicle.ownerUserId) === Boolean(vehicle.dealerOrganizationId))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerUserId"],
        message:
          "A vehicle must belong to exactly one private seller or dealer organization.",
      });
    if (vehicle.dealerLocationId && !vehicle.dealerOrganizationId)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dealerLocationId"],
        message: "A dealer location requires a dealer organization.",
      });
  });
export type VehiclePrivate = z.infer<typeof vehiclePrivateSchema>;

export const vehicleSearchQuerySchema = z.object({
  marketCode: marketCodeSchema.default("FR"),
  query: z.string().max(120).optional(),
  vehicleTypes: z.array(vehicleTypeSchema).optional(),
  makeIds: z.array(z.string()).optional(),
  modelIds: z.array(z.string()).optional(),
  bodyTypes: z.array(z.string()).optional(),
  fuelTypes: z.array(fuelTypeSchema).optional(),
  transmissions: z.array(transmissionSchema).optional(),
  sellerTypes: z.array(sellerTypeSchema).optional(),
  minPriceMinor: z.number().int().nonnegative().optional(),
  maxPriceMinor: z.number().int().nonnegative().optional(),
  minYear: z.number().int().min(1880).max(2200).optional(),
  maxYear: z.number().int().min(1880).max(2200).optional(),
  maxMileage: z.number().int().nonnegative().optional(),
  minPowerHp: z.number().int().nonnegative().optional(),
  maxPowerHp: z.number().int().nonnegative().optional(),
  minBatteryCapacityKwh: z.number().nonnegative().optional(),
  minElectricRangeKm: z.number().int().nonnegative().optional(),
  city: z.string().optional(),
  radiusKm: z.number().int().positive().max(500).optional(),
  warrantyOnly: z.boolean().optional(),
  financingAvailable: z.boolean().optional(),
  dynamicAttributes: z.record(z.string(), z.array(z.string())).optional(),
  sort: z
    .enum([
      "relevance",
      "price_asc",
      "price_desc",
      "year_desc",
      "mileage_asc",
      "newest",
    ])
    .default("relevance"),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type VehicleSearchQuery = z.infer<typeof vehicleSearchQuerySchema>;

export const vehicleSearchResponseSchema = z.object({
  items: z.array(vehiclePublicSchema),
  total: z.number().int().nonnegative(),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});
export type VehicleSearchResponse = z.infer<typeof vehicleSearchResponseSchema>;

export const vehicleDraftSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  schemaVersion: autoSchemaVersionSchema,
  marketCode: marketCodeSchema,
  currentStep: z.number().int().min(1).max(11),
  completedSteps: z.array(z.number().int().min(1).max(11)),
  data: z.record(z.string(), z.unknown()),
  duplicateCheck: z.enum(["not_checked", "clear", "possible_match", "blocked"]),
  updatedAt: z.string(),
});
export type VehicleDraft = z.infer<typeof vehicleDraftSchema>;

export const autoLeadSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  dealerOrganizationId: z.string().optional(),
  requesterUserId: z.string().optional(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  intention: z.enum([
    "information",
    "availability",
    "callback",
    "viewing",
    "test_drive",
    "price_proposal",
    "purchase",
    "trade_in",
    "financing",
    "insurance",
    "warranty",
    "inspection",
    "delivery",
  ]),
  message: z.string().max(3000),
  status: z.enum([
    "new",
    "qualified",
    "in_progress",
    "appointment",
    "won",
    "lost",
    "spam",
  ]),
  assignedUserId: z.string().optional(),
  source: z.enum([
    "vehicle_page",
    "comparison",
    "seller_store",
    "campaign",
    "import",
  ]),
  marketingConsent: z.boolean(),
  contactConsentAt: z.string(),
  spamAssessment: z.enum(["clear", "review", "blocked"]),
  nextReminderAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AutoLead = z.infer<typeof autoLeadSchema>;

export const autoLeadActionSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  actorUserId: z.string().min(1),
  type: z.enum([
    "note",
    "status_change",
    "assignment",
    "call",
    "email",
    "appointment",
    "reminder",
  ]),
  note: z.string().max(3000).optional(),
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  occurredAt: z.string(),
});
export type AutoLeadAction = z.infer<typeof autoLeadActionSchema>;

export const autoAppointmentSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  dealerLocationId: z.string().min(1),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string().min(1),
  type: z.enum(["test_drive", "showroom", "video_call", "handover"]),
  status: z.enum([
    "requested",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ]),
});
export type AutoAppointment = z.infer<typeof autoAppointmentSchema>;

export const dealerStockTransferSchema = z.object({
  id: z.string().min(1),
  dealerOrganizationId: z.string().min(1),
  vehicleId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  requestedByUserId: z.string().min(1),
  status: z.enum(["requested", "approved", "in_transit", "completed", "cancelled"]),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
});
export type DealerStockTransfer = z.infer<typeof dealerStockTransferSchema>;

export const dealerMemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "manager", "seller", "support", "analyst"]),
  locationIds: z.array(z.string()),
  status: z.enum(["invited", "active", "suspended"]),
});
export type DealerMember = z.infer<typeof dealerMemberSchema>;

export const dealerLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  publicAddress: z.string(),
  city: z.string(),
  postalCode: z.string(),
  marketCode: marketCodeSchema,
  phone: z.string().optional(),
  isActive: z.boolean(),
});
export type DealerLocation = z.infer<typeof dealerLocationSchema>;

export const inventoryImportSchema = z.object({
  id: z.string().min(1),
  dealerOrganizationId: z.string().min(1),
  type: z.enum(["csv", "xml", "api"]),
  fileName: z.string().optional(),
  status: z.enum([
    "queued",
    "validating",
    "completed",
    "completed_with_errors",
    "failed",
  ]),
  totalRows: z.number().int().nonnegative(),
  createdCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  reportAvailable: z.boolean(),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
});
export type InventoryImport = z.infer<typeof inventoryImportSchema>;

export const partnerReferralSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  vehicleId: z.string().min(1),
  requesterUserId: z.string().optional(),
  type: z.enum([
    "financing",
    "insurance",
    "inspection",
    "warranty",
    "delivery",
    "trade_in",
  ]),
  providerId: z.string().optional(),
  status: z.enum([
    "recorded",
    "consented",
    "sent",
    "provider_received",
    "closed",
    "cancelled",
  ]),
  consentTextVersion: z.string().min(1),
  consentedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PartnerReferral = z.infer<typeof partnerReferralSchema>;

export const autoMarketConfigSchema = z.object({
  vertical: autoVerticalSchema,
  schemaVersion: autoSchemaVersionSchema,
  marketCode: marketCodeSchema,
  locale: z.string().min(1),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  isEnabled: z.boolean(),
  comparisonLimit: z.number().int().min(2).max(4),
  defaultSearchRadiusKm: z.number().int().positive(),
  leadRetentionDays: z.number().int().positive(),
  featureFlags: autoFeatureFlagsSchema,
  financingDisclaimer: z.string(),
  priceEstimateDisclaimer: z.string(),
  safetyGuidance: z.array(z.string()),
  updatedAt: z.string(),
});
export type AutoMarketConfig = z.infer<typeof autoMarketConfigSchema>;

export const autoCatalogSchema = z.object({
  config: autoMarketConfigSchema,
  vehicleTypes: z.array(vehicleTypeConfigSchema),
  attributes: z.array(vehicleAttributeDefinitionSchema),
  vehicleCatalog: z.array(vehicleCatalogEntrySchema),
  plans: z.array(autoPlanSchema),
  addOns: z.array(autoAddOnSchema),
});
export type AutoCatalog = z.infer<typeof autoCatalogSchema>;

export const dealerWorkspaceSchema = z.object({
  organization: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    logoUrl: z.string().url().optional(),
    verificationStatus: z.enum([
      "not_submitted",
      "pending",
      "verified",
      "rejected",
    ]),
    planId: z.string().min(1),
  }),
  locations: z.array(dealerLocationSchema),
  members: z.array(dealerMemberSchema),
  vehicles: z.array(vehiclePrivateSchema),
  leads: z.array(autoLeadSchema),
  leadActions: z.array(autoLeadActionSchema),
  appointments: z.array(autoAppointmentSchema),
  stockTransfers: z.array(dealerStockTransferSchema),
  imports: z.array(inventoryImportSchema),
  usage: z.object({
    activeVehicles: z.number().int().nonnegative(),
    remainingVehicleSlots: z.number().int().nonnegative(),
    remainingPromotionCredits: z.number().int().nonnegative(),
    medianResponseMinutes: z.number().int().nonnegative(),
  }),
  analytics: z.object({
    views30d: z.number().int().nonnegative(),
    leads30d: z.number().int().nonnegative(),
    appointments30d: z.number().int().nonnegative(),
    sold30d: z.number().int().nonnegative(),
    conversionRatePercent: z.number().min(0).max(100),
  }),
  vehicleMetrics: z.array(
    z.object({
      vehicleId: z.string().min(1),
      views30d: z.number().int().nonnegative(),
      leads30d: z.number().int().nonnegative(),
      appointments30d: z.number().int().nonnegative(),
    }),
  ),
});
export type DealerWorkspace = z.infer<typeof dealerWorkspaceSchema>;

export const autoAdminOverviewSchema = z.object({
  catalog: autoCatalogSchema,
  metrics: z.object({
    activeVehicles: z.number().int().nonnegative(),
    pendingModeration: z.number().int().nonnegative(),
    dealers: z.number().int().nonnegative(),
    newLeads30d: z.number().int().nonnegative(),
    duplicateSignals30d: z.number().int().nonnegative(),
    partnerReferrals30d: z.number().int().nonnegative(),
  }),
  recentImports: z.array(inventoryImportSchema),
  flaggedVehicles: z.array(vehiclePrivateSchema),
});
export type AutoAdminOverview = z.infer<typeof autoAdminOverviewSchema>;
