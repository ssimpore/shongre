import type {
  CommercialCondition,
  CommercialRule,
  CommercialRuleOutcome,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleExplanation,
} from "@shongre/contracts/monetization";

const ARRAY_CONTEXT_FIELDS = new Set(["featureFlag"]);

function contextValue(
  context: RuleEvaluationContext,
  field: CommercialCondition["field"],
): string | number | boolean | string[] | undefined {
  if (field === "featureFlag") return context.featureFlags;
  return context[field as keyof RuleEvaluationContext] as
    string | number | boolean | undefined;
}

function asArray(
  value: CommercialCondition["value"],
): Array<string | number | boolean> {
  return Array.isArray(value) ? value : [value];
}

/**
 * Deliberately small and allowlisted. Commercial rules are data, never code:
 * no eval, regular expressions, SQL fragments, property paths, or functions.
 */
export function conditionMatches(
  condition: CommercialCondition,
  context: RuleEvaluationContext,
): boolean {
  const actual = contextValue(context, condition.field);
  if (actual === undefined) return false;
  const expected = asArray(condition.value);

  if (ARRAY_CONTEXT_FIELDS.has(condition.field)) {
    const values = Array.isArray(actual) ? actual : [actual];
    if (condition.operator === "contains" || condition.operator === "in") {
      return expected.some((candidate) => values.includes(String(candidate)));
    }
    if (condition.operator === "not_in" || condition.operator === "not_eq") {
      return expected.every((candidate) => !values.includes(String(candidate)));
    }
  }

  switch (condition.operator) {
    case "eq":
      return actual === expected[0];
    case "not_eq":
      return actual !== expected[0];
    case "in":
      return expected.includes(actual as string | number | boolean);
    case "not_in":
      return !expected.includes(actual as string | number | boolean);
    case "gte":
      return (
        typeof actual === "number" && Number(actual) >= Number(expected[0])
      );
    case "lte":
      return (
        typeof actual === "number" && Number(actual) <= Number(expected[0])
      );
    case "between":
      return (
        typeof actual === "number" &&
        expected.length === 2 &&
        actual >= Number(expected[0]) &&
        actual <= Number(expected[1])
      );
    case "contains":
      return typeof actual === "string" && actual.includes(String(expected[0]));
  }
}

function scopeDimensionMatches(values: string[], actual?: string): boolean {
  return (
    values.length === 0 || (actual !== undefined && values.includes(actual))
  );
}

export function ruleScopeMatches(
  rule: CommercialRule,
  context: RuleEvaluationContext,
): boolean {
  const { scope } = rule;
  return (
    scopeDimensionMatches(scope.marketCodes, context.marketCode) &&
    scopeDimensionMatches(scope.currencies, context.currency) &&
    scopeDimensionMatches(scope.categoryIds, context.categoryId) &&
    scopeDimensionMatches(scope.subcategoryIds, context.subcategoryId) &&
    scopeDimensionMatches(scope.typeIds, context.typeId) &&
    scopeDimensionMatches(scope.subtypeIds, context.subtypeId) &&
    scopeDimensionMatches(scope.audiences, context.userType) &&
    scopeDimensionMatches(scope.planIds, context.planId) &&
    scopeDimensionMatches(scope.customerSegments, context.customerSegment) &&
    scopeDimensionMatches(scope.publicationChannels, context.publicationChannel)
  );
}

export function ruleSpecificity(rule: CommercialRule): number {
  const scopedDimensions = Object.values(rule.scope).filter(
    (value) => Array.isArray(value) && value.length > 0,
  ).length;
  return scopedDimensions * 100 + rule.conditions.length * 10;
}

function isEffective(rule: CommercialRule, effectiveAt: Date): boolean {
  if (rule.status !== "active") return false;
  if (rule.effectiveFrom && effectiveAt < new Date(rule.effectiveFrom))
    return false;
  if (rule.effectiveUntil && effectiveAt >= new Date(rule.effectiveUntil))
    return false;
  return true;
}

function explain(
  rule: CommercialRule,
  matched: boolean,
  reasonCode: string,
): RuleExplanation {
  return {
    ruleId: rule.id,
    ruleKey: rule.key,
    ruleName: rule.name,
    matched,
    priority: rule.priority,
    specificity: ruleSpecificity(rule),
    outcome: matched ? rule.outcome : undefined,
    reasonCode,
  };
}

function outcomeEntries(
  outcome: CommercialRuleOutcome,
): Array<[string, string | number | boolean]> {
  return Object.entries(outcome).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== undefined,
  );
}

/**
 * Rules are resolved in a stable order: mandatory first, then highest priority,
 * then most-specific, then id as a deterministic tie-break. The first value for
 * an outcome key wins. This makes broad defaults safe and specific overrides
 * predictable, while the explanation retains every evaluated rule.
 */
export function evaluateCommercialRules(input: {
  configurationVersionId: string;
  rules: CommercialRule[];
  context: RuleEvaluationContext;
  usage?: number;
}): RuleEvaluationResult {
  const effectiveAt = new Date(input.context.effectiveAt || Date.now());
  const candidates = [...input.rules].sort(
    (a, b) =>
      Number(b.mandatory) - Number(a.mandatory) ||
      b.priority - a.priority ||
      ruleSpecificity(b) - ruleSpecificity(a) ||
      a.id.localeCompare(b.id),
  );
  const outcomes: Record<string, string | number | boolean> = {};
  const explanation: RuleExplanation[] = [];

  for (const rule of candidates) {
    if (!isEffective(rule, effectiveAt)) {
      explanation.push(explain(rule, false, "RULE_NOT_EFFECTIVE"));
      continue;
    }
    if (!ruleScopeMatches(rule, input.context)) {
      explanation.push(explain(rule, false, "SCOPE_NOT_MATCHED"));
      continue;
    }
    const matched = rule.conditions.every((condition) =>
      conditionMatches(condition, input.context),
    );
    explanation.push(
      explain(rule, matched, matched ? "MATCHED" : "CONDITION_NOT_MATCHED"),
    );
    if (!matched) continue;
    for (const [key, value] of outcomeEntries(rule.outcome)) {
      if (!(key in outcomes)) outcomes[key] = value;
    }
  }

  const quotaLimit =
    typeof outcomes.quotaLimit === "number" ? outcomes.quotaLimit : undefined;
  const usage = input.usage ?? input.context.usageLevel;
  const quotaRemaining =
    quotaLimit === undefined ? undefined : Math.max(0, quotaLimit - usage);
  const eligible =
    outcomes.eligible !== false &&
    (quotaRemaining === undefined || quotaRemaining > 0);

  return {
    configurationVersionId: input.configurationVersionId,
    eligible,
    reasonCode:
      !eligible && quotaRemaining === 0
        ? "QUOTA_EXHAUSTED"
        : String(
            outcomes.reasonCode || (eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"),
          ),
    quotaLimit,
    quotaRemaining,
    durationDays:
      typeof outcomes.durationDays === "number"
        ? outcomes.durationDays
        : undefined,
    outcomes,
    explanation,
  };
}
