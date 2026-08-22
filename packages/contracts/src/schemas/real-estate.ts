import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import {
  verticalActivationSchema,
  verticalAddOnSchema,
  verticalOfferSchema,
} from "./vertical";

export const REAL_ESTATE_SCHEMA_VERSION = 1 as const;
export const realEstateVerticalSchema = z.literal("real_estate");

export const propertyTypeSchema = z.enum([
  "apartment",
  "house",
  "land",
  "parking_garage",
  "commercial",
  "office",
  "building",
  "new_development",
  "holiday_rental",
  "room_shared",
  "other",
]);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const propertyTransactionSchema = z.enum([
  "sale",
  "long_term_rental",
  "seasonal_rental",
  "shared_accommodation",
  "life_annuity",
  "other",
]);
export type PropertyTransaction = z.infer<typeof propertyTransactionSchema>;

export const propertySellerTypeSchema = z.enum([
  "owner",
  "agency",
  "developer",
  "property_manager",
]);
export const propertyLifecycleSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "reserved",
  "sold",
  "expired",
  "suspended",
  "rejected",
  "removed",
  "archived",
]);
export const energyClassSchema = z.enum(["A", "B", "C", "D", "E", "F", "G"]);
export type EnergyClass = z.infer<typeof energyClassSchema>;

export const realEstateFeatureFlagsSchema = z.object({
  verticalEnabled: z.boolean(),
  mapSearchEnabled: z.boolean(),
  savedSearchesEnabled: z.boolean(),
  recentlyViewedEnabled: z.boolean(),
  comparablesEnabled: z.boolean(),
  structuredLeadsEnabled: z.boolean(),
  appointmentsEnabled: z.boolean(),
  paidOffersEnabled: z.boolean(),
  professionalImportsEnabled: z.boolean(),
  professionalApiSyncEnabled: z.boolean(),
  privateDocumentsEnabled: z.boolean(),
});

export const realEstateMarketConfigSchema = z.object({
  marketCode: marketCodeSchema,
  schemaVersion: z.number().int().positive(),
  locale: z.string().min(2),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  isEnabled: z.boolean(),
  defaultSearchRadiusKm: z.number().int().positive(),
  leadRetentionDays: z.number().int().positive(),
  draftRetentionDays: z.number().int().positive(),
  approximateLocationRadiusM: z.number().int().positive(),
  featureFlags: realEstateFeatureFlagsSchema,
  regulatoryContentVersion: z.string().min(1),
});
export type RealEstateMarketConfig = z.infer<
  typeof realEstateMarketConfigSchema
>;

export const propertyTypeConfigSchema = z.object({
  type: propertyTypeSchema,
  marketCode: marketCodeSchema,
  slug: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  iconName: z.string(),
  transactionTypes: z.array(propertyTransactionSchema).min(1),
  requiredFieldIds: z.array(z.string()),
  filterFieldIds: z.array(z.string()),
  schemaVersion: z.number().int().positive(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export type PropertyTypeConfig = z.infer<typeof propertyTypeConfigSchema>;

export const propertyAttributeDefinitionSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  propertyTypes: z.array(propertyTypeSchema).min(1),
  transactionTypes: z.array(propertyTransactionSchema).min(1),
  label: z.string().min(1),
  helpText: z.string().optional(),
  fieldType: z.enum([
    "text",
    "number",
    "boolean",
    "single_select",
    "multi_select",
    "date",
    "money",
    "document_status",
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
  privacy: z.enum(["public", "seller_only", "reviewer_only"]),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  isActive: z.boolean(),
  schemaVersion: z.number().int().positive(),
  sortOrder: z.number().int(),
});
export type PropertyAttributeDefinition = z.infer<
  typeof propertyAttributeDefinitionSchema
>;

export const propertyFieldRuleSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  propertyType: propertyTypeSchema.optional(),
  transactionType: propertyTransactionSchema.optional(),
  fieldId: z.string().min(1),
  requirement: z.enum(["required", "recommended", "optional", "hidden"]),
  condition: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().positive(),
  isActive: z.boolean(),
});
export type PropertyFieldRule = z.infer<typeof propertyFieldRuleSchema>;

export const propertyAddressSchema = z.object({
  city: z.string().min(1),
  postalCode: z.string().min(1),
  administrativeArea: z.string().optional(),
  countryCode: marketCodeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precision: z.enum(["exact", "street", "district", "city"]),
  publicLabel: z.string().min(1),
  exactAddress: z.string().optional(),
});

export const propertyFinancialsSchema = z.object({
  price: moneySchema,
  charges: moneySchema.optional(),
  agencyFees: moneySchema.optional(),
  deposit: moneySchema.optional(),
  pricePerSquareMeter: moneySchema.optional(),
  period: z.enum(["total", "month", "week", "night"]),
  feesPaidBy: z.enum([
    "seller",
    "buyer",
    "owner",
    "tenant",
    "shared",
    "not_applicable",
  ]),
  isNegotiable: z.boolean(),
});

export const propertyCharacteristicsSchema = z.object({
  livingAreaSquareMeters: z.number().positive(),
  landAreaSquareMeters: z.number().nonnegative().optional(),
  rooms: z.number().int().nonnegative(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  floor: z.number().int().optional(),
  floorCount: z.number().int().nonnegative().optional(),
  hasLift: z.boolean().optional(),
  isFurnished: z.boolean().optional(),
  constructionYear: z.number().int().min(1000).max(2200).optional(),
  condition: z.enum([
    "new",
    "excellent",
    "good",
    "renovation_needed",
    "to_renovate",
  ]),
  heatingType: z.string().optional(),
  energyType: z.string().optional(),
  amenities: z.array(z.string()),
  accessibilityFeatures: z.array(z.string()),
  availabilityDate: z.string().optional(),
});

export const propertyEnergySchema = z.object({
  dpeClass: energyClassSchema.optional(),
  gesClass: energyClassSchema.optional(),
  diagnosticDate: z.string().optional(),
  consumptionKwhPerSquareMeterYear: z.number().nonnegative().optional(),
  emissionsKgCo2PerSquareMeterYear: z.number().nonnegative().optional(),
  warningCode: z.string().optional(),
  warningText: z.string().optional(),
});

export const propertyRegulatorySchema = z.object({
  coOwnershipApplicable: z.boolean(),
  coOwnershipLots: z.number().int().positive().optional(),
  annualCoOwnershipCharges: moneySchema.optional(),
  coOwnershipProcedureStatus: z.enum([
    "none",
    "in_progress",
    "unknown",
    "not_applicable",
  ]),
  riskInformationUrl: z.string().url().optional(),
  riskInformationStatus: z.enum(["available", "pending", "not_applicable"]),
  professionalRegistrationLabel: z.string().optional(),
  ownershipDeclared: z.boolean(),
  legalNotices: z.array(z.string()),
});

export const propertyDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "dpe",
    "ges",
    "risk_report",
    "co_ownership",
    "ownership_evidence",
    "floor_plan",
    "other",
  ]),
  status: z.enum([
    "missing",
    "uploaded",
    "under_review",
    "verified",
    "rejected",
    "expired",
  ]),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  privateStorageKey: z.string().optional(),
  reviewLabel: z.string().optional(),
});
export type PropertyDocument = z.infer<typeof propertyDocumentSchema>;

export const propertyMediaSchema = z.object({
  photos: z.array(z.string().url()),
  floorPlans: z.array(z.string().url()),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
});

export const propertySellerSchema = z.object({
  type: propertySellerTypeSchema,
  id: z.string().min(1),
  displayName: z.string().min(1),
  slug: z.string().optional(),
  logoUrl: z.string().url().optional(),
  publicPhone: z.string().optional(),
  verificationLabels: z.array(z.string()),
  responseTimeLabel: z.string().optional(),
  professionalIdentity: z.string().optional(),
});

export const propertyPromotionSchema = z.object({
  urgent: z.boolean(),
  featured: z.boolean(),
  sponsored: z.boolean(),
  bumpedAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export const propertyPrivateSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  slug: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  marketCodes: z.array(marketCodeSchema).min(1),
  propertyType: propertyTypeSchema,
  transactionType: propertyTransactionSchema,
  lifecycle: propertyLifecycleSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  financials: propertyFinancialsSchema,
  characteristics: propertyCharacteristicsSchema,
  energy: propertyEnergySchema,
  regulatory: propertyRegulatorySchema,
  address: propertyAddressSchema,
  media: propertyMediaSchema,
  seller: propertySellerSchema,
  promotion: propertyPromotionSchema,
  customAttributes: z.record(z.string(), z.unknown()),
  moderationStatus: z.enum(["draft", "pending", "approved", "rejected"]),
  moderationReason: z.string().optional(),
  documents: z.array(propertyDocumentSchema),
  createdByUserId: z.string().min(1),
  ownerUserId: z.string().optional(),
  organizationId: z.string().optional(),
  branchId: z.string().optional(),
  planId: z.string().optional(),
  riskSignals: z.array(z.string()),
  createdAt: z.string(),
  publishedAt: z.string().optional(),
  sortDate: z.string(),
});
export type PropertyPrivate = z.infer<typeof propertyPrivateSchema>;

export const propertyPublicSchema = propertyPrivateSchema
  .omit({
    moderationStatus: true,
    moderationReason: true,
    documents: true,
    createdByUserId: true,
    ownerUserId: true,
    organizationId: true,
    branchId: true,
    planId: true,
    riskSignals: true,
    createdAt: true,
  })
  .extend({
    address: propertyAddressSchema.omit({ exactAddress: true }),
    isFavorite: z.boolean().default(false),
    recentlyViewedAt: z.string().optional(),
  });
export type PropertyPublic = z.infer<typeof propertyPublicSchema>;

export const propertySearchQuerySchema = z.object({
  marketCode: marketCodeSchema,
  query: z.string().optional(),
  transactionTypes: z.array(propertyTransactionSchema).optional(),
  propertyTypes: z.array(propertyTypeSchema).optional(),
  city: z.string().optional(),
  center: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  radiusKm: z.number().positive().optional(),
  boundingBox: z
    .object({
      north: z.number(),
      east: z.number(),
      south: z.number(),
      west: z.number(),
    })
    .optional(),
  minPriceMinor: z.number().int().nonnegative().optional(),
  maxPriceMinor: z.number().int().nonnegative().optional(),
  minSurfaceSquareMeters: z.number().nonnegative().optional(),
  maxSurfaceSquareMeters: z.number().nonnegative().optional(),
  minPricePerSquareMeterMinor: z.number().int().nonnegative().optional(),
  maxPricePerSquareMeterMinor: z.number().int().nonnegative().optional(),
  minRooms: z.number().int().nonnegative().optional(),
  minBedrooms: z.number().int().nonnegative().optional(),
  furnished: z.boolean().optional(),
  dpeClasses: z.array(energyClassSchema).optional(),
  amenities: z.array(z.string()).optional(),
  sellerTypes: z.array(propertySellerTypeSchema).optional(),
  sort: z.enum([
    "relevance",
    "newest",
    "price_asc",
    "price_desc",
    "surface_desc",
    "promoted",
  ]),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20),
});
export type PropertySearchQuery = z.infer<typeof propertySearchQuerySchema>;

export const propertySearchResultSchema = z.object({
  items: z.array(propertyPublicSchema),
  total: z.number().int().nonnegative(),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});
export type PropertySearchResult = z.infer<typeof propertySearchResultSchema>;

export const propertyDraftSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  schemaVersion: z.number().int().positive(),
  marketCode: marketCodeSchema,
  currentStep: z.number().int().min(1).max(10),
  completedSteps: z.array(z.number().int().min(1).max(10)),
  data: z.record(z.string(), z.unknown()),
  validationIssues: z.array(
    z.object({
      fieldId: z.string(),
      message: z.string(),
      severity: z.enum(["error", "warning"]),
    }),
  ),
  updatedAt: z.string(),
});
export type PropertyDraft = z.infer<typeof propertyDraftSchema>;

export const propertyLeadSchema = z.object({
  id: z.string().min(1),
  propertyId: z.string().min(1),
  organizationId: z.string().optional(),
  requesterUserId: z.string().optional(),
  type: z.enum(["information", "visit", "call", "financing"]),
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "visit_planned",
    "won",
    "lost",
    "spam",
  ]),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email(),
  requesterPhone: z.string().optional(),
  message: z.string().min(1),
  desiredMoveDate: z.string().optional(),
  preferredContactChannel: z.enum(["message", "email", "phone"]),
  consentGiven: z.boolean(),
  qualificationAnswers: z.record(z.string(), z.string()),
  assignedUserId: z.string().optional(),
  nextReminderAt: z.string().optional(),
  firstRespondedAt: z.string().optional(),
  duplicateOfLeadId: z.string().optional(),
  contactDetailsReleased: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PropertyLead = z.infer<typeof propertyLeadSchema>;

export const propertyLeadNoteSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  authorUserId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  createdAt: z.string(),
});
export type PropertyLeadNote = z.infer<typeof propertyLeadNoteSchema>;

export const propertyLeadExportSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.literal("text/csv;charset=utf-8"),
  content: z.string(),
});
export type PropertyLeadExport = z.infer<typeof propertyLeadExportSchema>;

export const propertyAppointmentSchema = z.object({
  id: z.string().min(1),
  propertyId: z.string().min(1),
  leadId: z.string().min(1),
  organizationId: z.string().optional(),
  assignedUserId: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum([
    "requested",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ]),
  privateNotes: z.string().optional(),
});
export type PropertyAppointment = z.infer<typeof propertyAppointmentSchema>;

export const propertyImportSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.enum(["csv", "xml", "api"]),
  status: z.enum([
    "queued",
    "validating",
    "processing",
    "completed",
    "completed_with_errors",
    "failed",
  ]),
  fileName: z.string().optional(),
  importedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  errorReportKey: z.string().optional(),
  idempotencyKey: z.string().min(8),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type PropertyImport = z.infer<typeof propertyImportSchema>;

export const agencyInvoiceSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  offerId: z.string().optional(),
  total: moneySchema,
  status: z.enum(["paid", "refunded"]),
  issuedAt: z.string(),
});
export type AgencyInvoice = z.infer<typeof agencyInvoiceSchema>;

export const agencyWorkspaceSchema = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    planId: z.string(),
    verificationStatus: z.enum([
      "not_submitted",
      "pending",
      "verified",
      "rejected",
    ]),
    branchCount: z.number().int().nonnegative(),
    memberCount: z.number().int().nonnegative(),
    profile: z.object({
      description: z.string(),
      website: z.string().url().optional(),
      publicEmail: z.string().email().optional(),
      publicPhone: z.string().optional(),
    }),
  }),
  properties: z.array(propertyPrivateSchema),
  drafts: z.array(propertyDraftSchema),
  leads: z.array(propertyLeadSchema),
  leadNotes: z.array(propertyLeadNoteSchema),
  appointments: z.array(propertyAppointmentSchema),
  imports: z.array(propertyImportSchema),
  metrics: z.object({
    activeProperties: z.number().int().nonnegative(),
    newLeads: z.number().int().nonnegative(),
    upcomingVisits: z.number().int().nonnegative(),
    responseRatePercent: z.number().min(0).max(100),
    medianResponseMinutes: z.number().nonnegative(),
    views: z.number().int().nonnegative(),
    searchToContactRatePercent: z.number().min(0).max(100),
  }),
  visibilityCredits: z.object({
    available: z.number().int().nonnegative(),
    included: z.number().int().nonnegative(),
  }),
  subscription: z.object({
    offerId: z.string(),
    offerName: z.string(),
    status: z.enum(["trialing", "active", "past_due", "cancelled", "expired"]),
    renewsAt: z.string().optional(),
    trialEndsAt: z.string().optional(),
  }),
  invoices: z.array(agencyInvoiceSchema),
  integrationSettings: z.object({
    csvImportEnabled: z.boolean(),
    xmlImportEnabled: z.boolean(),
    automaticSyncEnabled: z.boolean(),
    apiAccessEnabled: z.boolean(),
    lastSuccessfulSyncAt: z.string().optional(),
  }),
  members: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      branchIds: z.array(z.string()),
    }),
  ),
  branches: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      city: z.string(),
      activePropertyCount: z.number().int().nonnegative(),
    }),
  ),
});
export type AgencyWorkspace = z.infer<typeof agencyWorkspaceSchema>;

export const realEstateCatalogSchema = z.object({
  activation: verticalActivationSchema.extend({
    verticalType: realEstateVerticalSchema,
  }),
  config: realEstateMarketConfigSchema,
  propertyTypes: z.array(propertyTypeConfigSchema),
  attributes: z.array(propertyAttributeDefinitionSchema),
  fieldRules: z.array(propertyFieldRuleSchema),
  offers: z.array(
    verticalOfferSchema.extend({ verticalType: realEstateVerticalSchema }),
  ),
  addOns: z.array(
    verticalAddOnSchema.extend({ verticalType: realEstateVerticalSchema }),
  ),
});
export type RealEstateCatalog = z.infer<typeof realEstateCatalogSchema>;

export const realEstateAdminOverviewSchema = z.object({
  catalog: realEstateCatalogSchema,
  metrics: z.object({
    activeProperties: z.number().int().nonnegative(),
    pendingModeration: z.number().int().nonnegative(),
    verifiedProfessionals: z.number().int().nonnegative(),
    importErrors: z.number().int().nonnegative(),
    leads: z.number().int().nonnegative(),
    visits: z.number().int().nonnegative(),
    leadsPerListing: z.number().nonnegative(),
    medianResponseMinutes: z.number().nonnegative(),
    searchToContactRatePercent: z.number().min(0).max(100),
    agencyRetentionPercent: z.number().min(0).max(100),
    freeToPaidConversionPercent: z.number().min(0).max(100),
    subscriptionMrr: moneySchema,
    addOnRevenue: moneySchema,
    costPerLead: moneySchema,
    revenuePerLead: moneySchema,
  }),
  moderationQueue: z.array(
    z.object({
      id: z.string(),
      propertyId: z.string(),
      reasonLabel: z.string(),
      createdAt: z.string(),
    }),
  ),
  syncErrors: z.array(
    z.object({
      id: z.string(),
      organizationName: z.string(),
      message: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type RealEstateAdminOverview = z.infer<
  typeof realEstateAdminOverviewSchema
>;
