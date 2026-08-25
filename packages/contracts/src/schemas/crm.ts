import { z } from "zod";

export const crmLifecycleSchema = z.enum([
  "lead",
  "prospect",
  "qualified",
  "customer",
  "partner",
  "do_not_contact",
  "archived",
]);

export const crmSourceSchema = z.enum([
  "manual",
  "import",
  "inbound",
  "referral",
  "event",
  "ai_research",
  "shongre_adapter",
  "external_api",
]);

export const crmForecastCategorySchema = z.enum([
  "pipeline",
  "best_case",
  "commit",
  "closed",
  "omitted",
]);

export const crmOpportunityStatusSchema = z.enum([
  "open",
  "won",
  "lost",
  "archived",
]);

export const crmTaskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const crmTaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const crmActivityTypeSchema = z.enum([
  "ACCOUNT_CREATED",
  "CONTACT_CREATED",
  "NOTE_CREATED",
  "CALL_COMPLETED",
  "EMAIL_SENT",
  "EMAIL_RECEIVED",
  "MEETING_CREATED",
  "MEETING_COMPLETED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "OPPORTUNITY_CREATED",
  "STAGE_CHANGED",
  "OPPORTUNITY_WON",
  "OPPORTUNITY_LOST",
  "OWNER_CHANGED",
  "AI_ENRICHMENT",
  "AI_RECOMMENDATION",
  "EXTERNAL_EVENT",
]);

export const crmEntityTypeSchema = z.enum([
  "account",
  "contact",
  "opportunity",
  "task",
]);

export const crmMoneySchema = z.object({
  amountMinor: z.number().int().safe(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const crmPageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().min(1).optional(),
});

const dateTimeSchema = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalText = z.string().trim().min(1).max(2_000).optional();
const customValuesSchema = z.record(z.string(), z.unknown()).default({});

export const crmAccountSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255),
  legalName: z.string().trim().min(1).max(255).optional(),
  website: z.string().url().optional(),
  domain: z.string().trim().min(1).max(255).optional(),
  industry: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(10_000).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).max(64).optional(),
  country: z.string().regex(/^[A-Z]{2}$/),
  region: z.string().max(160).optional(),
  city: z.string().max(160).optional(),
  postalCode: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
  marketCode: z.string().regex(/^[A-Z]{2}$/),
  lifecycle: crmLifecycleSchema,
  fitScore: z.number().int().min(0).max(100).optional(),
  source: crmSourceSchema,
  sourceDetail: z.string().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  customValues: customValuesSchema,
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  archivedAt: dateTimeSchema.optional(),
});

export const crmAccountInputSchema = crmAccountSchema
  .pick({
    name: true,
    legalName: true,
    website: true,
    domain: true,
    industry: true,
    description: true,
    email: true,
    phone: true,
    country: true,
    region: true,
    city: true,
    postalCode: true,
    address: true,
    marketCode: true,
    lifecycle: true,
    fitScore: true,
    source: true,
    sourceDetail: true,
    tags: true,
    customValues: true,
  })
  .partial()
  .extend({ name: z.string().trim().min(1).max(255) });

export const crmContactSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  accountIds: z.array(z.string().uuid()).default([]),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  fullName: z.string().trim().min(1).max(255),
  jobTitle: z.string().max(160).optional(),
  department: z.string().max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
  timezone: z.string().max(80).optional(),
  country: z.string().regex(/^[A-Z]{2}$/),
  preferredContactMethod: z
    .enum(["email", "phone", "sms", "marketplace"])
    .optional(),
  lifecycle: crmLifecycleSchema,
  leadStatus: z.string().max(80).optional(),
  source: crmSourceSchema,
  sourceDetail: z.string().max(500).optional(),
  doNotContact: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  customValues: customValuesSchema,
  lastContactedAt: dateTimeSchema.optional(),
  nextContactAt: dateTimeSchema.optional(),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  archivedAt: dateTimeSchema.optional(),
});

export const crmContactInputSchema = crmContactSchema
  .pick({
    ownerId: true,
    accountIds: true,
    firstName: true,
    lastName: true,
    jobTitle: true,
    department: true,
    email: true,
    phone: true,
    language: true,
    timezone: true,
    country: true,
    preferredContactMethod: true,
    lifecycle: true,
    leadStatus: true,
    source: true,
    sourceDetail: true,
    doNotContact: true,
    tags: true,
    customValues: true,
    lastContactedAt: true,
    nextContactAt: true,
  })
  .partial()
  .extend({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
  });

export const crmPipelineStageSchema = z.object({
  id: z.string().uuid(),
  pipelineId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  position: z.number().int().nonnegative(),
  defaultProbability: z.number().int().min(0).max(100),
  colorToken: z.string().max(80),
  isOpen: z.boolean(),
  isWon: z.boolean(),
  isLost: z.boolean(),
  requiredFields: z.array(z.string().min(1)).default([]),
  slaHours: z.number().int().positive().optional(),
  version: z.number().int().positive(),
});

export const crmPipelineSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: optionalText,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  stages: z.array(crmPipelineStageSchema),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const crmPipelineInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: optionalText,
    isDefault: z.boolean().default(false),
    stages: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          name: z.string().trim().min(1).max(120),
          position: z.number().int().nonnegative(),
          defaultProbability: z.number().int().min(0).max(100),
          colorToken: z.string().max(80).default("neutral"),
          isOpen: z.boolean().default(true),
          isWon: z.boolean().default(false),
          isLost: z.boolean().default(false),
          requiredFields: z.array(z.string().min(1)).default([]),
          slaHours: z.number().int().positive().optional(),
        }),
      )
      .min(3)
      .max(30),
  })
  .superRefine((pipeline, context) => {
    const names = pipeline.stages.map((stage) =>
      stage.name.toLocaleLowerCase("fr"),
    );
    const positions = pipeline.stages.map((stage) => stage.position);
    const expectedPositions = pipeline.stages.map((_, position) => position);
    if (new Set(names).size !== names.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stages"],
        message: "Les noms d’étape doivent être uniques.",
      });
    }
    if (
      new Set(positions).size !== positions.length ||
      [...positions]
        .sort((left, right) => left - right)
        .some((value, index) => value !== expectedPositions[index])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stages"],
        message: "Les positions d’étape doivent être uniques et continues.",
      });
    }
    const open = pipeline.stages.filter((stage) => stage.isOpen);
    const won = pipeline.stages.filter((stage) => stage.isWon);
    const lost = pipeline.stages.filter((stage) => stage.isLost);
    if (open.length === 0 || won.length !== 1 || lost.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stages"],
        message:
          "Un pipeline exige au moins une étape ouverte, une étape gagnée et une étape perdue.",
      });
    }
    pipeline.stages.forEach((stage, index) => {
      if (
        Number(stage.isOpen) + Number(stage.isWon) + Number(stage.isLost) !==
        1
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index],
          message: "Chaque étape doit avoir un seul type.",
        });
      }
      if (stage.isWon && stage.defaultProbability !== 100) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index, "defaultProbability"],
          message: "Une étape gagnée a une probabilité de 100 %.",
        });
      }
      if (stage.isLost && stage.defaultProbability !== 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index, "defaultProbability"],
          message: "Une étape perdue a une probabilité de 0 %.",
        });
      }
    });
  });

export const crmOpportunitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  accountName: z.string().max(255).optional(),
  contactIds: z.array(z.string().uuid()).default([]),
  ownerId: z.string().uuid().optional(),
  ownerName: z.string().max(255).optional(),
  teamId: z.string().uuid().optional(),
  teamName: z.string().max(160).optional(),
  pipelineId: z.string().uuid(),
  pipelineName: z.string().max(160),
  stageId: z.string().uuid(),
  stageName: z.string().max(120),
  name: z.string().trim().min(1).max(255),
  description: z.string().max(10_000).optional(),
  amount: crmMoneySchema,
  probability: z.number().int().min(0).max(100),
  forecastCategory: crmForecastCategorySchema,
  expectedCloseDate: dateSchema.optional(),
  nextStep: z.string().max(1_000).optional(),
  source: crmSourceSchema,
  sourceDetail: z.string().max(500).optional(),
  status: crmOpportunityStatusSchema,
  lossReason: z.string().max(160).optional(),
  lossDetail: z.string().max(2_000).optional(),
  competitor: z.string().max(255).optional(),
  futureRecontactDate: dateSchema.optional(),
  recurringValue: crmMoneySchema.optional(),
  renewalDate: dateSchema.optional(),
  onboardingStatus: z.string().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  customValues: customValuesSchema,
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  wonAt: dateTimeSchema.optional(),
  lostAt: dateTimeSchema.optional(),
  archivedAt: dateTimeSchema.optional(),
});

export const crmOpportunityInputSchema = crmOpportunitySchema
  .pick({
    accountId: true,
    contactIds: true,
    ownerId: true,
    teamId: true,
    pipelineId: true,
    stageId: true,
    name: true,
    description: true,
    amount: true,
    probability: true,
    forecastCategory: true,
    expectedCloseDate: true,
    nextStep: true,
    source: true,
    sourceDetail: true,
    recurringValue: true,
    renewalDate: true,
    onboardingStatus: true,
    tags: true,
    customValues: true,
  })
  .partial()
  .extend({
    pipelineId: z.string().uuid(),
    stageId: z.string().uuid(),
    name: z.string().trim().min(1).max(255),
    amount: crmMoneySchema,
  });

export const crmOpportunityTransitionSchema = z
  .object({
    stageId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    lossReason: z.string().trim().min(1).max(160).optional(),
    lossDetail: z.string().max(2_000).optional(),
    competitor: z.string().max(255).optional(),
    futureRecontactDate: dateSchema.optional(),
    contractValue: crmMoneySchema.optional(),
    recurringValue: crmMoneySchema.optional(),
    renewalDate: dateSchema.optional(),
    onboardingStatus: z.string().max(80).optional(),
  })
  .strict();

export const crmTaskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  ownerName: z.string().max(255).optional(),
  teamId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  type: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(255),
  description: z.string().max(5_000).optional(),
  priority: crmTaskPrioritySchema,
  status: crmTaskStatusSchema,
  startAt: dateTimeSchema.optional(),
  dueAt: dateTimeSchema,
  completedAt: dateTimeSchema.optional(),
  completionResult: z.string().max(2_000).optional(),
  recurrence: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const crmTaskInputSchema = crmTaskSchema
  .pick({
    ownerId: true,
    teamId: true,
    accountId: true,
    contactId: true,
    opportunityId: true,
    type: true,
    title: true,
    description: true,
    priority: true,
    startAt: true,
    dueAt: true,
    recurrence: true,
  })
  .partial()
  .extend({
    type: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(255),
    dueAt: dateTimeSchema,
  });

export const crmActivitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  actorUserId: z.string().uuid().optional(),
  actorName: z.string().max(255),
  entityType: crmEntityTypeSchema,
  entityId: z.string().uuid(),
  activityType: crmActivityTypeSchema,
  title: z.string().trim().min(1).max(255),
  description: z.string().max(10_000).optional(),
  occurredAt: dateTimeSchema,
  providerConnectionId: z.string().uuid().optional(),
  externalMessageId: z.string().max(500).optional(),
  externalThreadId: z.string().max(500).optional(),
  isAiGenerated: z.boolean(),
  createdAt: dateTimeSchema,
});

export const crmDashboardSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  activeProspects: z.number().int().nonnegative(),
  openOpportunities: z.number().int().nonnegative(),
  openPipelineMinor: z.number().int().safe(),
  weightedPipelineMinor: z.number().int().safe(),
  forecastMinor: z.number().int().safe(),
  wonRevenueMinor: z.number().int().safe(),
  lostValueMinor: z.number().int().safe(),
  overdueTasks: z.number().int().nonnegative(),
  tasksDueToday: z.number().int().nonnegative(),
  opportunities: z.array(crmOpportunitySchema),
  priorityTasks: z.array(crmTaskSchema),
  stages: z.array(
    z.object({
      stageId: z.string().uuid(),
      stageName: z.string(),
      position: z.number().int().nonnegative(),
      opportunityCount: z.number().int().nonnegative(),
      amountMinor: z.number().int().safe(),
      weightedAmountMinor: z.number().int().safe(),
    }),
  ),
});

export const crmProductTypeSchema = z.enum([
  "subscription",
  "advertising",
  "service",
  "license",
  "credits",
  "pack",
  "one_time",
]);
export const crmBillingIntervalSchema = z.enum([
  "one_time",
  "month",
  "quarter",
  "year",
]);

export const crmProductPriceSchema = z.object({
  id: z.string().uuid(),
  priceBookId: z.string().uuid(),
  productId: z.string().uuid(),
  marketCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  amount: crmMoneySchema,
  billingInterval: crmBillingIntervalSchema.optional(),
  startsAt: dateTimeSchema.optional(),
  endsAt: dateTimeSchema.optional(),
});

export const crmProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(255),
  description: z.string().max(5_000).optional(),
  productType: crmProductTypeSchema,
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  prices: z.array(crmProductPriceSchema),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const crmProductInputSchema = crmProductSchema
  .pick({
    sku: true,
    name: true,
    description: true,
    productType: true,
    isActive: true,
    metadata: true,
  })
  .partial()
  .extend({
    sku: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(255),
    productType: crmProductTypeSchema,
    price: z
      .object({
        marketCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .optional(),
        amount: crmMoneySchema,
        billingInterval: crmBillingIntervalSchema.optional(),
      })
      .optional(),
  });

export const crmQuoteLineItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().trim().min(1).max(2_000),
  quantity: z.number().positive().max(1_000_000),
  unitAmountMinor: z.number().int().nonnegative().safe(),
  discountMinor: z.number().int().nonnegative().safe().default(0),
  taxMinor: z.number().int().nonnegative().safe().default(0),
});

export const crmQuoteLineItemSchema = crmQuoteLineItemInputSchema.extend({
  id: z.string().uuid(),
  totalMinor: z.number().int().nonnegative().safe(),
  position: z.number().int().nonnegative(),
});

export const crmQuoteStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);
export const crmQuoteSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string().max(255).optional(),
  opportunityId: z.string().uuid().optional(),
  quoteNumber: z.string().trim().min(1).max(120),
  subtotalMinor: z.number().int().nonnegative().safe(),
  discountMinor: z.number().int().nonnegative().safe(),
  taxMinor: z.number().int().nonnegative().safe(),
  totalMinor: z.number().int().nonnegative().safe(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: crmQuoteStatusSchema,
  validUntil: dateSchema.optional(),
  notes: z.string().max(5_000).optional(),
  items: z.array(crmQuoteLineItemSchema),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  sentAt: dateTimeSchema.optional(),
  acceptedAt: dateTimeSchema.optional(),
  rejectedAt: dateTimeSchema.optional(),
});

export const crmQuoteInputSchema = z.object({
  accountId: z.string().uuid(),
  opportunityId: z.string().uuid().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  validUntil: dateSchema.optional(),
  notes: z.string().max(5_000).optional(),
  items: z.array(crmQuoteLineItemInputSchema).min(1).max(100),
});

export const crmCustomFieldSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  entityType: crmEntityTypeSchema,
  name: z.string().trim().min(1).max(160),
  key: z.string().regex(/^[a-z][a-z0-9_]{1,62}$/),
  description: z.string().max(2_000).optional(),
  fieldType: z.enum([
    "text",
    "textarea",
    "integer",
    "decimal",
    "money",
    "percentage",
    "boolean",
    "date",
    "datetime",
    "email",
    "phone",
    "url",
    "single_select",
    "multi_select",
    "user",
    "account",
    "contact",
  ]),
  required: z.boolean(),
  validation: z.record(z.string(), z.unknown()),
  options: z.array(z.unknown()),
  position: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive", "archived"]),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const crmCustomFieldInputSchema = crmCustomFieldSchema
  .pick({
    entityType: true,
    name: true,
    key: true,
    description: true,
    fieldType: true,
    required: true,
    validation: true,
    options: true,
    position: true,
  })
  .partial()
  .extend({
    entityType: crmEntityTypeSchema,
    name: z.string().trim().min(1).max(160),
    key: z.string().regex(/^[a-z][a-z0-9_]{1,62}$/),
    fieldType: crmCustomFieldSchema.shape.fieldType,
  });

export const crmShongreSectionAvailabilitySchema = z.enum([
  "available",
  "not_linked",
  "not_connected",
]);

export const crmShongreIntelligenceSchema = z.object({
  linked: z.boolean(),
  sourceSystem: z.literal("shongre"),
  organization: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      legalName: z.string().min(1),
      verified: z.boolean(),
      marketCode: z.string().regex(/^[A-Z]{2}$/),
      city: z.string().optional(),
    })
    .optional(),
  professional: z.object({
    availability: crmShongreSectionAvailabilitySchema,
    ownerUserId: z.string().uuid().optional(),
    ownerName: z.string().optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    businessVerified: z.boolean().optional(),
  }),
  listings: z.object({
    availability: crmShongreSectionAvailabilitySchema,
    total: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    recent: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        status: z.string(),
        marketCode: z.string().regex(/^[A-Z]{2}$/),
        updatedAt: dateTimeSchema,
      }),
    ),
  }),
  subscription: z.object({
    availability: crmShongreSectionAvailabilitySchema,
    id: z.string().uuid().optional(),
    productId: z.string().optional(),
    status: z.string().optional(),
    currentPeriodEndsAt: dateTimeSchema.optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  }),
  advertising: z.object({
    availability: crmShongreSectionAvailabilitySchema,
  }),
  leads: z.object({ availability: crmShongreSectionAvailabilitySchema }),
  marketplaceActivity: z.object({
    availability: crmShongreSectionAvailabilitySchema,
  }),
  lastSynchronizedAt: dateTimeSchema.optional(),
});

export const crmAccountDuplicateCheckSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    domain: z.string().trim().min(1).max(255).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().min(1).max(64).optional(),
    address: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => Object.values(value).some(Boolean), {
    message: "At least one duplicate-detection signal is required.",
  });

export const crmDuplicateMatchSchema = z.object({
  entityId: z.string().uuid(),
  displayName: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
  signals: z.array(
    z.object({
      kind: z.enum(["domain", "name", "email", "phone", "address"]),
      value: z.string(),
      confidence: z.number().int().min(0).max(100),
    }),
  ),
});

export const crmSavedViewVisibilitySchema = z.enum([
  "personal",
  "team",
  "workspace",
  "tenant",
]);

const crmSavedViewColumnSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/);

export const crmSavedViewSortSchema = z.object({
  field: crmSavedViewColumnSchema,
  direction: z.enum(["asc", "desc"]),
});

export const crmSavedViewSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  entityType: crmEntityTypeSchema,
  name: z.string().trim().min(1).max(120),
  visibility: crmSavedViewVisibilitySchema,
  teamId: z.string().uuid().optional(),
  filterDefinition: z.record(z.string().max(80), z.unknown()).default({}),
  sortDefinition: z.array(crmSavedViewSortSchema).max(8).default([]),
  visibleColumns: z.array(crmSavedViewColumnSchema).max(40).default([]),
  columnOrder: z.array(crmSavedViewColumnSchema).max(40).default([]),
  version: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const crmSavedViewInputSchema = crmSavedViewSchema
  .pick({
    entityType: true,
    name: true,
    visibility: true,
    teamId: true,
    filterDefinition: true,
    sortDefinition: true,
    visibleColumns: true,
    columnOrder: true,
  })
  .superRefine((value, context) => {
    if (value.visibility === "team" && !value.teamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamId"],
        message: "A team view requires a teamId.",
      });
    }
    if (value.visibility !== "team" && value.teamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamId"],
        message: "teamId is only allowed for team views.",
      });
    }
    if (JSON.stringify(value.filterDefinition).length > 20_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filterDefinition"],
        message: "The saved-view filter is too large.",
      });
    }
  });

export type CrmLifecycle = z.infer<typeof crmLifecycleSchema>;
export type CrmSource = z.infer<typeof crmSourceSchema>;
export type CrmMoney = z.infer<typeof crmMoneySchema>;
export type CrmAccount = z.infer<typeof crmAccountSchema>;
export type CrmAccountInput = z.infer<typeof crmAccountInputSchema>;
export type CrmContact = z.infer<typeof crmContactSchema>;
export type CrmContactInput = z.infer<typeof crmContactInputSchema>;
export type CrmPipeline = z.infer<typeof crmPipelineSchema>;
export type CrmPipelineInput = z.infer<typeof crmPipelineInputSchema>;
export type CrmPipelineStage = z.infer<typeof crmPipelineStageSchema>;
export type CrmOpportunity = z.infer<typeof crmOpportunitySchema>;
export type CrmOpportunityInput = z.infer<typeof crmOpportunityInputSchema>;
export type CrmOpportunityTransition = z.infer<
  typeof crmOpportunityTransitionSchema
>;
export type CrmTask = z.infer<typeof crmTaskSchema>;
export type CrmTaskInput = z.infer<typeof crmTaskInputSchema>;
export type CrmActivity = z.infer<typeof crmActivitySchema>;
export type CrmDashboard = z.infer<typeof crmDashboardSchema>;
export type CrmProduct = z.infer<typeof crmProductSchema>;
export type CrmProductInput = z.infer<typeof crmProductInputSchema>;
export type CrmProductPrice = z.infer<typeof crmProductPriceSchema>;
export type CrmQuote = z.infer<typeof crmQuoteSchema>;
export type CrmQuoteInput = z.infer<typeof crmQuoteInputSchema>;
export type CrmQuoteLineItem = z.infer<typeof crmQuoteLineItemSchema>;
export type CrmCustomField = z.infer<typeof crmCustomFieldSchema>;
export type CrmCustomFieldInput = z.infer<typeof crmCustomFieldInputSchema>;
export type CrmShongreIntelligence = z.infer<
  typeof crmShongreIntelligenceSchema
>;
export type CrmAccountDuplicateCheck = z.infer<
  typeof crmAccountDuplicateCheckSchema
>;
export type CrmDuplicateMatch = z.infer<typeof crmDuplicateMatchSchema>;
export type CrmSavedViewVisibility = z.infer<
  typeof crmSavedViewVisibilitySchema
>;
export type CrmSavedView = z.infer<typeof crmSavedViewSchema>;
export type CrmSavedViewInput = z.input<typeof crmSavedViewInputSchema>;
