import { z } from "zod";
import { listingCharacteristicIconSchema } from "./listings";
import { marketCodeSchema } from "./primitives";

export const TAXONOMY_ADMIN_CONSTRAINTS = {
  changeReason: { min: 3, max: 1000 },
  updateBatchSize: 200,
} as const;

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

export const taxonomyAttributeVisibilitySchema = z.enum([
  "public",
  "seller_only",
  "moderator_only",
  "private",
]);

export type TaxonomyAttribute =
  import("../generated/openapi").components["schemas"]["TaxonomyV1FilterAttribute"];

export const taxonomyLocalizedLabelsSchema = z
  .record(z.string().min(2), z.string().min(1))
  .refine((labels) => Boolean(labels["fr-FR"]), {
    message: "A French taxonomy label is required.",
  });

export const TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS = {
  maxItems: 30,
  shortLabelMaxLength: 28,
  changeReason: { minLength: 10, maxLength: 500 },
} as const;

export const taxonomyLocalizedShortLabelsSchema = z
  .record(
    z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
    z
      .string()
      .trim()
      .min(1)
      .max(TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.shortLabelMaxLength),
  )
  .refine((labels) => Boolean(labels["fr-FR"]), {
    message: "A French taxonomy shortLabel is required.",
  });

export const taxonomyV1UiComponentSchema = z.enum([
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
  "address_input",
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

export const taxonomyV1MarketStatusSchema = z.enum([
  "active",
  "coming_soon",
  "unavailable",
]);

export const taxonomyV1MarketAvailabilitySchema = z.object({
  marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
  status: taxonomyV1MarketStatusSchema,
  marketplaceEnabled: z.boolean(),
  indexable: z.boolean(),
});

export const taxonomyV1SellerEligibilitySchema = z.object({
  individualAllowed: z.boolean(),
  professionalAllowed: z.boolean(),
});

export const taxonomyV1NodeSchema = z.object({
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
  sellerEligibility: taxonomyV1SellerEligibilitySchema,
  marketAvailability: z.array(taxonomyV1MarketAvailabilitySchema).length(5),
  seo: z.object({ indexable: z.boolean() }),
});

export const taxonomyV1ListingIntentSchema = z.enum([
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

export const taxonomyV1ListingTypeSchema = z.object({
  id: z.string().min(1),
  sourceKey: z.string().min(1),
  categoryId: z.string().min(1),
  verticalId: z.string().min(1),
  publicationFlow: z.string().min(1),
  intent: taxonomyV1ListingIntentSchema,
  intentLabel: taxonomyLocalizedLabelsSchema,
  labels: taxonomyLocalizedLabelsSchema,
  slug: z.string().min(1),
  sellerEligibility: taxonomyV1SellerEligibilitySchema,
  status: z.enum(["active", "disabled"]),
  marketAvailability: z.array(taxonomyV1MarketAvailabilitySchema).length(5),
  seoIndexable: z.boolean(),
});

export const taxonomyV1AttributeSchema = z.object({
  iconName: listingCharacteristicIconSchema.optional(),
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
  uiComponent: taxonomyV1UiComponentSchema,
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
  sellerEligibility: taxonomyV1SellerEligibilitySchema,
  marketAvailability: z.array(taxonomyV1MarketAvailabilitySchema).length(5),
  defaultRequired: z.boolean(),
  defaultDisplayOrder: z.number().int().nonnegative(),
  privacy: taxonomyAttributeVisibilitySchema,
  immutableAfterPublication: z.boolean(),
  helpText: z.record(z.string(), z.string().optional()),
  placeholder: z.record(z.string(), z.string().optional()),
});

export const taxonomyV1AttributeGroupSchema = z.object({
  id: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  iconName: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  collapsible: z.boolean(),
  public: z.boolean(),
});

export const taxonomyV1OptionSetSchema = z.object({
  id: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
});

export const taxonomyV1OptionSchema = z.object({
  id: z.string().min(1),
  optionSetId: z.string().min(1),
  key: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  sortOrder: z.number().int().nonnegative(),
  active: z.boolean(),
  managedExternally: z.boolean(),
});

export const taxonomyV1OptionParentLinkSchema = z.object({
  optionId: z.string().min(1),
  parentOptionId: z.string().min(1),
});

export const taxonomyV1OptionSetsSchema = z.object({
  revision: z.number().int().positive(),
  optionSets: z.record(z.array(taxonomyV1OptionSchema)),
});

export const taxonomyV1AttributeBindingSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  listingTypeId: z.string().min(1),
  intent: taxonomyV1ListingIntentSchema,
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
  sellerEligibility: taxonomyV1SellerEligibilitySchema,
  overrideDefault: z.string().optional(),
});

export const taxonomyV1FieldReferenceSchema = z.object({
  kind: z.enum(["attribute", "context", "system"]),
  key: z.string().min(1),
});

export const taxonomyV1DependencyRuleSchema = z.object({
  id: z.string().min(1),
  scopes: z.array(z.string().min(1)),
  trigger: taxonomyV1FieldReferenceSchema,
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
  targets: z.array(taxonomyV1FieldReferenceSchema).min(1),
  detail: z.string().optional(),
  status: z.literal("draft"),
});

export const taxonomyV1ValidationRuleSchema = z.object({
  id: z.string().min(1),
  target: taxonomyV1FieldReferenceSchema,
  scopes: z.array(z.string().min(1)),
  ruleType: z.string().min(1),
  severity: z.enum(["BLOCK", "WARN", "REVIEW"]),
  messages: taxonomyLocalizedLabelsSchema,
  countries: z.array(z.string().min(1)),
  sellerScopes: z.array(z.string().min(1)),
  enforcement: z.enum(["backend", "backend+frontend"]),
  status: z.literal("draft"),
});

export const taxonomyV1FilterProjectionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  listingTypeId: z.string().min(1),
  attributeId: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  uiComponent: taxonomyV1UiComponentSchema,
  filterType: z.enum(["multi_select", "range", "boolean", "keyword"]),
  optionSetId: z.string().min(1).optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const taxonomyV1CardProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  slot: z.string().min(1),
  field: taxonomyV1FieldReferenceSchema,
  labels: z.record(z.string(), z.string().optional()),
  format: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const taxonomyV1DetailProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  sectionId: z.string().min(1),
  sectionLabels: taxonomyLocalizedLabelsSchema,
  sectionOrder: z.number().int().nonnegative(),
  field: taxonomyV1FieldReferenceSchema,
  labels: taxonomyLocalizedLabelsSchema,
  sortOrder: z.number().int().nonnegative(),
  emphasis: z.string().optional(),
  emptyBehavior: z.string().optional(),
});

export const taxonomyV1PublicationFlowProjectionSchema = z.object({
  listingTypeId: z.string().min(1),
  categoryId: z.string().min(1),
  intent: taxonomyV1ListingIntentSchema,
  step: z.number().int().positive(),
  stepId: z.string().min(1),
  labels: taxonomyLocalizedLabelsSchema,
  sections: z.array(z.string()),
  requiredFields: z.array(taxonomyV1FieldReferenceSchema),
  condition: z.string().optional(),
  validation: z.string().optional(),
  helpText: z.string().optional(),
  nextStepId: z.string().optional(),
});

export const taxonomyV1SearchProjectionSchema = z.object({
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

export const taxonomyV1SeoProjectionSchema = z.object({
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

export const taxonomyV1ResolvedPublicationSchema = z.object({
  revision: z.number().int().positive().optional(),
  taxonomyVersion: z.literal("v1"),
  category: taxonomyV1NodeSchema,
  listingType: taxonomyV1ListingTypeSchema,
  attributes: z.array(
    z.object({
      definition: taxonomyV1AttributeSchema,
      binding: taxonomyV1AttributeBindingSchema,
      options: z.array(taxonomyV1OptionSchema),
    }),
  ),
  dependencyRules: z.array(taxonomyV1DependencyRuleSchema),
  validationRules: z.array(taxonomyV1ValidationRuleSchema),
  eligible: z.boolean(),
  ineligibilityCode: z.string().optional(),
});

export const taxonomyV1ResolvedSchemaSchema =
  taxonomyV1ResolvedPublicationSchema.extend({
    locale: z.string().min(2).max(16),
    marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
    projections: z.object({
      filters: z.array(taxonomyV1FilterProjectionSchema),
      cardFields: z.array(taxonomyV1CardProjectionSchema),
      detailFields: z.array(taxonomyV1DetailProjectionSchema),
      publicationFlow: z.array(taxonomyV1PublicationFlowProjectionSchema),
      search: taxonomyV1SearchProjectionSchema.nullable(),
      seo: taxonomyV1SeoProjectionSchema.nullable(),
    }),
  });

export const taxonomyV1TreeResponseSchema = z.object({
  revision: z.number().int().positive().optional(),
  aliases: z
    .array(
      z.object({
        alias: z.string(),
        canonicalCategoryId: z.string(),
        kind: z.string(),
      }),
    )
    .optional(),
  seo: z.array(taxonomyV1SeoProjectionSchema).optional(),
  taxonomyVersion: z.literal("v1"),
  compilerVersion: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  marketCode: z.enum(["FR", "BE", "CH", "SN", "BF"]),
  locale: z.string().min(2).max(16),
  items: z.array(taxonomyV1NodeSchema),
  listingTypes: z.array(taxonomyV1ListingTypeSchema),
});

export const taxonomyV1OptionPageSchema = z.object({
  revision: z.number().int().positive().optional(),
  items: z.array(taxonomyV1OptionSchema).max(200),
  nextCursor: z.string().regex(/^\d+$/).optional(),
  total: z.number().int().nonnegative(),
  taxonomyVersion: z.literal("v1"),
});

export const taxonomyHeaderCategoryItemSchema = z.object({
  categoryId: z.string().min(1).max(150),
  slug: z.string().min(1).max(180),
  labels: taxonomyLocalizedLabelsSchema,
  shortLabels: taxonomyLocalizedShortLabelsSchema,
  iconName: z.string().min(1).max(100),
  isActive: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
});

export const taxonomyHeaderNavigationLinkSchema = z.object({
  target: z.enum(["category_overview", "promotions"]),
  labels: taxonomyLocalizedLabelsSchema,
  shortLabels: taxonomyLocalizedShortLabelsSchema,
  isActive: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
});

export const taxonomyHeaderNavigationConfigurationSchema = z.object({
  marketCode: marketCodeSchema,
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable(),
  links: z.array(taxonomyHeaderNavigationLinkSchema).max(2).optional(),
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
    links: z.array(taxonomyHeaderNavigationLinkSchema).max(2).optional(),
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
    const targets = new Set<string>();
    configuration.links?.forEach((link, index) => {
      if (targets.has(link.target)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["links", index, "target"],
          message: "A header destination may only be selected once.",
        });
      }
      targets.add(link.target);
      if (displayOrders.has(link.displayOrder)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["links", index, "displayOrder"],
          message:
            "Header display orders must be unique across categories and links.",
        });
      }
      displayOrders.add(link.displayOrder);
    });
  });

export const taxonomyV1MetadataSchema = z.object({
  taxonomyVersion: z.literal("v1"),
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

export const taxonomyV1PublicBundleSchema = z.object({
  metadata: taxonomyV1MetadataSchema,
  categories: z.array(taxonomyV1NodeSchema),
  listingTypes: z.array(taxonomyV1ListingTypeSchema),
  attributes: z.array(taxonomyV1AttributeSchema),
  attributeGroups: z.array(taxonomyV1AttributeGroupSchema),
  optionSets: z.array(taxonomyV1OptionSetSchema),
  options: z.array(taxonomyV1OptionSchema),
  optionParentLinks: z.array(taxonomyV1OptionParentLinkSchema),
  bindings: z.array(taxonomyV1AttributeBindingSchema),
  dependencyRules: z.array(taxonomyV1DependencyRuleSchema),
  validationRules: z.array(taxonomyV1ValidationRuleSchema),
  projections: z.object({
    filters: z.array(taxonomyV1FilterProjectionSchema),
    cardFields: z.array(taxonomyV1CardProjectionSchema),
    detailFields: z.array(taxonomyV1DetailProjectionSchema),
    publicationFlow: z.array(taxonomyV1PublicationFlowProjectionSchema),
    search: z.array(taxonomyV1SearchProjectionSchema),
    seo: z.array(taxonomyV1SeoProjectionSchema),
  }),
  aliases: z.array(
    z.object({
      alias: z.string().min(1),
      canonicalCategoryId: z.string().min(1),
      kind: z.string().min(1),
    }),
  ),
});

export type TaxonomyV1Node = z.infer<typeof taxonomyV1NodeSchema>;
export type TaxonomyV1UiComponent = z.infer<typeof taxonomyV1UiComponentSchema>;
export type TaxonomyV1ListingIntent = z.infer<
  typeof taxonomyV1ListingIntentSchema
>;
export type TaxonomyV1ListingType = z.infer<typeof taxonomyV1ListingTypeSchema>;
export type TaxonomyV1Attribute = z.infer<typeof taxonomyV1AttributeSchema>;
export type TaxonomyV1AttributeBinding = z.infer<
  typeof taxonomyV1AttributeBindingSchema
>;
export type TaxonomyV1DependencyRule = z.infer<
  typeof taxonomyV1DependencyRuleSchema
>;
export type TaxonomyV1ValidationRule = z.infer<
  typeof taxonomyV1ValidationRuleSchema
>;
export type TaxonomyV1ResolvedPublication = z.infer<
  typeof taxonomyV1ResolvedPublicationSchema
>;
export type TaxonomyV1ResolvedSchema = z.infer<
  typeof taxonomyV1ResolvedSchemaSchema
>;
export type TaxonomyV1TreeResponse = z.infer<
  typeof taxonomyV1TreeResponseSchema
>;
export type TaxonomyV1OptionPage = z.infer<typeof taxonomyV1OptionPageSchema>;
export type TaxonomyHeaderCategoryItem = z.infer<
  typeof taxonomyHeaderCategoryItemSchema
>;
export type TaxonomyHeaderNavigationLink = z.infer<
  typeof taxonomyHeaderNavigationLinkSchema
>;
export type TaxonomyHeaderNavigationConfiguration = z.infer<
  typeof taxonomyHeaderNavigationConfigurationSchema
>;
export type TaxonomyHeaderNavigationUpdate = z.infer<
  typeof taxonomyHeaderNavigationUpdateSchema
>;
export type TaxonomyV1PublicBundle = z.infer<
  typeof taxonomyV1PublicBundleSchema
>;

const listingTaxonomyLabelsSchema = z
  .object({ "fr-FR": z.string() })
  .catchall(z.string());

const taxonomyLocalizedCharacteristicSchema = z.object({
  icon: listingCharacteristicIconSchema.optional(),
  groupId: z.string().optional(),
  groupLabels: listingTaxonomyLabelsSchema.optional(),
  presentation: z.enum(["fact", "feature"]).optional(),
  code: z.string(),
  labels: listingTaxonomyLabelsSchema,
  values: listingTaxonomyLabelsSchema,
});

export const listingTaxonomyProjectionSchema = z.object({
  revision: z.number().int().positive(),
  categoryId: z.string(),
  categorySlug: z.string(),
  categoryLabels: listingTaxonomyLabelsSchema,
  rootId: z.string(),
  rootSlug: z.string(),
  rootLabels: listingTaxonomyLabelsSchema,
  path: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      labels: listingTaxonomyLabelsSchema,
    }),
  ),
  brandLabels: listingTaxonomyLabelsSchema.optional(),
  cardCharacteristics: z
    .array(taxonomyLocalizedCharacteristicSchema)
    .optional(),
  detailCharacteristics: z
    .array(taxonomyLocalizedCharacteristicSchema)
    .optional(),
});

export interface ResolveTaxonomyV1PublicInput {
  marketContext: import("../market-country").MarketContext;
  categoryIdentity: string;
  listingTypeId?: string;
  intent?: TaxonomyV1ListingIntent;
  sellerType: "individual" | "professional";
  locale: string;
  taxonomyRevision?: number;
  taxonomyVersion?: "v1";
}
