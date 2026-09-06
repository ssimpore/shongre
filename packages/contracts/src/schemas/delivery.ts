import { z } from "zod";
import type { CountryConfig } from "../market-country";
import { marketCodeSchema, moneySchema } from "./primitives";

export const DELIVERY_DOMAIN = "delivery" as const;
export const DELIVERY_FEATURE_FLAG_KEY = "delivery.marketplace" as const;
export const DELIVERY_TAXONOMY_CATEGORY_ID =
  "services.local_services.delivery_courier" as const;

export const DELIVERY_REQUEST_STATUSES = [
  "draft",
  "pending_review",
  "open",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "suspended",
  "disputed",
] as const;
export const DELIVERY_APPLICATION_STATUSES = [
  "submitted",
  "withdrawn",
  "accepted",
  "rejected",
  "expired",
] as const;
export const DELIVERY_COURIER_STATUSES = [
  "inactive",
  "active",
  "paused",
  "suspended",
] as const;
export const DELIVERY_COURIER_ELIGIBILITY_STATUSES = [
  "pending",
  "eligible",
  "rejected",
  "suspended",
] as const;
export const DELIVERY_REQUEST_ORIGINS = ["standalone", "order"] as const;
export const DELIVERY_VEHICLE_TYPES = [
  "bicycle",
  "cargo_bicycle",
  "scooter",
  "car",
  "van",
] as const;

export const DELIVERY_CONSTRAINTS = {
  applicationAvailability: { minLength: 1, maxLength: 500 },
  applicationMessage: { minLength: 1, maxLength: 1_000 },
  moderationReason: { minLength: 10, maxLength: 2_000 },
  requestTitle: { minLength: 5, maxLength: 120 },
  requestDescription: { minLength: 10, maxLength: 2_000 },
  weightKg: { min: 0.1, max: 2_000, step: 0.1 },
  quoteMajor: { min: 0, step: 0.01 },
} as const;

export const DELIVERY_MARKET_ACTIVATION_REASONS = [
  "unknown_market",
  "market_disabled",
  "market_not_active",
  "marketplace_disabled",
  "delivery_capability_disabled",
  "operations_not_ready",
  "legal_not_ready",
  "compliance_not_ready",
  "legal_review_incomplete",
] as const;

export function deliveryMarketActivationIssues(
  country: CountryConfig | null | undefined,
): Array<(typeof DELIVERY_MARKET_ACTIVATION_REASONS)[number]> {
  if (!country) return ["unknown_market"];
  const issues: Array<(typeof DELIVERY_MARKET_ACTIVATION_REASONS)[number]> = [];
  if (!country.enabled) issues.push("market_disabled");
  if (!["active", "beta"].includes(country.launchStatus))
    issues.push("market_not_active");
  if (!country.marketplace.enabled) issues.push("marketplace_disabled");
  if (!country.capabilities.delivery)
    issues.push("delivery_capability_disabled");
  if (!country.readiness.operations) issues.push("operations_not_ready");
  if (!country.readiness.legal) issues.push("legal_not_ready");
  if (!country.readiness.compliance) issues.push("compliance_not_ready");
  if (
    country.compliance.legalReviewRequired &&
    country.compliance.legalReviewStatus !== "approved"
  ) {
    issues.push("legal_review_incomplete");
  }
  return issues;
}

export const deliveryRequestStatusSchema = z.enum(DELIVERY_REQUEST_STATUSES);
export const deliveryApplicationStatusSchema = z.enum(
  DELIVERY_APPLICATION_STATUSES,
);
export const deliveryCourierStatusSchema = z.enum(DELIVERY_COURIER_STATUSES);
export const deliveryCourierEligibilityStatusSchema = z.enum(
  DELIVERY_COURIER_ELIGIBILITY_STATUSES,
);
export const deliveryRequestOriginSchema = z.enum(DELIVERY_REQUEST_ORIGINS);
export const deliveryVehicleTypeSchema = z.enum(DELIVERY_VEHICLE_TYPES);

const deliveryIdSchema = z.string().uuid();
export const DELIVERY_DISCOVERY_LISTING_ID_PREFIX = "delivery_" as const;

/** Stable identity used when a delivery request participates in unified listing
 * discovery. The domain UUID remains recoverable so navigation and favorite
 * mutations never target the synthetic listing projection. */
export function deliveryDiscoveryListingId(requestId: string): string {
  return `${DELIVERY_DISCOVERY_LISTING_ID_PREFIX}${deliveryIdSchema.parse(requestId)}`;
}

export function deliveryRequestIdFromDiscoveryListingId(
  listingId: string,
): string | undefined {
  if (!listingId.startsWith(DELIVERY_DISCOVERY_LISTING_ID_PREFIX)) {
    return undefined;
  }
  const parsed = deliveryIdSchema.safeParse(
    listingId.slice(DELIVERY_DISCOVERY_LISTING_ID_PREFIX.length),
  );
  return parsed.success ? parsed.data : undefined;
}

const deliveryTimestampSchema = z.string().datetime();
const deliveryLocalitySchema = z.object({
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(2).max(20),
});
const deliveryPrivateStopSchema = deliveryLocalitySchema.extend({
  street: z.string().trim().min(1).max(240),
  complement: z.string().trim().max(240).optional(),
  contactName: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().min(6).max(40),
  accessInstructions: z.string().trim().max(1_000).optional(),
});
const deliveryWindowSchema = z
  .object({
    startsAt: deliveryTimestampSchema,
    endsAt: deliveryTimestampSchema,
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "delivery window start must precede its end",
  });
const deliveryPackageSchema = z.object({
  type: z.string().trim().min(1).max(80),
  count: z.number().int().min(1).max(100),
  approximateWeightGrams: z.number().int().positive().max(2_000_000),
  dimensionsCm: z
    .object({
      length: z.number().positive().max(500),
      width: z.number().positive().max(500),
      height: z.number().positive().max(500),
    })
    .optional(),
  handlingRequirements: z.array(z.string().trim().min(1).max(80)).max(10),
  requiredVehicleType: deliveryVehicleTypeSchema.optional(),
  loadingAssistanceRequired: z.boolean(),
});

export const deliveryFeatureAvailabilitySchema = z.object({
  marketCode: marketCodeSchema,
  enabled: z.boolean(),
  readOnlyAssigned: z.boolean(),
  reasons: z.array(
    z.enum([
      "country_disabled",
      "marketplace_disabled",
      "delivery_capability_disabled",
      "taxonomy_unavailable",
      "feature_flag_disabled",
      "operational_readiness_incomplete",
    ]),
  ),
});

export const deliveryCourierProfileSchema = z.object({
  id: deliveryIdSchema,
  marketCode: marketCodeSchema,
  status: deliveryCourierStatusSchema,
  eligibilityStatus: deliveryCourierEligibilityStatusSchema,
  vehicleTypes: z.array(deliveryVehicleTypeSchema).min(1).max(5),
  maxWeightGrams: z.number().int().positive().max(2_000_000),
  serviceLocalities: z.array(deliveryLocalitySchema).min(1).max(20),
  availabilityNote: z.string().trim().max(500).optional(),
  opportunityNotifications: z.boolean(),
  updatedAt: deliveryTimestampSchema,
});

export const deliveryCourierProfileInputSchema = deliveryCourierProfileSchema
  .omit({
    id: true,
    marketCode: true,
    eligibilityStatus: true,
    updatedAt: true,
  })
  .extend({ status: deliveryCourierStatusSchema.default("inactive") });

export const deliveryRequestDraftInputSchema = z.object({
  marketCode: marketCodeSchema,
  origin: deliveryRequestOriginSchema,
  sourceOrderId: deliveryIdSchema.optional(),
  title: z
    .string()
    .trim()
    .min(DELIVERY_CONSTRAINTS.requestTitle.minLength)
    .max(DELIVERY_CONSTRAINTS.requestTitle.maxLength),
  description: z
    .string()
    .trim()
    .min(DELIVERY_CONSTRAINTS.requestDescription.minLength)
    .max(DELIVERY_CONSTRAINTS.requestDescription.maxLength),
  pickup: deliveryPrivateStopSchema,
  dropoff: deliveryPrivateStopSchema,
  pickupWindow: deliveryWindowSchema,
  deliveryWindow: deliveryWindowSchema,
  package: deliveryPackageSchema,
  budget: moneySchema.optional(),
  publicInstructions: z.string().trim().max(1_000).optional(),
  expiresAt: deliveryTimestampSchema,
  idempotencyKey: z.string().trim().min(8).max(200),
});

export const deliveryPublicRequestSchema = z.object({
  id: deliveryIdSchema,
  slug: z.string().min(1),
  marketCode: marketCodeSchema,
  origin: deliveryRequestOriginSchema,
  status: deliveryRequestStatusSchema,
  title: z.string(),
  description: z.string(),
  pickupLocality: deliveryLocalitySchema,
  dropoffLocality: deliveryLocalitySchema,
  pickupWindow: deliveryWindowSchema,
  deliveryWindow: deliveryWindowSchema,
  package: deliveryPackageSchema,
  budget: moneySchema.optional(),
  publicInstructions: z.string().optional(),
  requester: z.object({
    displayName: z.string().min(1),
    verified: z.boolean(),
  }),
  applicationCount: z.number().int().nonnegative(),
  expiresAt: deliveryTimestampSchema,
  publishedAt: deliveryTimestampSchema.optional(),
  version: z.number().int().positive(),
});

export const deliveryApplicationSchema = z.object({
  id: deliveryIdSchema,
  requestId: deliveryIdSchema,
  status: deliveryApplicationStatusSchema,
  courier: z.object({
    displayName: z.string().min(1),
    verified: z.boolean(),
    vehicleTypes: z.array(deliveryVehicleTypeSchema),
  }),
  availabilityNote: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(1_000),
  quote: moneySchema.optional(),
  createdAt: deliveryTimestampSchema,
  updatedAt: deliveryTimestampSchema,
});

export const deliveryRequesterPrivateRequestSchema =
  deliveryPublicRequestSchema.extend({
    sourceOrderId: deliveryIdSchema.optional(),
    pickup: deliveryPrivateStopSchema,
    dropoff: deliveryPrivateStopSchema,
    applications: z.array(deliveryApplicationSchema),
    selectedApplicationId: deliveryIdSchema.optional(),
  });

/**
 * Exact-stop projection for the selected courier. It deliberately contains
 * only that courier's accepted application and never exposes the source order
 * or competing applications.
 */
export const deliverySelectedCourierAssignmentSchema =
  deliveryPublicRequestSchema.extend({
    pickup: deliveryPrivateStopSchema,
    dropoff: deliveryPrivateStopSchema,
    selectedApplicationId: deliveryIdSchema,
    selectedApplication: deliveryApplicationSchema,
  });

export const deliveryParticipantPrivateRequestSchema = z.union([
  deliveryRequesterPrivateRequestSchema,
  deliverySelectedCourierAssignmentSchema,
]);

// Existing requester consumers keep this stable name; selected couriers use
// the narrower assignment schema above.
export const deliveryPrivateRequestSchema =
  deliveryRequesterPrivateRequestSchema;

export const deliveryApplicationInputSchema = z.object({
  availabilityNote: z
    .string()
    .trim()
    .min(DELIVERY_CONSTRAINTS.applicationAvailability.minLength)
    .max(DELIVERY_CONSTRAINTS.applicationAvailability.maxLength),
  message: z
    .string()
    .trim()
    .min(DELIVERY_CONSTRAINTS.applicationMessage.minLength)
    .max(DELIVERY_CONSTRAINTS.applicationMessage.maxLength),
  quote: moneySchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
});
export const deliveryAcceptApplicationInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
});
export const deliveryAssignmentTransitionInputSchema = z.object({
  status: deliveryRequestStatusSchema,
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().max(1_000).optional(),
});

export const deliveryModerationSuspendInputSchema = z.object({
  expectedVersion: z.number().int().positive().optional(),
  reason: z
    .string()
    .trim()
    .min(DELIVERY_CONSTRAINTS.moderationReason.minLength)
    .max(DELIVERY_CONSTRAINTS.moderationReason.maxLength),
});
export const deliverySearchInputSchema = z.object({
  marketCode: marketCodeSchema,
  pickupPostalCode: z.string().trim().max(20).optional(),
  vehicleType: deliveryVehicleTypeSchema.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export const deliveryPublicRequestPageSchema = z.object({
  items: z.array(deliveryPublicRequestSchema),
  nextCursor: z.string().optional(),
});

export const DELIVERY_REQUEST_TRANSITIONS = {
  draft: ["pending_review", "open", "cancelled"],
  pending_review: ["open", "suspended", "cancelled"],
  open: ["assigned", "cancelled", "expired", "suspended"],
  assigned: ["picked_up", "cancelled", "disputed"],
  picked_up: ["in_transit", "cancelled", "disputed"],
  in_transit: ["delivered", "disputed"],
  delivered: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  expired: [],
  suspended: ["open", "cancelled"],
  disputed: ["completed", "cancelled"],
} as const satisfies Record<
  z.infer<typeof deliveryRequestStatusSchema>,
  readonly z.infer<typeof deliveryRequestStatusSchema>[]
>;

export function canTransitionDeliveryRequest(
  from: z.infer<typeof deliveryRequestStatusSchema>,
  to: z.infer<typeof deliveryRequestStatusSchema>,
): boolean {
  return (DELIVERY_REQUEST_TRANSITIONS[from] as readonly string[]).includes(to);
}

export const DELIVERY_PARTICIPANT_TRANSITIONS = {
  requester: {
    draft: ["cancelled"],
    pending_review: ["cancelled"],
    open: ["cancelled"],
    assigned: ["cancelled", "disputed"],
    picked_up: ["cancelled", "disputed"],
    in_transit: ["disputed"],
    delivered: ["completed", "disputed"],
    completed: [],
    cancelled: [],
    expired: [],
    suspended: ["cancelled"],
    disputed: ["completed", "cancelled"],
  },
  courier: {
    draft: [],
    pending_review: [],
    open: [],
    assigned: ["picked_up", "cancelled", "disputed"],
    picked_up: ["in_transit", "cancelled", "disputed"],
    in_transit: ["delivered", "disputed"],
    delivered: ["disputed"],
    completed: [],
    cancelled: [],
    expired: [],
    suspended: [],
    disputed: [],
  },
} as const satisfies Record<
  "requester" | "courier",
  Record<
    z.infer<typeof deliveryRequestStatusSchema>,
    readonly z.infer<typeof deliveryRequestStatusSchema>[]
  >
>;

export function canTransitionDeliveryRequestForParticipant(
  participant: keyof typeof DELIVERY_PARTICIPANT_TRANSITIONS,
  from: z.infer<typeof deliveryRequestStatusSchema>,
  to: z.infer<typeof deliveryRequestStatusSchema>,
): boolean {
  return (
    DELIVERY_PARTICIPANT_TRANSITIONS[participant][from] as readonly string[]
  ).includes(to);
}

export type DeliveryRequestStatus = z.infer<typeof deliveryRequestStatusSchema>;
export type DeliveryApplicationStatus = z.infer<
  typeof deliveryApplicationStatusSchema
>;
export type DeliveryCourierStatus = z.infer<typeof deliveryCourierStatusSchema>;
export type DeliveryCourierEligibilityStatus = z.infer<
  typeof deliveryCourierEligibilityStatusSchema
>;
export type DeliveryVehicleType = z.infer<typeof deliveryVehicleTypeSchema>;
export type DeliveryFeatureAvailability = z.infer<
  typeof deliveryFeatureAvailabilitySchema
>;
export type DeliveryCourierProfile = z.infer<
  typeof deliveryCourierProfileSchema
>;
export type DeliveryCourierProfileInput = z.infer<
  typeof deliveryCourierProfileInputSchema
>;
export type DeliveryRequestDraftInput = z.infer<
  typeof deliveryRequestDraftInputSchema
>;
export type DeliveryPublicRequest = z.infer<typeof deliveryPublicRequestSchema>;
export type DeliveryPrivateRequest = z.infer<
  typeof deliveryPrivateRequestSchema
>;
export type DeliverySelectedCourierAssignment = z.infer<
  typeof deliverySelectedCourierAssignmentSchema
>;
export type DeliveryParticipantPrivateRequest = z.infer<
  typeof deliveryParticipantPrivateRequestSchema
>;
export type DeliveryApplication = z.infer<typeof deliveryApplicationSchema>;
export type DeliveryApplicationInput = z.infer<
  typeof deliveryApplicationInputSchema
>;
export type DeliverySearchInput = z.infer<typeof deliverySearchInputSchema>;
export type DeliveryPublicRequestPage = z.infer<
  typeof deliveryPublicRequestPageSchema
>;
