import { z } from "zod";
import { DELIVERY_FEATURE_FLAG_KEY } from "./delivery";
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

/** Flags in this set may only be activated by an exact market-scoped rule. */
export const MARKET_SCOPED_ONLY_FEATURE_FLAGS = [
  DELIVERY_FEATURE_FLAG_KEY,
] as const;

export function isMarketScopedOnlyFeatureFlag(key: string): boolean {
  return (MARKET_SCOPED_ONLY_FEATURE_FLAGS as readonly string[]).includes(key);
}

function stableFeatureFlagBucket(key: string, identity: string): number {
  let value = 2_166_136_261;
  for (const character of `${key}:${identity}`) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16_777_619);
  }
  return (value >>> 0) % 100;
}

export function featureFlagRuleMatches(
  rule: FeatureFlagRule,
  context: FeatureFlagContext,
  nowIso: string,
): boolean {
  if (rule.startsAt && rule.startsAt > nowIso) return false;
  if (rule.endsAt && rule.endsAt <= nowIso) return false;
  if (rule.marketCode && rule.marketCode !== context.marketCode) return false;
  if (rule.accountId && rule.accountId !== context.accountId) return false;
  if (rule.organizationId && rule.organizationId !== context.organizationId)
    return false;
  if (
    isMarketScopedOnlyFeatureFlag(rule.flagKey) &&
    (!rule.marketCode ||
      rule.accountId ||
      rule.organizationId ||
      rule.marketCode !== context.marketCode)
  ) {
    return false;
  }
  const identity =
    context.accountId ||
    context.organizationId ||
    context.anonymousId ||
    `${context.marketCode || "global"}:anonymous`;
  return (
    stableFeatureFlagBucket(rule.flagKey, identity) < rule.rolloutPercentage
  );
}

export function resolveFeatureFlagEvaluation(input: {
  key: string;
  definition: FeatureFlagDefinition | null | undefined;
  rules: readonly FeatureFlagRule[];
  context: FeatureFlagContext;
  evaluatedAt: string;
}): FeatureFlagEvaluation {
  const { key, definition, rules, context, evaluatedAt } = input;
  if (
    !definition ||
    definition.exposure !== "public" ||
    definition.lifecycle !== "active" ||
    (definition.expiresAt && definition.expiresAt <= evaluatedAt)
  ) {
    return { key, enabled: false, source: "safe_default", evaluatedAt };
  }
  const rule = [...rules]
    .sort((left, right) => right.priority - left.priority)
    .find((candidate) =>
      featureFlagRuleMatches(candidate, context, evaluatedAt),
    );
  if (rule) {
    return {
      key,
      enabled: rule.enabled,
      source: "rule",
      ruleId: rule.id,
      evaluatedAt,
    };
  }
  if (isMarketScopedOnlyFeatureFlag(key)) {
    return { key, enabled: false, source: "safe_default", evaluatedAt };
  }
  return {
    key,
    enabled: definition.defaultEnabled,
    source: "default",
    evaluatedAt,
  };
}
