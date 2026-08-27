import { z } from "zod";
import { marketCodeSchema } from "./primitives";

const dateTimeSchema = z.string().datetime({ offset: true });
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const localeSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/);
const timezoneSchema = z.string().trim().min(1).max(80);

export const PROSPECTING_FIELD_CONSTRAINTS = {
  discoveryQueryMaxLength: 1_000,
} as const;

export const prospectingContextSchema = z.enum([
  "INTERNAL_SHONGRE",
  "SUBSCRIBER",
  "AGGREGATED_OPPORTUNITY",
]);

export const leadSourceCategorySchema = z.enum([
  "USER_PROVIDED",
  "FIRST_PARTY_AUTHORIZED",
  "OFFICIAL_REGISTRY",
  "OPEN_DATA",
  "PUBLIC_PROFESSIONAL_WEB",
  "LICENSED_PROVIDER",
  "PARTNER",
  "INBOUND_ATTRIBUTION",
  "AGGREGATED_MARKET_SIGNAL",
]);

export const leadSourceOperationSchema = z.enum([
  "SEARCH",
  "ENRICHMENT",
  "IMPORT",
  "REFRESH",
  "DELETE",
]);

export const leadSourceLifecycleSchema = z.enum([
  "ACTIVE",
  "DEGRADED",
  "INACTIVE_REVIEW_REQUIRED",
  "DISCONNECTED",
]);

export const sourceRestrictionSchema = z.object({
  permittedContexts: z.array(prospectingContextSchema).min(1),
  permittedUses: z.array(z.string().trim().min(1).max(240)).min(1),
  prohibitedUses: z.array(z.string().trim().min(1).max(240)).default([]),
  mayStoreProfessionalContacts: z.boolean(),
  requiresAttribution: z.boolean(),
  attributionText: z.string().trim().min(1).max(500).optional(),
  termsReference: z.string().url().optional(),
  licenseReference: z.string().url().optional(),
  retentionDays: z.number().int().positive().optional(),
  refreshAfterDays: z.number().int().positive().optional(),
  deletionMode: z.enum(["DELETE", "ANONYMIZE", "PROVIDER_MANAGED"]),
  rateLimitPerMinute: z.number().int().positive().optional(),
  requiresLegalApproval: z.boolean(),
  requiresCommercialApproval: z.boolean(),
});

export const leadSourceDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_.-]+$/),
  providerId: z.string().regex(/^[a-z0-9][a-z0-9_.-]+$/),
  name: z.string().trim().min(1).max(160),
  category: leadSourceCategorySchema,
  description: z.string().trim().min(1).max(1_000),
  supportedMarketCodes: z.array(marketCodeSchema).min(1),
  operations: z.array(leadSourceOperationSchema).min(1),
  restrictions: sourceRestrictionSchema,
  lifecycle: leadSourceLifecycleSchema,
  healthMessage: z.string().trim().min(1).max(500),
  dataFreshnessLabel: z.string().trim().min(1).max(120),
  lastHealthCheckAt: dateTimeSchema.optional(),
});

export const prospectingProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  context: prospectingContextSchema,
  marketCodes: z.array(marketCodeSchema).min(1).max(20),
  locale: localeSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: timezoneSchema,
  geographicAreas: z.array(z.string().trim().min(1).max(160)).max(50),
  radiusKm: z.number().int().min(1).max(1_000).optional(),
  industries: z.array(z.string().trim().min(1).max(160)).max(100),
  taxonomySlugs: z.array(z.string().trim().min(1).max(160)).max(100),
  companyTypes: z.array(z.string().trim().min(1).max(120)).max(50),
  estimatedSizeMin: z.number().int().nonnegative().optional(),
  estimatedSizeMax: z.number().int().positive().optional(),
  businessMaturity: z.array(z.string().trim().min(1).max(120)).max(20),
  onlinePresence: z.array(z.string().trim().min(1).max(120)).max(20),
  targetRoles: z.array(z.string().trim().min(1).max(160)).max(50),
  fitRules: z.array(z.string().trim().min(1).max(500)).max(100),
  exclusionRules: z.array(z.string().trim().min(1).max(500)).max(100),
  requiredSignals: z.array(z.string().trim().min(1).max(160)).max(100),
  optionalSignals: z.array(z.string().trim().min(1).max(160)).max(100),
  isDefault: z.boolean(),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const prospectingProfileInputSchema = prospectingProfileSchema
  .omit({ id: true, version: true, createdAt: true, updatedAt: true })
  .superRefine((value, context) => {
    if (
      value.estimatedSizeMin !== undefined &&
      value.estimatedSizeMax !== undefined &&
      value.estimatedSizeMin > value.estimatedSizeMax
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedSizeMax"],
        message:
          "La taille maximale doit être supérieure à la taille minimale.",
      });
    }
  });

export const prospectEvidenceSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().min(1),
  sourceCategory: leadSourceCategorySchema,
  title: z.string().trim().min(1).max(255),
  url: z.string().url().optional(),
  excerpt: z.string().trim().min(1).max(1_000).optional(),
  observedAt: dateTimeSchema,
  freshness: z.enum(["CURRENT", "AGING", "STALE", "UNKNOWN"]),
  attributionRequired: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const prospectScoreFactorSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]+$/),
  label: z.string().trim().min(1).max(255),
  impact: z.number().int().min(-100).max(100),
  evidenceIds: z.array(z.string().uuid()).default([]),
});

export const prospectScoreSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  fitScore: z.number().int().min(0).max(100),
  opportunityScore: z.number().int().min(0).max(100),
  dataConfidence: z.number().int().min(0).max(100),
  positiveFactors: z.array(prospectScoreFactorSchema),
  negativeFactors: z.array(prospectScoreFactorSchema),
  missingInformation: z.array(z.string().trim().min(1).max(255)),
  evidenceIds: z.array(z.string().uuid()),
  ruleVersion: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160).optional(),
  promptVersion: z.string().trim().min(1).max(80).optional(),
  confidence: z.number().min(0).max(1),
  evaluatedAt: dateTimeSchema,
  recommendedNextAction: z.string().trim().min(1).max(500),
});

export const prospectCompanySchema = z.object({
  id: z.string().uuid(),
  crmAccountId: z.string().uuid().optional(),
  canonicalName: z.string().trim().min(1).max(255),
  legalName: z.string().trim().min(1).max(255).optional(),
  tradingName: z.string().trim().min(1).max(255).optional(),
  officialIdentifier: z
    .object({
      marketCode: marketCodeSchema,
      scheme: z.string().trim().min(1).max(80),
      value: z.string().trim().min(1).max(160),
    })
    .optional(),
  domain: z.string().trim().min(1).max(255).optional(),
  website: z.string().url().optional(),
  description: z.string().trim().min(1).max(5_000).optional(),
  industry: z.string().trim().min(1).max(160).optional(),
  companyType: z.string().trim().min(1).max(120).optional(),
  estimatedSize: z.string().trim().min(1).max(120).optional(),
  marketCodes: z.array(marketCodeSchema).min(1),
  countryCode: countryCodeSchema,
  region: z.string().trim().min(1).max(160).optional(),
  city: z.string().trim().min(1).max(160).optional(),
  postalCode: z.string().trim().min(1).max(32).optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  discoveredAt: dateTimeSchema,
  refreshedAt: dateTimeSchema,
  reviewState: z.enum([
    "UNREVIEWED",
    "APPROVED",
    "DISMISSED",
    "DUPLICATE_REVIEW",
    "SUPPRESSED",
  ]),
  duplicateOfCrmAccountId: z.string().uuid().optional(),
});

export const prospectCandidateSchema = z.object({
  company: prospectCompanySchema,
  score: prospectScoreSchema,
  evidence: z.array(prospectEvidenceSchema),
  status: z.enum(["DISCOVERED", "IMPORTED", "DISMISSED"]),
  humanReviewRequired: z.literal(true),
});

export const prospectDiscoveryFiltersSchema = z.object({
  profileId: z.string().uuid().optional(),
  query: z
    .string()
    .trim()
    .min(1)
    .max(PROSPECTING_FIELD_CONSTRAINTS.discoveryQueryMaxLength)
    .optional(),
  marketCode: marketCodeSchema,
  countryCode: countryCodeSchema,
  locale: localeSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: timezoneSchema,
  industries: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  taxonomySlugs: z
    .array(z.string().trim().min(1).max(160))
    .max(100)
    .default([]),
  companyTypes: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  geographicArea: z.string().trim().min(1).max(160).optional(),
  radiusKm: z.number().int().min(1).max(1_000).optional(),
  requireWebsite: z.boolean().optional(),
  sourceIds: z.array(z.string().min(1)).max(50).default([]),
  minimumFitScore: z.number().int().min(0).max(100).optional(),
  freshness: z
    .array(z.enum(["CURRENT", "AGING", "STALE", "UNKNOWN"]))
    .default([]),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).optional(),
});

export const prospectDiscoveryResultSchema = z.object({
  items: z.array(prospectCandidateSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().min(1).optional(),
  }),
  appliedFilters: prospectDiscoveryFiltersSchema,
  sourceIds: z.array(z.string().min(1)),
  measuredTotal: z.number().int().nonnegative(),
  generatedAt: dateTimeSchema,
});

export const prospectDiscoveryRequestSchema = z.object({
  context: prospectingContextSchema.default("SUBSCRIBER"),
  filters: prospectDiscoveryFiltersSchema,
  idempotencyKey: z.string().uuid(),
});

export const prospectOpportunityBriefSchema = z.object({
  companyId: z.string().uuid(),
  headline: z.string().trim().min(1).max(255),
  summary: z.string().trim().min(1).max(2_000),
  knownFacts: z.array(
    z.object({
      statement: z.string().trim().min(1).max(500),
      evidenceIds: z.array(z.string().uuid()).min(1),
    }),
  ),
  estimates: z.array(z.string().trim().min(1).max(500)),
  suggestions: z.array(z.string().trim().min(1).max(500)),
  missingInformation: z.array(z.string().trim().min(1).max(255)),
  score: prospectScoreSchema,
  evidence: z.array(prospectEvidenceSchema),
  model: z.string().trim().min(1).max(160),
  promptVersion: z.string().trim().min(1).max(80),
  generatedAt: dateTimeSchema,
  humanReviewRequired: z.literal(true),
});

export const prospectingEntitlementsSchema = z.object({
  enabled: z.boolean(),
  maxProspectRecords: z.number().int().nonnegative(),
  monthlyDiscoveries: z.number().int().nonnegative(),
  monthlyEnrichments: z.number().int().nonnegative(),
  monthlyAiCredits: z.number().int().nonnegative(),
  seats: z.number().int().nonnegative(),
  savedLists: z.number().int().nonnegative(),
  activeCampaigns: z.number().int().nonnegative(),
  monthlyOutreach: z.number().int().nonnegative(),
  sourceIntegrations: z.number().int().nonnegative(),
  advancedFilters: z.boolean(),
  exports: z.boolean(),
  apiAccess: z.boolean(),
  webhooks: z.boolean(),
  analyticsLevel: z.enum(["NONE", "BASIC", "ADVANCED", "ENTERPRISE"]),
  retentionDays: z.number().int().nonnegative(),
  auditRetentionDays: z.number().int().nonnegative(),
  customAiTemplates: z.boolean(),
  shongreConversionTools: z.boolean(),
  internalFirstPartyAccess: z.boolean(),
});

export const prospectingUsageSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  accessMode: z.enum(["STANDALONE", "SHONGRE_CONNECTED", "INTERNAL_SHONGRE"]),
  planName: z.string().trim().min(1).max(160),
  discoveriesUsed: z.number().int().nonnegative(),
  enrichmentsUsed: z.number().int().nonnegative(),
  aiCreditsUsed: z.number().int().nonnegative(),
  prospectRecords: z.number().int().nonnegative(),
  outreachUsed: z.number().int().nonnegative(),
  entitlements: prospectingEntitlementsSchema,
  status: z.enum(["AVAILABLE", "NEAR_LIMIT", "EXHAUSTED", "EXPIRED"]),
});

export const prospectImportRequestSchema = z.object({
  companyId: z.string().uuid(),
  expectedEvidenceIds: z.array(z.string().uuid()).min(1),
  reviewDecision: z.literal("APPROVED"),
  targetListId: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid(),
});

export const prospectImportResultSchema = z.object({
  companyId: z.string().uuid(),
  crmAccountId: z.string().uuid(),
  duplicateDetected: z.boolean(),
  duplicateCrmAccountId: z.string().uuid().optional(),
  importedAt: dateTimeSchema,
  provenancePreserved: z.literal(true),
});

export type ProspectingContext = z.infer<typeof prospectingContextSchema>;
export type LeadSourceCategory = z.infer<typeof leadSourceCategorySchema>;
export type LeadSourceDefinition = z.infer<typeof leadSourceDefinitionSchema>;
export type ProspectingProfile = z.infer<typeof prospectingProfileSchema>;
export type ProspectingProfileInput = z.infer<
  typeof prospectingProfileInputSchema
>;
export type ProspectEvidence = z.infer<typeof prospectEvidenceSchema>;
export type ProspectScore = z.infer<typeof prospectScoreSchema>;
export type ProspectCompany = z.infer<typeof prospectCompanySchema>;
export type ProspectCandidate = z.infer<typeof prospectCandidateSchema>;
export type ProspectDiscoveryFilters = z.infer<
  typeof prospectDiscoveryFiltersSchema
>;
export type ProspectDiscoveryResult = z.infer<
  typeof prospectDiscoveryResultSchema
>;
export type ProspectDiscoveryRequest = z.infer<
  typeof prospectDiscoveryRequestSchema
>;
export type ProspectOpportunityBrief = z.infer<
  typeof prospectOpportunityBriefSchema
>;
export type ProspectingEntitlements = z.infer<
  typeof prospectingEntitlementsSchema
>;
export type ProspectingUsage = z.infer<typeof prospectingUsageSchema>;
export type ProspectImportRequest = z.infer<typeof prospectImportRequestSchema>;
export type ProspectImportResult = z.infer<typeof prospectImportResultSchema>;
