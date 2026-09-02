import { z } from "zod";
import { marketCodeSchema } from "./primitives";

export const TAXONOMY_PUBLICATION_CONSTRAINTS = {
  durationDays: { min: 1, max: 365, default: 60, step: 1 },
  mediaAllowance: { min: 1, max: 50, default: 12, step: 1 },
} as const;

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
  "integer",
  "decimal",
  "percent",
  "enum",
  "multi_enum",
  "string",
  "text",
  "long_text",
  "phone",
  "email",
  "url",
  "boolean",
  "range",
  "year",
  "date",
  "date_time",
  "money",
  "media",
  "document",
  "json",
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
    .array(
      z.enum([
        "general",
        "specifications",
        "dimensions",
        "performance",
        "legal",
      ]),
    )
    .optional(),
  comparisonAttributeIds: z.array(z.string()).optional(),
  sortOptions: z
    .array(
      z.enum(["relevance", "recent", "price_asc", "price_desc", "distance"]),
    )
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
  durationDays: z
    .number()
    .int()
    .min(TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.min)
    .max(TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.max),
  mediaAllowance: z
    .number()
    .int()
    .min(TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.min)
    .max(TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.max),
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
    attributeOverrides: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .optional(),
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

export const taxonomyLocalizedLabelsSchema = z
  .record(z.string().min(2), z.string().min(1))
  .refine((labels) => Boolean(labels["fr-FR"]), {
    message: "A French taxonomy label is required.",
  });

export const taxonomyLocalizedShortLabelsSchema = z
  .record(
    z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
    z.string().trim().min(1).max(28),
  )
  .refine((labels) => Boolean(labels["fr-FR"]), {
    message: "A French taxonomy shortLabel is required.",
  });

export const taxonomyV4UiComponentSchema = z.enum([
  "select",
  "number_input",
  "switch",
  "text_input",
  "money_input",
  "checkbox_group",
  "stepper",
  "radio_group",
  "autocomplete",
  "date_picker",
  "segmented_control",
  "textarea",
  "hidden",
  "cascading_select",
  "location_picker",
  "readonly_text",
  "size_grid",
  "media_uploader",
  "document_uploader",
  "tag_input",
  "slider",
  "checkbox",
  "date_range_picker",
  "rich_textarea",
  "hierarchical_select",
  "multiselect",
  "country_select",
  "location_autocomplete",
  "postal_code_input",
  "address_autocomplete",
  "hidden_geo",
  "radius_input",
  "image_uploader",
  "video_uploader",
  "file_uploader",
  "url_input",
  "schedule_editor",
  "business_id_input",
  "year_picker",
  "secure_text_input",
  "computed_readonly",
  "energy_rating",
  "time_picker",
  "structured_textarea",
  "tags_input",
  "evidence_editor",
  "status_badge",
  "document_status",
  "datetime_picker",
  "barcode_input",
]);

export const taxonomyV4MarketStatusSchema = z.enum([
  "active",
  "coming_soon",
  "unavailable",
]);

export const taxonomyV4MarketAvailabilitySchema = z.object({
  marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
  status: taxonomyV4MarketStatusSchema,
  marketplaceEnabled: z.boolean(),
  indexable: z.boolean(),
});

export const taxonomyV4SellerEligibilitySchema = z.object({
  individualAllowed: z.boolean(),
  professionalAllowed: z.boolean(),
});

export const taxonomyV4NodeSchema = z.object({
  id: z.string().min(1),
  sourceKey: z.string().min(1),
  parentId: z.string().min(1).optional(),
  level: z.number().int().min(0).max(2),
  slug: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  shortLabels: taxonomyLocalizedShortLabelsSchema,
  description: z.string().optional(),
  iconName: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  status: taxonomyNodeStatusSchema,
  publishable: z.boolean(),
  sellerEligibility: taxonomyV4SellerEligibilitySchema,
  marketAvailability: z.array(taxonomyV4MarketAvailabilitySchema).length(5),
  seo: z.object({ indexable: z.boolean() }),
});

export const taxonomyV4ListingIntentSchema = z.enum([
  "SELL",
  "WANTED",
  "DONATE",
  "EXCHANGE",
  "RENT_OUT",
  "RENT_SEEK",
  "SERVICE_REQUEST",
  "SERVICE_OFFER",
  "NOTICE",
  "BOOK",
  "COURSE_OFFER",
  "JOB_OFFER",
  "BUSINESS_SALE",
  "JOB_SEEK",
]);

export const taxonomyV4ListingTypeSchema = z.object({
  id: z.string().min(1),
  sourceKey: z.string().min(1),
  categoryId: z.string().min(1),
  verticalId: z.string().min(1),
  publicationFlow: z.string().min(1),
  intent: taxonomyV4ListingIntentSchema,
  intentLabel: taxonomyLocalizedLabelsSchema,
  labels: taxonomyLocalizedLabelsSchema,
  slug: z.string().min(1),
  sellerEligibility: taxonomyV4SellerEligibilitySchema,
  status: z.enum(["active", "disabled"]),
  marketAvailability: z.array(taxonomyV4MarketAvailabilitySchema).length(5),
  seoIndexable: z.boolean(),
});

export const taxonomyV4AttributeSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  dataType: taxonomyAttributeDataTypeSchema,
  sourceDataType: z.enum([
    "select",
    "multi_select",
    "number",
    "long_text",
    "autocomplete",
    "location",
    "year",
    "date_time",
    "integer",
    "decimal",
    "money",
    "percent",
    "enum",
    "enum_multi",
    "string",
    "text",
    "phone",
    "email",
    "url",
    "date",
    "datetime",
    "media",
    "document",
    "boolean",
    "json",
  ]),
  uiComponent: taxonomyV4UiComponentSchema,
  groupId: z.string().min(1),
  scope: z.string().min(1),
  optionSetId: z.string().min(1).optional(),
  cardinality: z.string().optional(),
  unit: z.string().optional(),
  defaultValue: z.string().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    declarativeRules: z.array(z.string()),
  }),
  searchable: z.boolean(),
  filterable: z.boolean(),
  sortable: z.boolean(),
  cardVisible: z.boolean(),
  detailVisible: z.boolean(),
  seoRelevant: z.boolean(),
  sellerEligibility: taxonomyV4SellerEligibilitySchema,
  marketAvailability: z.array(taxonomyV4MarketAvailabilitySchema).length(5),
  defaultRequired: z.boolean(),
  defaultDisplayOrder: z.number().int().nonnegative(),
  privacy: taxonomyAttributeVisibilitySchema,
  immutableAfterPublication: z.boolean(),
  helpText: z.record(z.string(), z.string().optional()),
  placeholder: z.record(z.string(), z.string().optional()),
});

export const taxonomyV4AttributeGroupSchema = z.object({
  id: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  iconName: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  collapsible: z.boolean(),
  public: z.boolean(),
});

export const taxonomyV4OptionSetSchema = z.object({
  id: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
});

export const taxonomyV4OptionSchema = z.object({
  id: z.string().min(1),
  optionSetId: z.string().min(1),
  key: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  sortOrder: z.number().int().nonnegative(),
  active: z.boolean(),
  managedExternally: z.boolean(),
});

export const taxonomyV4OptionParentLinkSchema = z.object({
  optionId: z.string().min(1),
  parentOptionId: z.string().min(1),
});

export const taxonomyV4AttributeBindingSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  listingTypeId: z.string().min(1),
  intent: taxonomyV4ListingIntentSchema,
  attributeId: z.string().min(1),
  groupId: z.string().min(1),
  scope: z.string().min(1),
  sourceLevel: z.string().min(1),
  required: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  publicationVisible: z.boolean(),
  detailVisible: z.boolean(),
  cardVisible: z.boolean(),
  filterable: z.boolean(),
  searchable: z.boolean(),
  sortable: z.boolean(),
  sellerEligibility: taxonomyV4SellerEligibilitySchema,
  overrideDefault: z.string().optional(),
});

export const taxonomyV4FieldReferenceSchema = z.object({
  kind: z.enum(["attribute", "context", "system"]),
  key: z.string().min(1),
});

export const taxonomyV4DependencyRuleSchema = z.object({
  id: z.string().min(1),
  scopes: z.array(z.string().min(1)),
  trigger: taxonomyV4FieldReferenceSchema,
  operator: z.enum([
    "eq",
    "neq",
    "in",
    "is_set",
    "always",
    "changes",
    "in_dataset",
    "gt",
    "older_than",
    "lte",
    "contains",
    "gte",
    "contains_any",
  ]),
  values: z.array(z.string()),
  effect: z.enum([
    "SHOW",
    "HIDE",
    "REQUIRE",
    "FILTER_OPTIONS",
    "CLEAR_VALUE",
    "SET_VALUE",
    "SHOW_NOTICE",
    "OPTIONAL",
  ]),
  targets: z.array(taxonomyV4FieldReferenceSchema).min(1),
  detail: z.string().optional(),
  status: z.literal("draft"),
});

export const taxonomyV4ValidationRuleSchema = z.object({
  id: z.string().min(1),
  target: taxonomyV4FieldReferenceSchema,
  scopes: z.array(z.string().min(1)),
  ruleType: z.string().min(1),
  severity: z.enum(["BLOCK", "WARN", "REVIEW"]),
  messages: taxonomyLocalizedLabelsSchema,
  countries: z.array(z.string().min(1)),
  sellerScopes: z.array(z.string().min(1)),
  enforcement: z.enum(["backend", "backend+frontend"]),
  status: z.literal("draft"),
});

export const taxonomyV4FilterProjectionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  listingTypeId: z.string().min(1),
  attributeId: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  uiComponent: taxonomyV4UiComponentSchema,
  filterType: z.enum(["multi_select", "range", "boolean", "keyword"]),
  optionSetId: z.string().min(1).optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const taxonomyV4CardProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  slot: z.string().min(1),
  field: taxonomyV4FieldReferenceSchema,
  labels: z.record(z.string(), z.string().optional()),
  format: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const taxonomyV4DetailProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  sectionId: z.string().min(1),
  sectionLabels: taxonomyLocalizedLabelsSchema,
  sectionOrder: z.number().int().nonnegative(),
  field: taxonomyV4FieldReferenceSchema,
  labels: taxonomyLocalizedLabelsSchema,
  sortOrder: z.number().int().nonnegative(),
  emphasis: z.string().optional(),
  emptyBehavior: z.string().optional(),
});

export const taxonomyV4PublicationFlowProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  intent: taxonomyV4ListingIntentSchema,
  step: z.number().int().positive(),
  stepId: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  sections: z.array(z.string()),
  requiredFields: z.array(taxonomyV4FieldReferenceSchema),
  condition: z.string().optional(),
  validation: z.string().optional(),
  helpText: z.string().optional(),
  nextStepId: z.string().optional(),
});

export const taxonomyV4SearchProjectionSchema = z.object({
  categoryId: z.string().min(1),
  searchableFields: z.array(z.string().min(1)),
  filterableAttributeIds: z.array(z.string().min(1)),
  sortableAttributeIds: z.array(z.string().min(1)),
  sortOptions: z.array(
    z.enum(["relevance", "recent", "price_asc", "price_desc", "distance"]),
  ),
  defaultSort: z.enum([
    "relevance",
    "recent",
    "price_asc",
    "price_desc",
    "distance",
  ]),
});

export const taxonomyV4SeoProjectionSchema = z.object({
  categoryId: z.string().min(1),
  urlPattern: z.string().min(1),
  locationUrlPattern: z.string().optional(),
  facetUrlPattern: z.string().optional(),
  h1: taxonomyLocalizedLabelsSchema,
  titleTemplate: taxonomyLocalizedLabelsSchema,
  descriptionTemplate: taxonomyLocalizedLabelsSchema,
  indexable: z.boolean(),
  canonicalStrategy: z.string().min(1),
  indexableFacets: z.array(z.string()),
  structuredData: z.array(z.string()),
  sitemap: z.object({ eligible: z.boolean(), policy: z.string().min(1) }),
});

export const taxonomyV4ResolvedPublicationSchema = z.object({
  taxonomyVersion: z.literal("4.0.0"),
  category: taxonomyV4NodeSchema,
  listingType: taxonomyV4ListingTypeSchema,
  attributes: z.array(
    z.object({
      definition: taxonomyV4AttributeSchema,
      binding: taxonomyV4AttributeBindingSchema,
      options: z.array(taxonomyV4OptionSchema),
    }),
  ),
  dependencyRules: z.array(taxonomyV4DependencyRuleSchema),
  validationRules: z.array(taxonomyV4ValidationRuleSchema),
  eligible: z.boolean(),
  ineligibilityCode: z.string().optional(),
});

export const taxonomyV4ResolvedSchemaSchema =
  taxonomyV4ResolvedPublicationSchema.extend({
    locale: z.string().min(2).max(16),
    marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
    projections: z.object({
      filters: z.array(taxonomyV4FilterProjectionSchema),
      cardFields: z.array(taxonomyV4CardProjectionSchema),
      detailFields: z.array(taxonomyV4DetailProjectionSchema),
      publicationFlow: z.array(taxonomyV4PublicationFlowProjectionSchema),
      search: taxonomyV4SearchProjectionSchema.nullable(),
      seo: taxonomyV4SeoProjectionSchema.nullable(),
    }),
  });

export const taxonomyV4TreeResponseSchema = z.object({
  taxonomyVersion: z.literal("4.0.0"),
  compilerVersion: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
  locale: z.string().min(2).max(16),
  items: z.array(taxonomyV4NodeSchema),
  listingTypes: z.array(taxonomyV4ListingTypeSchema),
});

export const taxonomyV4OptionPageSchema = z.object({
  items: z.array(taxonomyV4OptionSchema).max(200),
  nextCursor: z.string().regex(/^\d+$/).optional(),
  total: z.number().int().nonnegative(),
  taxonomyVersion: z.literal("4.0.0"),
});

export const TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS = {
  maxItems: 30,
  changeReason: { minLength: 10, maxLength: 500 },
} as const;

export const taxonomyHeaderCategoryItemSchema = z.object({
  categoryId: z.string().min(1).max(150),
  slug: z.string().min(1).max(180),
  labels: taxonomyLocalizedLabelsSchema,
  shortLabels: taxonomyLocalizedShortLabelsSchema,
  iconName: z.string().min(1).max(100),
  isActive: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
});

export const taxonomyHeaderNavigationConfigurationSchema = z.object({
  marketCode: marketCodeSchema,
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable(),
  items: z
    .array(taxonomyHeaderCategoryItemSchema)
    .max(TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.maxItems),
});

export const taxonomyHeaderCategoryUpdateSchema = z.object({
  categoryId: z.string().min(1).max(150),
  isActive: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
});

export const taxonomyHeaderNavigationUpdateSchema = z
  .object({
    marketCode: marketCodeSchema,
    expectedRevision: z.number().int().nonnegative(),
    changeReason: z
      .string()
      .trim()
      .min(TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.changeReason.minLength)
      .max(TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.changeReason.maxLength),
    items: z
      .array(taxonomyHeaderCategoryUpdateSchema)
      .max(TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.maxItems),
  })
  .superRefine((configuration, context) => {
    const categoryIds = new Set<string>();
    const displayOrders = new Set<number>();

    configuration.items.forEach((item, index) => {
      if (categoryIds.has(item.categoryId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "categoryId"],
          message: "A header category may only be selected once.",
        });
      }
      categoryIds.add(item.categoryId);

      if (displayOrders.has(item.displayOrder)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "displayOrder"],
          message: "Header category display orders must be unique.",
        });
      }
      displayOrders.add(item.displayOrder);
    });
  });

export const taxonomyV4MetadataSchema = z.object({
  taxonomyVersion: z.literal("4.0.0"),
  compilerVersion: z.string().min(1),
  workbookSha256: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pagination: z.object({
    defaultLimit: z.number().int().positive(),
    maxLimit: z.number().int().positive(),
  }),
  sourceCounts: z.object({
    categories: z.number().int().nonnegative(),
    listingTypes: z.number().int().nonnegative(),
    attributes: z.number().int().nonnegative(),
    bindings: z.number().int().nonnegative(),
  }),
});

export const taxonomyV4PublicBundleSchema = z.object({
  metadata: taxonomyV4MetadataSchema,
  categories: z.array(taxonomyV4NodeSchema),
  listingTypes: z.array(taxonomyV4ListingTypeSchema),
  attributes: z.array(taxonomyV4AttributeSchema),
  attributeGroups: z.array(taxonomyV4AttributeGroupSchema),
  optionSets: z.array(taxonomyV4OptionSetSchema),
  options: z.array(taxonomyV4OptionSchema),
  optionParentLinks: z.array(taxonomyV4OptionParentLinkSchema),
  bindings: z.array(taxonomyV4AttributeBindingSchema),
  dependencyRules: z.array(taxonomyV4DependencyRuleSchema),
  validationRules: z.array(taxonomyV4ValidationRuleSchema),
  projections: z.object({
    filters: z.array(taxonomyV4FilterProjectionSchema),
    cardFields: z.array(taxonomyV4CardProjectionSchema),
    detailFields: z.array(taxonomyV4DetailProjectionSchema),
    publicationFlow: z.array(taxonomyV4PublicationFlowProjectionSchema),
    search: z.array(taxonomyV4SearchProjectionSchema),
    seo: z.array(taxonomyV4SeoProjectionSchema),
  }),
  aliases: z.array(
    z.object({
      alias: z.string().min(1),
      canonicalCategoryId: z.string().min(1),
      kind: z.string().min(1),
    }),
  ),
  compatibility: z.object({
    supportedIntentsByCategory: z.record(
      z.string(),
      z.array(taxonomyV4ListingIntentSchema),
    ),
    v3Crosswalk: z.array(
      z.object({
        sourceId: z.string().min(1),
        canonicalId: z.string().min(1),
        disposition: z.string().min(1),
        rationale: z.string().min(1),
      }),
    ),
  }),
});

export type TaxonomyV4Node = z.infer<typeof taxonomyV4NodeSchema>;
export type TaxonomyV4UiComponent = z.infer<typeof taxonomyV4UiComponentSchema>;
export type TaxonomyV4ListingIntent = z.infer<
  typeof taxonomyV4ListingIntentSchema
>;
export type TaxonomyV4ListingType = z.infer<typeof taxonomyV4ListingTypeSchema>;
export type TaxonomyV4Attribute = z.infer<typeof taxonomyV4AttributeSchema>;
export type TaxonomyV4AttributeBinding = z.infer<
  typeof taxonomyV4AttributeBindingSchema
>;
export type TaxonomyV4DependencyRule = z.infer<
  typeof taxonomyV4DependencyRuleSchema
>;
export type TaxonomyV4ValidationRule = z.infer<
  typeof taxonomyV4ValidationRuleSchema
>;
export type TaxonomyV4ResolvedPublication = z.infer<
  typeof taxonomyV4ResolvedPublicationSchema
>;
export type TaxonomyV4ResolvedSchema = z.infer<
  typeof taxonomyV4ResolvedSchemaSchema
>;
export type TaxonomyV4TreeResponse = z.infer<
  typeof taxonomyV4TreeResponseSchema
>;
export type TaxonomyV4OptionPage = z.infer<typeof taxonomyV4OptionPageSchema>;
export type TaxonomyHeaderCategoryItem = z.infer<
  typeof taxonomyHeaderCategoryItemSchema
>;
export type TaxonomyHeaderNavigationConfiguration = z.infer<
  typeof taxonomyHeaderNavigationConfigurationSchema
>;
export type TaxonomyHeaderNavigationUpdate = z.infer<
  typeof taxonomyHeaderNavigationUpdateSchema
>;
export type TaxonomyV4PublicBundle = z.infer<
  typeof taxonomyV4PublicBundleSchema
>;
