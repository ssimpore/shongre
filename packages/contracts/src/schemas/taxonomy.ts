import { z } from "zod";

export const taxonomyLevelSchema = z.enum([
  "category",
  "subcategory",
  "type",
  "subtype",
]);

export const taxonomyNodeStatusSchema = z.enum([
  "active",
  "draft",
  "disabled",
  "deprecated",
  "archived",
]);

export const taxonomyAttributeDataTypeSchema = z.enum([
  "select",
  "multi_select",
  "number",
  "text",
  "long_text",
  "boolean",
  "range",
  "year",
  "date",
  "date_time",
  "money",
  "autocomplete",
  "location",
]);

export const taxonomyAttributeFieldRoleSchema = z.enum([
  "required",
  "recommended",
  "optional",
  "computed",
  "system",
]);

export const taxonomyAttributeVisibilitySchema = z.enum([
  "public",
  "seller_only",
  "moderator_only",
]);

export const taxonomyAttributeOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  labels: z.record(z.string(), z.string()).optional(),
});

export const taxonomyAttributeDependencySchema = z.object({
  attributeId: z.string().min(1),
  operator: z.enum(["equals", "in", "not_equals"]),
  value: z.unknown(),
});

export const taxonomyAttributeValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  step: z.number().positive().optional(),
  placeholder: z.string().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  integer: z.boolean().optional(),
});

export const taxonomyAttributeSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  labels: z.record(z.string(), z.string()).optional(),
  helpText: z.string().optional(),
  dataType: taxonomyAttributeDataTypeSchema,
  unit: z.string().optional(),
  fieldRole: taxonomyAttributeFieldRoleSchema.optional(),
  privacy: taxonomyAttributeVisibilitySchema.optional(),
  required: z.boolean().optional(),
  filterable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  sortable: z.boolean().optional(),
  comparable: z.boolean().optional(),
  seoRelevant: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  options: z.array(taxonomyAttributeOptionSchema).optional(),
  displayPrefix: z.string().optional(),
  displayOptionLabels: z.record(z.string(), z.string()).optional(),
  dependencies: z.array(taxonomyAttributeDependencySchema).optional(),
  validation: taxonomyAttributeValidationSchema.optional(),
  publicationGroup: z
    .enum(["general", "specifications", "dimensions", "performance", "legal"])
    .optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

const taxonomyCapabilitiesSchema = z.object({
  canSell: z.boolean(),
  canGive: z.boolean(),
  canExchange: z.boolean(),
  canRent: z.boolean(),
  reservationAllowed: z.boolean(),
  securePaymentAllowed: z.boolean(),
  negotiablePrice: z.boolean(),
  fulfillmentModes: z.array(z.string()),
});

const taxonomyPresentationSchema = z.object({
  cardAttributeIds: z.array(z.string()).optional(),
  detailGroupOrder: z
    .array(z.enum(["general", "specifications", "dimensions", "performance", "legal"]))
    .optional(),
  comparisonAttributeIds: z.array(z.string()).optional(),
  sortOptions: z
    .array(z.enum(["relevance", "recent", "price_asc", "price_desc", "distance"]))
    .optional(),
});

const taxonomyMediaGuidanceSchema = z.object({
  minimumPhotoCount: z.number().int().nonnegative().optional(),
  recommendedViews: z.array(z.string()).optional(),
  maxPhotoCount: z.number().int().positive().optional(),
});

export const taxonomyPrimaryCtaSchema = z.enum([
  "contact_seller",
  "apply",
  "request_quote",
  "request_visit",
  "request_test_drive",
  "request_lesson",
  "check_availability",
  "propose_exchange",
]);

export const taxonomyPublicationStepSchema = z.enum([
  "intent",
  "taxonomy",
  "essential",
  "condition_history",
  "price_compensation",
  "fulfillment_location",
  "media_documents",
  "contact_preferences",
  "preview",
  "standard_or_upgrades",
  "confirmation",
]);

const taxonomyStandardPublicationPolicySchema = z.object({
  enabled: z.boolean(),
  label: z.literal("Publication standard gratuite"),
  eligibleSellerTypes: z.array(z.enum(["individual", "professional"])).min(1),
  durationDays: z.number().int().positive(),
  mediaAllowance: z.number().int().positive(),
  includesMessaging: z.boolean(),
  includesListingManagement: z.boolean(),
  includesStandardStatistics: z.boolean(),
  paidUpgradesOptional: z.literal(true),
});

const taxonomyPublicationConfigurationSchema = z.object({
  steps: z.array(taxonomyPublicationStepSchema).min(1),
  primaryCta: taxonomyPrimaryCtaSchema,
  standardPolicy: taxonomyStandardPublicationPolicySchema,
});

const taxonomyModerationPolicySchema = z.object({
  policyId: z.string().min(1),
  reviewMode: z.enum(["standard", "enhanced", "manual"]),
  prohibitedItemRuleIds: z.array(z.string().min(1)),
  safetyNoticeKeys: z.array(z.string().min(1)),
  sensitiveAttributeIds: z.array(z.string().min(1)),
});

export const taxonomyNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    code: z.string().min(1),
    slug: z.string().min(1),
    parentId: z.string().optional(),
    ancestorIds: z.array(z.string()).optional(),
    level: taxonomyLevelSchema,
    publishable: z.boolean().optional(),
    listingFamily: z.string().optional(),
    verticalType: z
      .enum(["tutoring", "automotive", "real_estate", "employment"])
      .optional(),
    verticalSchemaVersion: z.number().int().positive().optional(),
    supportedIntents: z.array(z.string()).optional(),
    labels: z.record(z.string(), z.string()),
    shortLabels: z.record(z.string(), z.string()).optional(),
    name: z.string().min(1),
    label: z.string().optional(),
    shortLabel: z.string().optional(),
    description: z.string().optional(),
    iconName: z.string().optional(),
    accentColor: z.string().optional(),
    sortOrder: z.number().int(),
    status: taxonomyNodeStatusSchema,
    conditionScheme: z.string().optional(),
    capabilities: taxonomyCapabilitiesSchema.partial().optional(),
    sellerEligibility: z
      .object({
        individualAllowed: z.boolean().optional(),
        proAllowed: z.boolean().optional(),
        proVerificationRequired: z.boolean().optional(),
        proKbisRequired: z.boolean().optional(),
      })
      .optional(),
    attributeIds: z.array(z.string()).optional(),
    attributeOverrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    summaryAttributeIds: z.array(z.string()).optional(),
    filterFacetIds: z.array(z.string()).optional(),
    synonyms: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
    seo: z
      .object({
        metaTitleTemplate: z.string().optional(),
        metaDescriptionTemplate: z.string().optional(),
        canonicalPath: z.string().optional(),
        indexable: z.boolean().optional(),
      })
      .optional(),
    presentation: taxonomyPresentationSchema.optional(),
    mediaGuidance: taxonomyMediaGuidanceSchema.optional(),
    taxonomyVersion: z.number().int().positive().optional(),
    schemaVersion: z.number().int().positive().optional(),
    schemaStatus: z.enum(["draft", "published", "deprecated"]).optional(),
    publication: taxonomyPublicationConfigurationSchema.optional(),
    moderation: taxonomyModerationPolicySchema.optional(),
    children: z.array(taxonomyNodeSchema).optional(),
  }),
);

export const taxonomyTreeSchema = z.array(taxonomyNodeSchema);
export const taxonomyAttributesSchema = z.record(z.string(), z.unknown());

export type TaxonomyLevel = z.infer<typeof taxonomyLevelSchema>;
export type TaxonomyAttribute = z.infer<typeof taxonomyAttributeSchema>;
export type TaxonomyNode = z.infer<typeof taxonomyNodeSchema>;
export type TaxonomyTree = z.infer<typeof taxonomyTreeSchema>;
