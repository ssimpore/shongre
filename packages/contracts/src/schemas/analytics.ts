import { z } from "zod";

/**
 * Canonical, provider-neutral Shongre product and business event vocabulary.
 *
 * Event names are semantic product contracts shared by Web, mobile and the
 * backend. Vendor-specific names and database row shapes do not belong here.
 */
export const ANALYTICS_EVENT_NAMES = [
  "session_started",
  "page_viewed",
  "navigation_performed",
  "signup_started",
  "signup_completed",
  "login_started",
  "login_completed",
  "logout_completed",
  "verification_started",
  "verification_completed",
  "password_reset_requested",
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "search_started",
  "search_performed",
  "search_result_clicked",
  "filter_applied",
  "filter_removed",
  "sort_changed",
  "category_viewed",
  "subcategory_viewed",
  "recommendation_viewed",
  "listing_viewed",
  "listing_shared",
  "listing_favorited",
  "listing_unfavorited",
  "publication_started",
  "publication_step_completed",
  "publication_abandoned",
  "publication_completed",
  "listing_published",
  "listing_updated",
  "listing_paused",
  "listing_reactivated",
  "listing_deleted",
  "seller_profile_viewed",
  "seller_followed",
  "seller_contacted",
  "conversation_started",
  "message_sent",
  "message_received",
  "contact_revealed",
  "offer_started",
  "offer_sent",
  "offer_accepted",
  "offer_rejected",
  "checkout_started",
  "checkout_completed",
  "transaction_started",
  "transaction_completed",
  "transaction_cancelled",
  "refund_requested",
  "refund_completed",
  "plan_viewed",
  "subscription_checkout_started",
  "subscription_started",
  "subscription_upgraded",
  "subscription_downgraded",
  "subscription_cancelled",
  "promotion_viewed",
  "promotion_checkout_started",
  "promotion_purchased",
  "boost_purchased",
  "featured_listing_purchased",
  "lead_received",
  "lead_viewed",
  "lead_contacted",
  "lead_converted",
  "crm_contact_created",
  "crm_opportunity_created",
  "crm_opportunity_converted",
  "newsletter_campaign_created",
  "newsletter_campaign_scheduled",
  "newsletter_campaign_sent",
  "report_started",
  "report_submitted",
  "kyc_started",
  "kyc_completed",
  "moderation_action_performed",
  "support_request_created",
  "support_request_resolved",
  "web_vital_measured",
  "feature_flag_evaluated",
  "experiment_exposure_recorded",
  "trending_section_view",
  "trending_topic_impression",
  "trending_topic_click",
  "trending_topic_change",
  "trending_listing_impression",
  "trending_listing_click",
  "trending_see_all_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENT_NAMES);

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

export type AnalyticsPlatform = "web" | "ios" | "android" | "backend";

export type AnalyticsPropertyValue =
  string | number | boolean | null | readonly string[] | readonly number[];

export interface BaseAnalyticsProperties {
  [key: string]: AnalyticsPropertyValue | undefined;
  categoryId?: string;
  subcategoryId?: string;
  listingId?: string;
  sellerId?: string;
  organizationId?: string;
  source?: string;
}

export interface PageAnalyticsProperties extends BaseAnalyticsProperties {
  path: string;
  title?: string;
  referrerHost?: string;
}

export interface SearchAnalyticsProperties extends BaseAnalyticsProperties {
  query?: string;
  resultCount?: number;
  zeroResults?: boolean;
  clickedPosition?: number;
  filterKeys?: readonly string[];
  sort?: string;
  radiusKm?: number;
}

export interface PublicationAnalyticsProperties extends BaseAnalyticsProperties {
  step?: string;
  stepIndex?: number;
  selectedMarketCodes?: readonly string[];
  draftId?: string;
}

export interface FinancialAnalyticsProperties extends BaseAnalyticsProperties {
  amountMinor?: number;
  currency?: string;
  orderId?: string;
  transactionId?: string;
  planId?: string;
  promotionType?: string;
}

export interface MessagingAnalyticsProperties extends BaseAnalyticsProperties {
  conversationId?: string;
  attachmentCount?: number;
  /** Message content is intentionally not part of this contract. */
}

export interface WebVitalAnalyticsProperties extends BaseAnalyticsProperties {
  metric: "LCP" | "CLS" | "INP" | "TTFB";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  route?: string;
}

export interface FeatureAnalyticsProperties extends BaseAnalyticsProperties {
  flagKey: string;
  enabled?: boolean;
  variant?: string;
  experimentKey?: string;
}

type SearchEvent =
  | "search_started"
  | "search_performed"
  | "search_result_clicked"
  | "filter_applied"
  | "filter_removed"
  | "sort_changed"
  | "category_viewed"
  | "subcategory_viewed"
  | "recommendation_viewed";

type PublicationEvent =
  | "publication_started"
  | "publication_step_completed"
  | "publication_abandoned"
  | "publication_completed"
  | "listing_published";

type FinancialEvent =
  | "checkout_started"
  | "checkout_completed"
  | "transaction_started"
  | "transaction_completed"
  | "transaction_cancelled"
  | "refund_requested"
  | "refund_completed"
  | "plan_viewed"
  | "subscription_checkout_started"
  | "subscription_started"
  | "subscription_upgraded"
  | "subscription_downgraded"
  | "subscription_cancelled"
  | "promotion_viewed"
  | "promotion_checkout_started"
  | "promotion_purchased"
  | "boost_purchased"
  | "featured_listing_purchased";

type MessagingEvent =
  | "conversation_started"
  | "message_sent"
  | "message_received"
  | "contact_revealed";

export type AnalyticsEventProperties<Name extends AnalyticsEventName> =
  Name extends "page_viewed" | "navigation_performed"
    ? PageAnalyticsProperties
    : Name extends SearchEvent
      ? SearchAnalyticsProperties
      : Name extends PublicationEvent
        ? PublicationAnalyticsProperties
        : Name extends FinancialEvent
          ? FinancialAnalyticsProperties
          : Name extends MessagingEvent
            ? MessagingAnalyticsProperties
            : Name extends "web_vital_measured"
              ? WebVitalAnalyticsProperties
              : Name extends
                    "feature_flag_evaluated" | "experiment_exposure_recorded"
                ? FeatureAnalyticsProperties
                : BaseAnalyticsProperties;

export interface AnalyticsContext {
  eventId: string;
  timestamp: string;
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  environment:
    "local" | "test" | "preview" | "development" | "staging" | "production";
  platform: AnalyticsPlatform;
  countryCode: string;
  marketCode: string;
  locale: string;
  currency: string;
  timezone?: string;
  canonicalDomain?: string;
  anonymousId?: string;
  sessionId?: string;
  userId?: string;
  userType?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  firstSource?: string;
  firstMedium?: string;
  firstCampaign?: string;
  deviceType?: "desktop" | "tablet" | "mobile" | "bot" | "unknown";
  release?: string;
  requestId?: string;
  isTestTraffic?: boolean;
}

export interface AnalyticsEventEnvelope<
  Name extends AnalyticsEventName = AnalyticsEventName,
> {
  name: Name;
  context: AnalyticsContext;
  properties: AnalyticsEventProperties<Name>;
}

const propertyValueSchema = z.union([
  z.string().max(512),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(160)).max(50),
  z.array(z.number().finite()).max(50),
]);

export const analyticsContextSchema = z
  .object({
    eventId: z.string().min(8).max(160),
    timestamp: z.string().datetime(),
    schemaVersion: z.literal(ANALYTICS_SCHEMA_VERSION),
    environment: z.enum([
      "local",
      "test",
      "preview",
      "development",
      "staging",
      "production",
    ]),
    platform: z.enum(["web", "ios", "android", "backend"]),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    marketCode: z.string().regex(/^[A-Z]{2}$/),
    locale: z.string().min(2).max(32),
    currency: z.string().regex(/^[A-Z]{3}$/),
    timezone: z.string().min(1).max(80).optional(),
    canonicalDomain: z.string().min(1).max(255).optional(),
    anonymousId: z.string().min(8).max(160).optional(),
    sessionId: z.string().min(8).max(160).optional(),
    userId: z.string().min(1).max(160).optional(),
    userType: z.string().min(1).max(80).optional(),
    source: z.string().max(160).optional(),
    medium: z.string().max(160).optional(),
    campaign: z.string().max(240).optional(),
    term: z.string().max(240).optional(),
    content: z.string().max(240).optional(),
    firstSource: z.string().max(160).optional(),
    firstMedium: z.string().max(160).optional(),
    firstCampaign: z.string().max(240).optional(),
    deviceType: z
      .enum(["desktop", "tablet", "mobile", "bot", "unknown"])
      .optional(),
    release: z.string().max(160).optional(),
    requestId: z.string().max(160).optional(),
    isTestTraffic: z.boolean().optional(),
  })
  .strict();

export const analyticsEventEnvelopeSchema = z
  .object({
    name: analyticsEventNameSchema,
    context: analyticsContextSchema,
    properties: z.record(z.string().max(80), propertyValueSchema),
  })
  .strict();

export const analyticsEventBatchSchema = z
  .object({
    events: z.array(analyticsEventEnvelopeSchema).min(1).max(50),
  })
  .strict();

export const ANALYTICS_DATE_RANGES = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "month",
  "quarter",
  "year",
  "custom",
] as const;

export type AnalyticsDateRange = (typeof ANALYTICS_DATE_RANGES)[number];

export const analyticsDashboardQuerySchema = z
  .object({
    range: z.enum(ANALYTICS_DATE_RANGES).default("30d"),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    marketCode: z
      .union([z.literal("ALL"), z.string().regex(/^[A-Z]{2}$/)])
      .default("ALL"),
    categoryId: z.string().max(160).optional(),
    sellerType: z.enum(["individual", "professional"]).optional(),
    source: z.string().max(160).optional(),
    campaign: z.string().max(240).optional(),
  })
  .superRefine((value, context) => {
    if (value.range === "custom" && (!value.from || !value.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom analytics ranges require from and to dates.",
      });
    }
  });

export type AnalyticsDashboardQuery = z.infer<
  typeof analyticsDashboardQuerySchema
>;

export const analyticsMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  previousValue: z.number().optional(),
  unit: z.enum(["count", "percent", "currency_minor", "duration_ms"]),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
});

export type AnalyticsMetric = z.infer<typeof analyticsMetricSchema>;

export const analyticsTimeSeriesPointSchema = z.object({
  date: z.string().date(),
  primary: z.number(),
  secondary: z.number().optional(),
});

export type AnalyticsTimeSeriesPoint = z.infer<
  typeof analyticsTimeSeriesPointSchema
>;

export const analyticsOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  scope: analyticsDashboardQuerySchema,
  metrics: z.array(analyticsMetricSchema),
  activity: z.array(analyticsTimeSeriesPointSchema),
  funnel: z.array(
    z.object({
      step: z.string(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      conversionFromPrevious: z.number().min(0).max(100).optional(),
    }),
  ),
});

export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const analyticsAcquisitionSchema = z.object({
  generatedAt: z.string().datetime(),
  scope: analyticsDashboardQuerySchema,
  channels: z.array(
    z.object({
      source: z.string(),
      medium: z.string(),
      visitors: z.number().int().nonnegative(),
      registrations: z.number().int().nonnegative(),
      payingUsers: z.number().int().nonnegative(),
      conversionRate: z.number().min(0).max(100),
    }),
  ),
});

export type AnalyticsAcquisition = z.infer<typeof analyticsAcquisitionSchema>;

export const analyticsSearchSchema = z.object({
  generatedAt: z.string().datetime(),
  scope: analyticsDashboardQuerySchema,
  metrics: z.array(analyticsMetricSchema),
  opportunities: z.array(
    z.object({
      query: z.string(),
      marketCode: z.string().regex(/^[A-Z]{2}$/),
      searches: z.number().int().nonnegative(),
      resultSupply: z.number().int().nonnegative(),
      zeroResultRate: z.number().min(0).max(100),
      clickThroughRate: z.number().min(0).max(100),
    }),
  ),
});

export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>;

export const analyticsMonetizationSchema = z.object({
  generatedAt: z.string().datetime(),
  scope: analyticsDashboardQuerySchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  metrics: z.array(analyticsMetricSchema),
  revenue: z.array(analyticsTimeSeriesPointSchema),
  reconciliationStatus: z.enum(["reconciled", "partial", "unavailable"]),
});

export type AnalyticsMonetization = z.infer<typeof analyticsMonetizationSchema>;

export const analyticsSeoSchema = z.object({
  generatedAt: z.string().datetime(),
  scope: analyticsDashboardQuerySchema,
  lastSuccessfulSyncAt: z.string().datetime().optional(),
  metrics: z.array(analyticsMetricSchema),
  trend: z.array(analyticsTimeSeriesPointSchema),
  queries: z.array(
    z.object({
      query: z.string(),
      clicks: z.number().int().nonnegative(),
      impressions: z.number().int().nonnegative(),
      ctr: z.number().min(0).max(100),
      position: z.number().nonnegative(),
      page: z.string(),
      country: z.string(),
      device: z.string(),
    }),
  ),
});

export type AnalyticsSeo = z.infer<typeof analyticsSeoSchema>;

export const analyticsProviderHealthSchema = z.object({
  provider: z.enum([
    "internal",
    "posthog",
    "ga4",
    "matomo",
    "cloudflare",
    "search_console",
    "sentry",
  ]),
  enabled: z.boolean(),
  status: z.enum(["connected", "disabled", "degraded", "misconfigured"]),
  lastSuccessfulAt: z.string().datetime().optional(),
  lastFailureAt: z.string().datetime().optional(),
  failedEvents: z.number().int().nonnegative(),
  queueBacklog: z.number().int().nonnegative(),
  message: z.string(),
});

export type AnalyticsProviderHealth = z.infer<
  typeof analyticsProviderHealthSchema
>;

export const sellerAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  sellerId: z.string(),
  marketCode: z.string().regex(/^[A-Z]{2}$/),
  metrics: z.array(analyticsMetricSchema),
  listingPerformance: z.array(
    z.object({
      listingId: z.string(),
      title: z.string(),
      views: z.number().int().nonnegative(),
      favorites: z.number().int().nonnegative(),
      contacts: z.number().int().nonnegative(),
      conversionRate: z.number().min(0).max(100),
    }),
  ),
});

export type SellerAnalytics = z.infer<typeof sellerAnalyticsSchema>;
