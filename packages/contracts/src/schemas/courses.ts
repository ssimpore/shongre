import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

export const COURSE_CONSTRAINTS = {
  learnerObjective: { minLength: 10, maxLength: 600 },
  learnerContext: { maxLength: 3_000 },
  serviceRadiusKm: { min: 0, max: 250 },
  learnerRequestDefaultRadiusKm: 15,
  tutorExperienceYears: { min: 0, max: 70 },
  tutorDisplayName: { minLength: 2 },
  tutorOrganizationName: { minLength: 2 },
  tutorCity: { minLength: 2 },
  tutorHeadline: { minLength: 10 },
  tutorBiography: { minLength: 60 },
  tutorTeachingApproach: { minLength: 30 },
  tutorAvailability: { minItems: 1 },
  hourlyPriceMinor: { min: 1_000 },
  budgetMajor: { min: 0, step: 1 },
  priceMajorStep: 1,
  minorUnitsPerMajor: 100,
  validity: { min: 1 },
} as const;

/**
 * Public, versioned contract for the tutoring vertical.
 *
 * The contract deliberately describes product concepts rather than database
 * rows.  Web, mobile and future API consumers can keep using it if the
 * persistence model changes.
 */
export const courseVerticalSchema = z.literal("tutoring");
export type CourseVertical = z.infer<typeof courseVerticalSchema>;

export const courseSchemaVersionSchema = z.number().int().positive();
export const deliveryModeSchema = z.enum(["online", "in_person", "hybrid"]);
export type DeliveryMode = z.infer<typeof deliveryModeSchema>;

export const verificationStatusSchema = z.enum([
  "not_submitted",
  "pending",
  "verified",
  "rejected",
  "expired",
]);
export type CourseVerificationStatus = z.infer<typeof verificationStatusSchema>;

export const evidenceStatusSchema = z.enum([
  "self_declared",
  "uploaded_private",
  "provider_verified",
  "shongre_verified",
]);
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;

export const courseFeatureFlagsSchema = z.object({
  learnerRequestsEnabled: z.boolean(),
  qualifiedLeadsEnabled: z.boolean(),
  bookingEnabled: z.boolean(),
  paymentsEnabled: z.boolean(),
  payoutsEnabled: z.boolean(),
  packagesEnabled: z.boolean(),
  recurringLessonsEnabled: z.boolean(),
});
export type CourseFeatureFlags = z.infer<typeof courseFeatureFlagsSchema>;

export const courseEntitlementsSchema = z.object({
  maxActiveOffers: z.number().int().nonnegative(),
  maxMonthlyLeads: z.number().int().nonnegative(),
  teamMembers: z.number().int().nonnegative(),
  locations: z.number().int().nonnegative(),
  visibilityCreditsMonthly: z.number().int().nonnegative(),
  featuredProfile: z.boolean(),
  priorityPlacement: z.boolean(),
  advancedAvailability: z.boolean(),
  detailedAnalytics: z.boolean(),
  profileMedia: z.boolean(),
  introVideo: z.boolean(),
  leadManagement: z.boolean(),
  bookingTools: z.boolean(),
  recurringPackages: z.boolean(),
  bulkCourseManagement: z.boolean(),
  centralLeadInbox: z.boolean(),
});
export type CourseEntitlements = z.infer<typeof courseEntitlementsSchema>;

export const coursePlanSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  name: z.string().min(1),
  audience: z.enum(["individual", "organization"]),
  description: z.string(),
  monthlyPrice: moneySchema.optional(),
  annualPrice: moneySchema.optional(),
  taxRateBps: z.number().int().nonnegative(),
  isActive: z.boolean(),
  isRecommended: z.boolean(),
  entitlements: courseEntitlementsSchema,
});
export type CoursePlan = z.infer<typeof coursePlanSchema>;

export const courseAddOnSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  type: z.enum([
    "featured_subject",
    "local_spotlight",
    "search_bump",
    "qualified_lead",
    "profile_verification",
    "promotional_credits",
  ]),
  name: z.string(),
  price: moneySchema,
  validityDays: z.number().int().positive().optional(),
  creditQuantity: z.number().int().positive().optional(),
  isActive: z.boolean(),
});
export type CourseAddOn = z.infer<typeof courseAddOnSchema>;

export const courseSubjectLevelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type CourseSubjectLevel = z.infer<typeof courseSubjectLevelSchema>;

export const courseSubjectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  marketCode: marketCodeSchema,
  parentId: z.string().optional(),
  label: z.string().min(1),
  description: z.string().optional(),
  iconName: z.string().optional(),
  levelIds: z.array(z.string()),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type CourseSubject = z.infer<typeof courseSubjectSchema>;

export const courseServiceAreaSchema = z.object({
  marketCode: marketCodeSchema,
  cityLabel: z.string(),
  postalCodePrefix: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z
    .number()
    .min(COURSE_CONSTRAINTS.serviceRadiusKm.min)
    .max(COURSE_CONSTRAINTS.serviceRadiusKm.max),
  publicLocationLabel: z.string(),
});
export type CourseServiceArea = z.infer<typeof courseServiceAreaSchema>;

export const courseAvailabilityRuleSchema = z.object({
  id: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startsAtLocal: z.string().regex(/^\d{2}:\d{2}$/),
  endsAtLocal: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  deliveryModes: z.array(deliveryModeSchema).min(1),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
});
export type CourseAvailabilityRule = z.infer<
  typeof courseAvailabilityRuleSchema
>;

export const courseAvailabilityExceptionSchema = z.object({
  id: z.string().min(1),
  startsAt: z.string(),
  endsAt: z.string(),
  isAvailable: z.boolean(),
  reason: z.string().optional(),
});
export type CourseAvailabilityException = z.infer<
  typeof courseAvailabilityExceptionSchema
>;

export const coursePricingOptionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["hourly", "trial", "package"]),
  label: z.string(),
  price: moneySchema,
  durationMinutes: z.number().int().positive(),
  lessonCount: z.number().int().positive().optional(),
  isActive: z.boolean(),
});
export type CoursePricingOption = z.infer<typeof coursePricingOptionSchema>;

export const tutorQualificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "degree",
    "certification",
    "employment",
    "identity",
    "criminal_record",
    "professional_status",
    "other",
  ]),
  label: z.string(),
  issuer: z.string().optional(),
  issuedYear: z.number().int().min(1900).max(2200).optional(),
  evidenceStatus: evidenceStatusSchema,
  verificationStatus: verificationStatusSchema,
  verifiedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  publicLabel: z.string(),
  publicDetailsAllowed: z.boolean(),
});
export type TutorQualification = z.infer<typeof tutorQualificationSchema>;

export const tutorVerificationDimensionsSchema = z.object({
  email: verificationStatusSchema,
  phone: verificationStatusSchema,
  identity: verificationStatusSchema,
  qualifications: verificationStatusSchema,
  business: verificationStatusSchema,
  representative: verificationStatusSchema,
  payment: verificationStatusSchema,
  payout: verificationStatusSchema,
  personalServicesEligibility: verificationStatusSchema,
});
export type TutorVerificationDimensions = z.infer<
  typeof tutorVerificationDimensionsSchema
>;

export const tutorProfileSchema = z.object({
  id: z.string().min(1),
  schemaVersion: courseSchemaVersionSchema,
  vertical: courseVerticalSchema,
  userId: z.string().min(1),
  organizationId: z.string().optional(),
  profileType: z.enum(["individual", "organization_member"]),
  slug: z.string().min(1),
  displayName: z.string().min(COURSE_CONSTRAINTS.tutorDisplayName.minLength),
  avatarUrl: z.string().url().optional(),
  headline: z.string().min(COURSE_CONSTRAINTS.tutorHeadline.minLength),
  biography: z.string().min(COURSE_CONSTRAINTS.tutorBiography.minLength),
  teachingApproach: z
    .string()
    .min(COURSE_CONSTRAINTS.tutorTeachingApproach.minLength),
  experienceYears: z
    .number()
    .int()
    .min(COURSE_CONSTRAINTS.tutorExperienceYears.min)
    .max(COURSE_CONSTRAINTS.tutorExperienceYears.max),
  subjectIds: z.array(z.string()),
  levelIds: z.array(z.string()),
  languages: z.array(z.string()),
  deliveryModes: z.array(deliveryModeSchema).min(1),
  serviceArea: courseServiceAreaSchema.optional(),
  availabilityRules: z.array(courseAvailabilityRuleSchema),
  availabilityExceptions: z.array(courseAvailabilityExceptionSchema),
  responseTimeMinutes: z.number().int().nonnegative().optional(),
  responseRatePercent: z.number().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative(),
  ratingIsStatisticallyMeaningful: z.boolean(),
  mediaUrls: z.array(z.string().url()),
  introductionVideoUrl: z.string().url().optional(),
  qualifications: z.array(tutorQualificationSchema),
  verifications: tutorVerificationDimensionsSchema,
  taxEligibility: z.object({
    status: verificationStatusSchema,
    publicWording: z.string(),
    evidenceExpiresAt: z.string().optional(),
  }),
  planId: z.string(),
  moderationStatus: z.enum([
    "draft",
    "pending_review",
    "approved",
    "rejected",
    "suspended",
  ]),
  profileCompletionPercent: z.number().int().min(0).max(100),
  isFeatured: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TutorProfile = z.infer<typeof tutorProfileSchema>;

export const tutorPublicProfileSchema = tutorProfileSchema.omit({
  userId: true,
  availabilityRules: true,
  availabilityExceptions: true,
  planId: true,
  moderationStatus: true,
  profileCompletionPercent: true,
  createdAt: true,
  updatedAt: true,
});
export type TutorPublicProfile = z.infer<typeof tutorPublicProfileSchema>;

export const courseOfferSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().optional(),
  tutorProfileId: z.string().min(1),
  organizationId: z.string().optional(),
  schemaVersion: courseSchemaVersionSchema,
  vertical: courseVerticalSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  subjectId: z.string().min(1),
  levelIds: z.array(z.string()).min(1),
  goalIds: z.array(z.string()),
  languages: z.array(z.string()).min(1),
  deliveryModes: z.array(deliveryModeSchema).min(1),
  serviceArea: courseServiceAreaSchema.optional(),
  pricingOptions: z.array(coursePricingOptionSchema).min(1),
  availabilitySummary: z.string(),
  trialLessonAvailable: z.boolean(),
  status: z.enum([
    "draft",
    "pending_review",
    "published",
    "paused",
    "suspended",
    "archived",
  ]),
  moderationReason: z.string().optional(),
  marketCodes: z.array(marketCodeSchema).min(1),
  capacityStatus: z.enum(["available", "limited", "full"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type CourseOffer = z.infer<typeof courseOfferSchema>;

export const coursePublicOfferSchema = courseOfferSchema.omit({
  moderationReason: true,
});
export type CoursePublicOffer = z.infer<typeof coursePublicOfferSchema>;

export const tutorSearchQuerySchema = z.object({
  marketCode: marketCodeSchema,
  query: z.string().optional(),
  subjectId: z.string().optional(),
  levelIds: z.array(z.string()).optional(),
  goalId: z.string().optional(),
  city: z.string().optional(),
  radiusKm: z
    .number()
    .min(COURSE_CONSTRAINTS.serviceRadiusKm.min)
    .max(COURSE_CONSTRAINTS.serviceRadiusKm.max)
    .optional(),
  deliveryModes: z.array(deliveryModeSchema).optional(),
  minPriceMinor: z.number().int().nonnegative().optional(),
  maxPriceMinor: z.number().int().nonnegative().optional(),
  availability: z.array(z.enum(["weekday", "evening", "weekend"])).optional(),
  languages: z.array(z.string()).optional(),
  tutorType: z.enum(["all", "individual", "organization"]).optional(),
  verifiedOnly: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "rating", "response_time"])
    .optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});
export type TutorSearchQuery = z.infer<typeof tutorSearchQuerySchema>;

export const tutorSearchItemSchema = z.object({
  tutor: tutorPublicProfileSchema,
  offer: coursePublicOfferSchema,
  subjectLabel: z.string(),
  levelLabels: z.array(z.string()),
  fromPrice: moneySchema,
  distanceKm: z.number().nonnegative().optional(),
  relevanceReasons: z.array(z.string()),
  isSaved: z.boolean(),
});
export type TutorSearchItem = z.infer<typeof tutorSearchItemSchema>;

export const tutorSearchResponseSchema = z.object({
  items: z.array(tutorSearchItemSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
  total: z.number().int().nonnegative(),
});
export type TutorSearchResponse = z.infer<typeof tutorSearchResponseSchema>;

export const guardianContactSchema = z.object({
  guardianUserId: z.string().optional(),
  guardianName: z.string().min(1),
  relationship: z.string().min(1),
  consentConfirmedAt: z.string(),
});
export type GuardianContact = z.infer<typeof guardianContactSchema>;

export const learnerRequestSchema = z.object({
  id: z.string().min(1),
  requesterUserId: z.string().optional(),
  marketCode: marketCodeSchema,
  subjectId: z.string().min(1),
  levelId: z.string().min(1),
  objective: z
    .string()
    .min(COURSE_CONSTRAINTS.learnerObjective.minLength)
    .max(COURSE_CONSTRAINTS.learnerObjective.maxLength),
  preferredSchedule: z.array(z.string()).min(1),
  deliveryModes: z.array(deliveryModeSchema).min(1),
  city: z.string().optional(),
  radiusKm: z
    .number()
    .min(COURSE_CONSTRAINTS.serviceRadiusKm.min)
    .max(COURSE_CONSTRAINTS.serviceRadiusKm.max)
    .optional(),
  budgetMin: moneySchema.optional(),
  budgetMax: moneySchema.optional(),
  desiredStartDate: z.string(),
  context: z.string().max(COURSE_CONSTRAINTS.learnerContext.maxLength),
  learnerAgeBand: z.enum(["under_13", "13_15", "16_17", "adult"]),
  guardianContact: guardianContactSchema.optional(),
  status: z.enum(["draft", "submitted", "matched", "closed", "expired"]),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type LearnerRequest = z.infer<typeof learnerRequestSchema>;

export const courseLeadSchema = z.object({
  id: z.string().min(1),
  learnerRequestId: z.string().min(1),
  tutorProfileId: z.string().min(1),
  organizationId: z.string().optional(),
  state: z.enum([
    "offered",
    "viewed",
    "accepted",
    "declined",
    "contact_released",
    "converted",
    "expired",
    "invalid_disputed",
    "invalid_confirmed",
  ]),
  relevanceScore: z.number().min(0).max(1),
  relevanceReasons: z.array(z.string()),
  contactReleaseStatus: z.enum(["withheld", "released", "revoked"]),
  creditCost: z.number().int().nonnegative(),
  creditRestoredAt: z.string().optional(),
  declineReason: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  respondedAt: z.string().optional(),
});
export type CourseLead = z.infer<typeof courseLeadSchema>;

export const courseBookingSchema = z.object({
  id: z.string().min(1),
  learnerUserId: z.string().min(1),
  tutorProfileId: z.string().min(1),
  courseOfferId: z.string().min(1),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string(),
  deliveryMode: deliveryModeSchema,
  status: z.enum([
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
    "disputed",
    "refunded",
  ]),
  paymentStatus: z.enum([
    "not_required",
    "requires_action",
    "authorized",
    "captured",
    "cancelled",
    "partially_refunded",
    "refunded",
    "failed",
  ]),
  price: moneySchema,
  platformCommission: moneySchema,
  providerPaymentReference: z.string().optional(),
  payoutStatus: z.enum([
    "not_applicable",
    "pending",
    "eligible",
    "paid",
    "held",
    "failed",
  ]),
  providerPayoutReference: z.string().optional(),
  cancellationPolicyVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CourseBooking = z.infer<typeof courseBookingSchema>;

export const lessonSessionSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  packageId: z.string().optional(),
  sequence: z.number().int().positive(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum([
    "scheduled",
    "completed",
    "cancelled",
    "no_show",
    "disputed",
  ]),
  attendanceVerifiedAt: z.string().optional(),
});
export type LessonSession = z.infer<typeof lessonSessionSchema>;

export const lessonPackageSchema = z.object({
  id: z.string().min(1),
  courseOfferId: z.string().min(1),
  tutorProfileId: z.string().min(1),
  name: z.string(),
  lessonCount: z.number().int().positive(),
  lessonDurationMinutes: z.number().int().positive(),
  price: moneySchema,
  remainingLessons: z.number().int().nonnegative(),
  expiresAt: z.string().optional(),
  recurring: z.boolean(),
  status: z.enum(["draft", "active", "exhausted", "expired", "cancelled"]),
});
export type LessonPackage = z.infer<typeof lessonPackageSchema>;

export const courseOrganizationMemberSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  tutorProfileId: z.string().optional(),
  displayName: z.string(),
  role: z.enum([
    "owner",
    "admin",
    "manager",
    "tutor",
    "lead_coordinator",
    "billing",
  ]),
  permissions: z.array(z.string()),
  status: z.enum(["invited", "active", "suspended", "removed"]),
});
export type CourseOrganizationMember = z.infer<
  typeof courseOrganizationMemberSchema
>;

export const courseOrganizationSchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  slug: z.string().min(1),
  legalName: z.string(),
  publicName: z.string(),
  description: z.string(),
  verificationStatus: verificationStatusSchema,
  locationLabels: z.array(z.string()),
  memberCount: z.number().int().nonnegative(),
  activeOfferCount: z.number().int().nonnegative(),
  planId: z.string(),
  createdAt: z.string(),
});
export type CourseOrganization = z.infer<typeof courseOrganizationSchema>;

export const courseOrganizationWorkspaceSchema = z.object({
  organization: courseOrganizationSchema,
  members: z.array(courseOrganizationMemberSchema),
  plan: coursePlanSchema,
  featureFlags: courseFeatureFlagsSchema,
  locations: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      isActive: z.boolean(),
      activeTutorCount: z.number().int().nonnegative(),
    }),
  ),
  analytics: z.object({
    period: z.string(),
    profileViews: z.number().int().nonnegative(),
    leadsReceived: z.number().int().nonnegative(),
    leadsAccepted: z.number().int().nonnegative(),
    activeTutors: z.number().int().nonnegative(),
  }),
});
export type CourseOrganizationWorkspace = z.infer<
  typeof courseOrganizationWorkspaceSchema
>;

export const tutorWorkspaceSchema = z.object({
  tutor: tutorProfileSchema,
  offers: z.array(courseOfferSchema),
  leads: z.array(courseLeadSchema),
  learnerRequests: z.array(learnerRequestSchema),
  plan: coursePlanSchema,
  creditsRemaining: z.number().int().nonnegative(),
  analytics: z.object({
    period: z.string(),
    profileViews: z.number().int().nonnegative(),
    requestsReceived: z.number().int().nonnegative(),
    acceptedLeads: z.number().int().nonnegative(),
    medianResponseMinutes: z.number().int().nonnegative().optional(),
    contactConversionRate: z.number().min(0).max(1).optional(),
  }),
  featureFlags: courseFeatureFlagsSchema,
});
export type TutorWorkspace = z.infer<typeof tutorWorkspaceSchema>;

export const courseMarketConfigSchema = z.object({
  vertical: courseVerticalSchema,
  schemaVersion: courseSchemaVersionSchema,
  marketCode: marketCodeSchema,
  locale: z.string(),
  currency: z.string().length(3),
  timezone: z.string(),
  isEnabled: z.boolean(),
  minimumMeaningfulReviewCount: z.number().int().nonnegative(),
  minorAgeThreshold: z.number().int().positive(),
  learnerRequestValidityDays: z.number().int().positive(),
  leadValidityHours: z.number().int().positive(),
  defaultLeadCreditCost: z.number().int().nonnegative(),
  cancellationWindowHours: z.number().int().nonnegative(),
  featureFlags: courseFeatureFlagsSchema,
  taxEligibilityWording: z.string(),
  safetyGuidance: z.array(z.string()),
  updatedAt: z.string(),
});
export type CourseMarketConfig = z.infer<typeof courseMarketConfigSchema>;

export const courseCatalogSchema = z.object({
  config: courseMarketConfigSchema,
  subjects: z.array(courseSubjectSchema),
  levels: z.array(courseSubjectLevelSchema),
  plans: z.array(coursePlanSchema),
  addOns: z.array(courseAddOnSchema),
});
export type CourseCatalog = z.infer<typeof courseCatalogSchema>;
