import { z } from "zod";

const dateTimeSchema = z.string().datetime({ offset: true });
const httpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", "Une URL HTTPS est requise.");
const tenantResourceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const marketingProfileStatusSchema = z.enum([
  "PENDING",
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "SUPPRESSED",
  "BOUNCED",
  "COMPLAINED",
  "INVALID",
]);

export const marketingProfileSourceSchema = z.enum([
  "HOMEPAGE",
  "FOOTER",
  "REGISTRATION",
  "ACCOUNT",
  "PRO_WORKSPACE",
  "NEWSLETTER_PAGE",
  "CRM",
  "IMPORT",
  "FORM",
  "API",
  "AUTOMATION",
]);

export const marketingCampaignStatusSchema = z.enum([
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
]);

export const marketingSuppressionReasonSchema = z.enum([
  "UNSUBSCRIBED",
  "HARD_BOUNCE",
  "COMPLAINT",
  "INVALID",
  "MANUAL",
  "LEGAL",
  "PROVIDER_SUPPRESSION",
]);

export const communicationPurposeSchema = z.enum([
  "MARKETING",
  "TRANSACTIONAL",
  "CRM_CORRESPONDENCE",
  "SECURITY",
  "SYSTEM",
]);

export const marketingDeliveryEventTypeSchema = z.enum([
  "QUEUED",
  "ACCEPTED",
  "DELIVERED",
  "DEFERRED",
  "BOUNCED_SOFT",
  "BOUNCED_HARD",
  "COMPLAINT",
  "OPENED",
  "CLICKED",
  "UNSUBSCRIBED",
]);

export const marketingProfileSchema = tenantResourceSchema.extend({
  accountUserId: z.string().uuid().optional(),
  crmContactId: z.string().uuid().optional(),
  email: z.string().email(),
  normalizedEmail: z.string().email(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  status: marketingProfileStatusSchema,
  locale: z.string().trim().min(2).max(16),
  timezone: z.string().trim().min(1).max(80),
  country: z.string().regex(/^[A-Z]{2}$/),
  source: marketingProfileSourceSchema,
  sourceDetail: z.string().trim().max(500).optional(),
  topics: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  customValues: z.record(z.string(), z.unknown()).default({}),
  subscribedAt: dateTimeSchema.optional(),
  confirmedAt: dateTimeSchema.optional(),
  unsubscribedAt: dateTimeSchema.optional(),
  lastEngagedAt: dateTimeSchema.optional(),
  version: z.number().int().positive(),
});

export const marketingProfileInputSchema = marketingProfileSchema
  .pick({
    accountUserId: true,
    crmContactId: true,
    email: true,
    firstName: true,
    lastName: true,
    locale: true,
    timezone: true,
    country: true,
    source: true,
    sourceDetail: true,
    topics: true,
    customValues: true,
  })
  .partial()
  .extend({ email: z.string().trim().email() });

export const marketingListSchema = tenantResourceSchema.extend({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  memberCount: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});

export const marketingListInputSchema = marketingListSchema
  .pick({ name: true, description: true })
  .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE") });

export const marketingSegmentOperatorSchema = z.enum([
  "EQUALS",
  "NOT_EQUALS",
  "CONTAINS",
  "IN",
  "NOT_IN",
  "EXISTS",
  "GREATER_THAN",
  "LESS_THAN",
  "BEFORE",
  "AFTER",
]);

export const marketingSegmentConditionSchema = z.object({
  field: z.string().regex(/^[a-z][a-z0-9_.]{1,119}$/),
  operator: marketingSegmentOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
  ]).optional(),
});

export type MarketingSegmentGroup = {
  combinator: "AND" | "OR";
  conditions: z.infer<typeof marketingSegmentConditionSchema>[];
  groups?: MarketingSegmentGroup[];
};

export const marketingSegmentGroupSchema: z.ZodType<MarketingSegmentGroup> = z.lazy(
  () =>
    z.object({
      combinator: z.enum(["AND", "OR"]),
      conditions: z.array(marketingSegmentConditionSchema).max(50),
      groups: z.array(marketingSegmentGroupSchema).max(8).optional(),
    }),
);

export const marketingSegmentSchema = tenantResourceSchema.extend({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  definition: marketingSegmentGroupSchema,
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  estimatedCount: z.number().int().nonnegative(),
  lastEstimatedAt: dateTimeSchema.optional(),
  version: z.number().int().positive(),
});

export const marketingSegmentInputSchema = marketingSegmentSchema
  .pick({ name: true, description: true, definition: true })
  .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE") });

export const marketingAudienceDefinitionSchema = z.object({
  includeListIds: z.array(z.string().uuid()).max(100).default([]),
  includeSegmentIds: z.array(z.string().uuid()).max(100).default([]),
  includeProfileIds: z.array(z.string().uuid()).max(1_000).default([]),
  excludeListIds: z.array(z.string().uuid()).max(100).default([]),
  excludeSegmentIds: z.array(z.string().uuid()).max(100).default([]),
  excludeProfileIds: z.array(z.string().uuid()).max(1_000).default([]),
  recentRecipientDays: z.number().int().min(1).max(365).optional(),
});

const headingBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("HEADING"),
  text: z.string().max(500),
  level: z.enum(["H1", "H2", "H3"]).default("H2"),
});
const paragraphBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("PARAGRAPH"),
  text: z.string().max(20_000),
});
const imageBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("IMAGE"),
  src: httpsUrlSchema,
  alt: z.string().max(500),
  href: httpsUrlSchema.optional(),
});
const buttonBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("BUTTON"),
  label: z.string().trim().min(1).max(120),
  href: httpsUrlSchema,
});
const dividerBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("DIVIDER"),
});
const spacerBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("SPACER"),
  size: z.enum(["SM", "MD", "LG"]),
});
const legalBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["UNSUBSCRIBE", "PREFERENCE_CENTER", "FOOTER"]),
  text: z.string().max(2_000).optional(),
});

export const marketingContentBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  buttonBlockSchema,
  dividerBlockSchema,
  spacerBlockSchema,
  legalBlockSchema,
]);

export const marketingContentSchema = z.object({
  blocks: z.array(marketingContentBlockSchema).min(1).max(200),
  plainText: z.string().max(100_000).optional(),
});

export const marketingTemplateSchema = tenantResourceSchema.extend({
  name: z.string().trim().min(1).max(160),
  category: z.enum([
    "NEWSLETTER",
    "PROMOTION",
    "ANNOUNCEMENT",
    "PRODUCT_UPDATE",
    "WELCOME",
    "EVENT",
    "RE_ENGAGEMENT",
    "PROFESSIONAL_INSIGHTS",
    "CUSTOM",
  ]),
  locale: z.string().trim().min(2).max(16),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  currentVersion: z.number().int().positive(),
  subject: z.string().trim().min(1).max(998),
  previewText: z.string().max(500).optional(),
  content: marketingContentSchema,
});

export const marketingTemplateInputSchema = marketingTemplateSchema
  .pick({ name: true, category: true, locale: true, subject: true, previewText: true, content: true })
  .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE") });

export const marketingSenderIdentitySchema = tenantResourceSchema.extend({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().email(),
  replyTo: z.string().email().optional(),
  providerConnectionId: z.string().uuid(),
  status: z.enum(["PENDING", "VERIFIED", "FAILED", "DISABLED"]),
  verifiedAt: dateTimeSchema.optional(),
});

export const marketingSendingDomainSchema = tenantResourceSchema.extend({
  domain: z.string().trim().min(1).max(255),
  providerConnectionId: z.string().uuid(),
  ownershipStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
  spfStatus: z.enum(["UNKNOWN", "VALID", "INVALID"]),
  dkimStatus: z.enum(["UNKNOWN", "VALID", "INVALID"]),
  dmarcStatus: z.enum(["UNKNOWN", "VALID", "INVALID"]),
  verifiedAt: dateTimeSchema.optional(),
});

export const marketingVariantSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
  name: z.string().trim().min(1).max(120),
  weight: z.number().int().min(1).max(100),
  subject: z.string().trim().min(1).max(998).optional(),
  previewText: z.string().max(500).optional(),
  content: marketingContentSchema.optional(),
});

export const marketingExperimentSchema = z.object({
  enabled: z.boolean().default(false),
  testPercentage: z.number().int().min(1).max(100).default(20),
  durationMinutes: z.number().int().min(15).max(10_080).default(240),
  winnerMetric: z.enum(["CLICK_RATE", "CONVERSION_RATE", "OPEN_RATE"]).default("CLICK_RATE"),
  winnerMode: z.enum(["AUTOMATIC", "MANUAL"]).default("AUTOMATIC"),
  variants: z.array(marketingVariantSchema).min(2).max(8),
}).superRefine((experiment, context) => {
  if (experiment.variants.reduce((sum, variant) => sum + variant.weight, 0) !== 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants"], message: "La distribution des variantes doit totaliser 100 %." });
  }
});

export const marketingCampaignSchema = tenantResourceSchema.extend({
  name: z.string().trim().min(1).max(255),
  campaignType: z.enum(["NEWSLETTER", "PROMOTION", "LIFECYCLE", "ANNOUNCEMENT"]),
  status: marketingCampaignStatusSchema,
  locale: z.string().trim().min(2).max(16),
  timezone: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(998),
  previewText: z.string().max(500).optional(),
  content: marketingContentSchema,
  audience: marketingAudienceDefinitionSchema,
  templateId: z.string().uuid().optional(),
  templateVersion: z.number().int().positive().optional(),
  senderIdentityId: z.string().uuid().optional(),
  providerConnectionId: z.string().uuid().optional(),
  replyTo: z.string().email().optional(),
  experiment: marketingExperimentSchema.optional(),
  winningVariantId: z.string().max(80).optional(),
  scheduledAt: dateTimeSchema.optional(),
  startedAt: dateTimeSchema.optional(),
  completedAt: dateTimeSchema.optional(),
  currentVersion: z.number().int().positive(),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
});

export const marketingCampaignInputSchema = marketingCampaignSchema
  .pick({
    name: true,
    campaignType: true,
    locale: true,
    timezone: true,
    subject: true,
    previewText: true,
    content: true,
    audience: true,
    templateId: true,
    templateVersion: true,
    senderIdentityId: true,
    providerConnectionId: true,
    replyTo: true,
    experiment: true,
  })
  .partial()
  .extend({
    name: z.string().trim().min(1).max(255),
    subject: z.string().trim().min(1).max(998),
    content: marketingContentSchema,
    audience: marketingAudienceDefinitionSchema,
  });

export const marketingAudienceEstimateSchema = z.object({
  selected: z.number().int().nonnegative(),
  eligible: z.number().int().nonnegative(),
  excluded: z.number().int().nonnegative(),
  unsubscribed: z.number().int().nonnegative(),
  suppressed: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
  doNotContact: z.number().int().nonnegative(),
  duplicate: z.number().int().nonnegative(),
  frequencyCapped: z.number().int().nonnegative(),
  calculatedAt: dateTimeSchema,
});

export const marketingPreflightIssueSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,80}$/),
  message: z.string().min(1).max(1_000),
  field: z.string().max(120).optional(),
  actionHref: z.string().max(500).optional(),
});

export const marketingPreflightSchema = z.object({
  campaignId: z.string().uuid(),
  blockers: z.array(marketingPreflightIssueSchema),
  warnings: z.array(marketingPreflightIssueSchema),
  info: z.array(marketingPreflightIssueSchema),
  audience: marketingAudienceEstimateSchema,
  checkedAt: dateTimeSchema,
  canSend: z.boolean(),
});

export const marketingSuppressionSchema = tenantResourceSchema.extend({
  normalizedEmail: z.string().email(),
  reason: marketingSuppressionReasonSchema,
  source: z.string().trim().min(1).max(120),
  profileId: z.string().uuid().optional(),
  providerConnectionId: z.string().uuid().optional(),
  occurredAt: dateTimeSchema,
  releasedAt: dateTimeSchema.optional(),
});

export const marketingDashboardSchema = z.object({
  activeProfiles: z.number().int().nonnegative(),
  pendingProfiles: z.number().int().nonnegative(),
  suppressedProfiles: z.number().int().nonnegative(),
  campaignsSent: z.number().int().nonnegative(),
  scheduledCampaigns: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  deliveryRate: z.number().min(0).max(1),
  uniqueClicks: z.number().int().nonnegative(),
  clickThroughRate: z.number().min(0).max(1),
  unsubscribes: z.number().int().nonnegative(),
  providerConfigured: z.boolean(),
});

export const marketingVariantMetricsSchema = z.object({
  variantId: z.string(),
  attempted: z.number().int().nonnegative(),
  accepted: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  uniqueOpens: z.number().int().nonnegative(),
  uniqueClicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  clickThroughRate: z.number().min(0).max(1),
  conversionRate: z.number().min(0).max(1),
});

export const marketingAnalyticsSchema = z.object({
  audienceSize: z.number().int().nonnegative(),
  eligibleRecipients: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
  accepted: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  deliveryRate: z.number().min(0).max(1),
  softBounces: z.number().int().nonnegative(),
  hardBounces: z.number().int().nonnegative(),
  complaints: z.number().int().nonnegative(),
  unsubscribes: z.number().int().nonnegative(),
  uniqueOpens: z.number().int().nonnegative(),
  uniqueClicks: z.number().int().nonnegative(),
  clickThroughRate: z.number().min(0).max(1),
  conversions: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
  openMetricCaveat: z.string(),
  variants: z.array(marketingVariantMetricsSchema),
  calculatedAt: dateTimeSchema,
});

export const marketingJourneyTriggerTypeSchema = z.enum([
  "SUBSCRIBER_CREATED", "SUBSCRIBER_CONFIRMED", "LIST_JOINED", "FORM_SUBMITTED",
  "TAG_ADDED", "CRM_CONTACT_CREATED", "CRM_STAGE_CHANGED", "CAMPAIGN_CLICKED",
  "SUBSCRIPTION_STARTED", "SUBSCRIPTION_CANCELLED", "SCHEDULED_DATE", "EXTERNAL_EVENT",
]);

export const marketingJourneyNodeTypeSchema = z.enum([
  "CONDITION", "WAIT", "SEND_EMAIL", "BRANCH", "ADD_TO_LIST", "REMOVE_FROM_LIST",
  "ADD_TAG", "REMOVE_TAG", "UPDATE_FIELD", "CREATE_CRM_TASK", "RECORD_CRM_ACTIVITY",
  "CALL_WEBHOOK", "RUN_AI", "END",
]);

export const marketingJourneyNodeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
  type: marketingJourneyNodeTypeSchema,
  nextNodeId: z.string().max(80).optional(),
  alternateNodeId: z.string().max(80).optional(),
  configuration: z.record(z.string(), z.unknown()).default({}),
});

export const marketingJourneyDefinitionSchema = z.object({
  trigger: z.object({
    type: marketingJourneyTriggerTypeSchema,
    configuration: z.record(z.string(), z.unknown()).default({}),
  }),
  entryNodeId: z.string().max(80),
  nodes: z.array(marketingJourneyNodeSchema).min(1).max(100),
  maxExecutionDepth: z.number().int().min(1).max(100).default(50),
});

export const marketingJourneySchema = tenantResourceSchema.extend({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
  currentVersion: z.number().int().positive(),
  definition: marketingJourneyDefinitionSchema,
  createdBy: z.string().uuid(),
});

export const marketingJourneyInputSchema = marketingJourneySchema
  .pick({ name: true, description: true, definition: true });

export const marketingJourneyEventSchema = z.object({
  type: marketingJourneyTriggerTypeSchema,
  eventId: z.string().trim().min(1).max(255),
  profileId: z.string().uuid().optional(),
  safeContext: z.record(z.string(), z.unknown()).default({}),
});

export const marketingJourneyExecutionSchema = tenantResourceSchema.extend({
  journeyId: z.string().uuid(),
  journeyVersion: z.number().int().positive(),
  profileId: z.string().uuid().optional(),
  eventId: z.string().min(1).max(255),
  status: z.enum(["QUEUED", "RUNNING", "WAITING", "COMPLETED", "FAILED", "STOPPED"]),
  currentNodeId: z.string().max(80).optional(),
  depth: z.number().int().nonnegative(),
  availableAt: dateTimeSchema,
  lastErrorCode: z.string().max(120).optional(),
});

export const marketingEntitlementsSchema = z.object({
  enabled: z.boolean(),
  maxContacts: z.number().int().positive(),
  maxMonthlySends: z.number().int().positive(),
  maxLists: z.number().int().positive(),
  maxSegments: z.number().int().positive(),
  maxUsers: z.number().int().positive(),
  templates: z.boolean(),
  automation: z.boolean(),
  abTesting: z.boolean(),
  advancedAnalytics: z.boolean(),
  byoEmail: z.boolean(),
  platformEmail: z.boolean(),
  customDomain: z.boolean(),
  api: z.boolean(),
  webhooks: z.boolean(),
  ai: z.boolean(),
});

export const marketingUsageSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  activeProfiles: z.number().int().nonnegative(),
  attemptedSends: z.number().int().nonnegative(),
  campaignCount: z.number().int().nonnegative(),
  automationExecutions: z.number().int().nonnegative(),
  apiRequests: z.number().int().nonnegative(),
  entitlements: marketingEntitlementsSchema,
});

export const marketingWebhookSubscriptionSchema = tenantResourceSchema.extend({
  url: z.string().url(),
  eventTypes: z.array(z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/)).min(1).max(100),
  status: z.enum(["ACTIVE", "PAUSED", "DISABLED"]),
  signingSecretHint: z.string().max(32),
  lastDeliveredAt: dateTimeSchema.optional(),
  lastFailureAt: dateTimeSchema.optional(),
});

export const marketingWebhookSubscriptionInputSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/)).min(1).max(100),
});

export const marketingAiAssistInputSchema = z.object({
  task: z.enum([
    "marketing.campaign_draft", "marketing.subject_generation", "marketing.preview_generation",
    "marketing.content_rewrite", "marketing.ab_generation", "marketing.translation",
    "marketing.performance_analysis", "marketing.segment_suggestion",
  ]),
  instructions: z.string().trim().min(3).max(5_000),
  locale: z.string().trim().min(2).max(16).default("fr-FR"),
  safeContext: z.record(z.string(), z.unknown()).default({}),
});

export const marketingConversionInputSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(255),
  campaignRecipientId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  conversionType: z.string().trim().min(2).max(120),
  externalSubjectId: z.string().trim().max(255).optional(),
  amountMinor: z.number().int().nonnegative().safe().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  occurredAt: dateTimeSchema,
  safeMetadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, context) => {
  if ((value.amountMinor === undefined) !== (value.currency === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["amountMinor"], message: "Le montant et la devise doivent être fournis ensemble." });
  }
});

export const marketingPageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().min(1).optional(),
});

export const marketingPublicSubscriptionInputSchema = z.object({
  email: z.string().trim().email(),
  marketCode: z.string().regex(/^[A-Z]{2}$/).default("FR"),
  locale: z.string().trim().min(2).max(16).default("fr-FR"),
  topics: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  source: z
    .enum(["HOMEPAGE", "FOOTER", "REGISTRATION", "NEWSLETTER_PAGE", "FORM"])
    .default("NEWSLETTER_PAGE"),
  consentGiven: z.literal(true),
});

export const marketingSubscriptionViewSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  marketCode: z.string().regex(/^[A-Z]{2}$/),
  locale: z.string().trim().min(2).max(16),
  status: marketingProfileStatusSchema,
  topics: z.array(z.string()),
  subscribedAt: dateTimeSchema.optional(),
  confirmedAt: dateTimeSchema.optional(),
  unsubscribedAt: dateTimeSchema.optional(),
});

export const marketingPublicActionSchema = z.object({
  token: z.string().trim().min(32).max(512),
});

export const marketingPublicPreferencesUpdateSchema = marketingPublicActionSchema.extend({
  topics: z.array(z.string().trim().min(1).max(80)).max(100),
});

export const marketingSubscriptionReceiptSchema = z.object({
  accepted: z.literal(true),
  status: z.enum(["PENDING_CONFIRMATION", "SUBSCRIBED", "UNCHANGED"]),
  message: z.string().min(1).max(500),
});

export type MarketingProfileStatus = z.infer<typeof marketingProfileStatusSchema>;
export type MarketingProfileSource = z.infer<typeof marketingProfileSourceSchema>;
export type MarketingProfile = z.infer<typeof marketingProfileSchema>;
export type MarketingProfileInput = z.infer<typeof marketingProfileInputSchema>;
export type MarketingList = z.infer<typeof marketingListSchema>;
export type MarketingListInput = z.infer<typeof marketingListInputSchema>;
export type MarketingSegmentCondition = z.infer<typeof marketingSegmentConditionSchema>;
export type MarketingSegment = z.infer<typeof marketingSegmentSchema>;
export type MarketingSegmentInput = z.infer<typeof marketingSegmentInputSchema>;
export type MarketingAudienceDefinition = z.infer<typeof marketingAudienceDefinitionSchema>;
export type MarketingContentBlock = z.infer<typeof marketingContentBlockSchema>;
export type MarketingContent = z.infer<typeof marketingContentSchema>;
export type MarketingTemplate = z.infer<typeof marketingTemplateSchema>;
export type MarketingTemplateInput = z.infer<typeof marketingTemplateInputSchema>;
export type MarketingSenderIdentity = z.infer<typeof marketingSenderIdentitySchema>;
export type MarketingSendingDomain = z.infer<typeof marketingSendingDomainSchema>;
export type MarketingCampaignStatus = z.infer<typeof marketingCampaignStatusSchema>;
export type MarketingCampaign = z.infer<typeof marketingCampaignSchema>;
export type MarketingCampaignInput = z.infer<typeof marketingCampaignInputSchema>;
export type MarketingAudienceEstimate = z.infer<typeof marketingAudienceEstimateSchema>;
export type MarketingPreflightIssue = z.infer<typeof marketingPreflightIssueSchema>;
export type MarketingPreflight = z.infer<typeof marketingPreflightSchema>;
export type MarketingSuppressionReason = z.infer<typeof marketingSuppressionReasonSchema>;
export type MarketingSuppression = z.infer<typeof marketingSuppressionSchema>;
export type MarketingDashboard = z.infer<typeof marketingDashboardSchema>;
export type MarketingVariant = z.infer<typeof marketingVariantSchema>;
export type MarketingExperiment = z.infer<typeof marketingExperimentSchema>;
export type MarketingVariantMetrics = z.infer<typeof marketingVariantMetricsSchema>;
export type MarketingAnalytics = z.infer<typeof marketingAnalyticsSchema>;
export type MarketingJourneyTriggerType = z.infer<typeof marketingJourneyTriggerTypeSchema>;
export type MarketingJourneyNodeType = z.infer<typeof marketingJourneyNodeTypeSchema>;
export type MarketingJourneyNode = z.infer<typeof marketingJourneyNodeSchema>;
export type MarketingJourneyDefinition = z.infer<typeof marketingJourneyDefinitionSchema>;
export type MarketingJourney = z.infer<typeof marketingJourneySchema>;
export type MarketingJourneyInput = z.infer<typeof marketingJourneyInputSchema>;
export type MarketingJourneyEvent = z.infer<typeof marketingJourneyEventSchema>;
export type MarketingJourneyExecution = z.infer<typeof marketingJourneyExecutionSchema>;
export type MarketingEntitlements = z.infer<typeof marketingEntitlementsSchema>;
export type MarketingUsage = z.infer<typeof marketingUsageSchema>;
export type MarketingWebhookSubscription = z.infer<typeof marketingWebhookSubscriptionSchema>;
export type MarketingWebhookSubscriptionInput = z.infer<typeof marketingWebhookSubscriptionInputSchema>;
export type MarketingAiAssistInput = z.infer<typeof marketingAiAssistInputSchema>;
export type MarketingConversionInput = z.infer<typeof marketingConversionInputSchema>;
export type CommunicationPurpose = z.infer<typeof communicationPurposeSchema>;
export type MarketingDeliveryEventType = z.infer<typeof marketingDeliveryEventTypeSchema>;
export type MarketingPublicSubscriptionInput = z.infer<typeof marketingPublicSubscriptionInputSchema>;
export type MarketingSubscriptionView = z.infer<typeof marketingSubscriptionViewSchema>;
export type MarketingPublicAction = z.infer<typeof marketingPublicActionSchema>;
export type MarketingPublicPreferencesUpdate = z.infer<typeof marketingPublicPreferencesUpdateSchema>;
export type MarketingSubscriptionReceipt = z.infer<typeof marketingSubscriptionReceiptSchema>;
