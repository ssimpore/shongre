import { z } from "zod";
import { MARKET_CODE_LENGTH } from "./primitives";

export const FEATURE_FLAG_CONSTRAINTS = {
  marketCodeLength: MARKET_CODE_LENGTH,
  rolloutPercentageMin: 0,
  rolloutPercentageMax: 100,
  priorityMin: 0,
  priorityMax: 10_000,
} as const;

export const featureFlagKeySchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z][a-z0-9_.-]+$/);

export const featureFlagDefinitionSchema = z.object({
  key: featureFlagKeySchema,
  description: z.string().min(10).max(500),
  owner: z.string().min(2).max(120),
  defaultEnabled: z.boolean(),
  exposure: z.enum(["public", "server"]),
  lifecycle: z.enum(["active", "archived"]),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const featureFlagRuleSchema = z.object({
  id: z.string().min(1),
  flagKey: featureFlagKeySchema,
  marketCode: z
    .string()
    .length(FEATURE_FLAG_CONSTRAINTS.marketCodeLength)
    .optional(),
  accountId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  enabled: z.boolean(),
  rolloutPercentage: z
    .number()
    .int()
    .min(FEATURE_FLAG_CONSTRAINTS.rolloutPercentageMin)
    .max(FEATURE_FLAG_CONSTRAINTS.rolloutPercentageMax),
  priority: z
    .number()
    .int()
    .min(FEATURE_FLAG_CONSTRAINTS.priorityMin)
    .max(FEATURE_FLAG_CONSTRAINTS.priorityMax),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  reason: z.string().min(10).max(2_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const featureFlagEvaluationSchema = z.object({
  key: featureFlagKeySchema,
  enabled: z.boolean(),
  source: z.enum(["rule", "default", "safe_default"]),
  ruleId: z.string().optional(),
  evaluatedAt: z.string().datetime(),
});

export const featureFlagContextSchema = z.object({
  marketCode: z
    .string()
    .length(FEATURE_FLAG_CONSTRAINTS.marketCodeLength)
    .optional(),
  accountId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  anonymousId: z.string().min(1).max(200).optional(),
});

export const featureFlagDefinitionUpdateSchema = featureFlagDefinitionSchema
  .pick({
    description: true,
    owner: true,
    defaultEnabled: true,
    exposure: true,
    lifecycle: true,
    expiresAt: true,
  })
  .extend({ reason: z.string().min(10).max(2_000) });

export const featureFlagRuleUpdateSchema = featureFlagRuleSchema
  .pick({
    marketCode: true,
    accountId: true,
    organizationId: true,
    enabled: true,
    rolloutPercentage: true,
    priority: true,
    startsAt: true,
    endsAt: true,
    reason: true,
  })
  .refine(
    (value) =>
      !value.startsAt ||
      !value.endsAt ||
      new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(),
    { message: "feature flag rule start must be before its end" },
  );

export type FeatureFlagDefinition = z.infer<typeof featureFlagDefinitionSchema>;
export type FeatureFlagRule = z.infer<typeof featureFlagRuleSchema>;
export type FeatureFlagEvaluation = z.infer<typeof featureFlagEvaluationSchema>;
export type FeatureFlagContext = z.infer<typeof featureFlagContextSchema>;
export type FeatureFlagDefinitionUpdate = z.infer<
  typeof featureFlagDefinitionUpdateSchema
>;
export type FeatureFlagRuleUpdate = z.infer<typeof featureFlagRuleUpdateSchema>;
