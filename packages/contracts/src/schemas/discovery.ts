import { z } from "zod";
import { marketCodeSchema } from "./primitives";

export const publisherTypeSchema = z.enum(["private", "professional"]);
export type PublisherType = z.infer<typeof publisherTypeSchema>;

export const publisherVerificationStatusSchema = z.enum([
  "unverified",
  "email_verified",
  "phone_verified",
  "identity_verified",
  "business_verified",
  "suspended",
]);
export type PublisherVerificationStatus = z.infer<
  typeof publisherVerificationStatusSchema
>;

/**
 * Public, canonical publisher projection. Organization members remain actors;
 * the organization remains the owner of a professional listing.
 */
export const effectivePublisherSchema = z
  .object({
    type: publisherTypeSchema,
    userId: z.string().min(1),
    organizationId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().optional(),
    verificationStatus: publisherVerificationStatusSchema,
  })
  .superRefine((publisher, context) => {
    if (publisher.type === "professional" && !publisher.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "A professional publisher must reference an organization.",
      });
    }
    if (publisher.type === "private" && publisher.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "A private publisher cannot be owned by an organization.",
      });
    }
  });
export type EffectivePublisher = z.infer<typeof effectivePublisherSchema>;

export const promotionPlacementTypeSchema = z.enum([
  "urgent_badge",
  "search_bump",
  "featured",
  "top_placement",
  "sponsored_search",
  "homepage_spotlight",
  "category_spotlight",
  "local_spotlight",
  "seller_spotlight",
]);
export type PromotionPlacementType = z.infer<
  typeof promotionPlacementTypeSchema
>;

export const listingPromotionStateSchema = z.object({
  state: z.enum([
    "inactive",
    "scheduled",
    "active",
    "expired",
    "cancelled",
    "refunded",
    "failed",
  ]),
  type: promotionPlacementTypeSchema.optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  promotedAt: z.string().datetime().optional(),
  source: z.enum(["purchase", "subscription_credit", "admin_grant"]).optional(),
  sourceId: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});
export type ListingPromotionState = z.infer<typeof listingPromotionStateSchema>;

export const discoveryReasonSchema = z.enum([
  "organic_relevance",
  "organic_freshness",
  "organic_price",
  "sponsored_relevant",
]);

export const discoveryPresentationSchema = z.object({
  isSponsored: z.boolean(),
  promotionType: promotionPlacementTypeSchema.optional(),
  promotionLabel: z.string().min(1).optional(),
  promotionImpressionId: z.string().min(1).optional(),
  organicPositionContext: z.number().int().nonnegative().optional(),
  placementReason: discoveryReasonSchema,
  rankingVersion: z.string().min(1),
});
export type DiscoveryPresentation = z.infer<typeof discoveryPresentationSchema>;

export const rankingWeightsSchema = z.object({
  relevance: z.number().min(0).max(1),
  category: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  quality: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  trust: z.number().min(0).max(1),
  price: z.number().min(0).max(1),
  personalization: z.number().min(0).max(1),
});
export type RankingWeights = z.infer<typeof rankingWeightsSchema>;

export const discoveryConfigurationSchema = z
  .object({
    version: z.string().min(1),
    marketCode: marketCodeSchema,
    categoryId: z.string().optional(),
    context: z.enum(["search", "home", "similar", "saved_search"]),
    weights: rankingWeightsSchema,
    freshnessHalfLifeDays: z.number().positive(),
    diversity: z.object({
      maxConsecutivePerPublisher: z.number().int().positive(),
      maxFirstPageSharePerPublisher: z.number().min(0).max(1),
      maxSponsoredPerPublisher: z.number().int().positive(),
      minimumRelevanceRatio: z.number().min(0).max(1),
    }),
    sponsored: z.object({
      positions: z.array(z.number().int().positive()),
      maxPerPage: z.number().int().nonnegative(),
      maxShare: z.number().min(0).max(0.4),
      minimumRelevance: z.number().min(0).max(1),
      minimumOrganicResults: z.number().int().positive(),
    }),
  })
  .superRefine((configuration, context) => {
    const weightTotal = Object.values(configuration.weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (Math.abs(weightTotal - 1) > 0.001) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weights"],
        message: "Organic ranking weights must sum to 1.",
      });
    }
    const uniquePositions = new Set(configuration.sponsored.positions);
    if (uniquePositions.size !== configuration.sponsored.positions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sponsored", "positions"],
        message: "Sponsored positions must be unique.",
      });
    }
    if (
      configuration.sponsored.positions.length <
      configuration.sponsored.maxPerPage
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sponsored", "positions"],
        message: "A configured position is required for each sponsored result.",
      });
    }
  });
export type DiscoveryConfiguration = z.infer<
  typeof discoveryConfigurationSchema
>;

export const discoveryEventSchema = z.object({
  requestId: z.string().min(1),
  marketCode: marketCodeSchema,
  rankingVersion: z.string().min(1),
  organicCandidateCount: z.number().int().nonnegative(),
  sponsoredCandidateCount: z.number().int().nonnegative(),
  duplicateSuppressionCount: z.number().int().nonnegative(),
  diversityRerankCount: z.number().int().nonnegative(),
  finalOrganicCount: z.number().int().nonnegative(),
  finalSponsoredCount: z.number().int().nonnegative(),
  publisherDistribution: z.record(z.string(), z.number().int().nonnegative()),
});
export type DiscoveryEvent = z.infer<typeof discoveryEventSchema>;

export const discoveryMetricsSchema = z.object({
  marketCode: marketCodeSchema,
  searchRequests: z.number().int().nonnegative(),
  noResultRequests: z.number().int().nonnegative(),
  organicCandidates: z.number().int().nonnegative(),
  sponsoredCandidates: z.number().int().nonnegative(),
  organicResults: z.number().int().nonnegative(),
  sponsoredResults: z.number().int().nonnegative(),
  duplicateSuppressions: z.number().int().nonnegative(),
  diversityReranks: z.number().int().nonnegative(),
  privateResultCount: z.number().int().nonnegative(),
  professionalResultCount: z.number().int().nonnegative(),
  averageLatencyMs: z.number().nonnegative(),
});
export type DiscoveryMetrics = z.infer<typeof discoveryMetricsSchema>;
