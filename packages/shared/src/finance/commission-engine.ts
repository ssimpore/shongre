import {
  commissionCalculationInputSchema,
  commissionCalculationSchema,
  commissionPolicySchema,
  commissionRefundRequestSchema,
  commissionReversalSchema,
  type CommissionAdjustment,
  type CommissionCalculation,
  type CommissionCalculationInput,
  type CommissionModel,
  type CommissionPolicy,
  type CommissionRule,
  type CommissionScope,
} from "@shongre/contracts/monetization";
import { normalizeBusinessVerticalCode } from "@shongre/contracts/business-verticals";

const BASIS_POINTS = BigInt(10_000);
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);

type CommissionCandidate = {
  policy: CommissionPolicy;
  rule: CommissionRule;
  precedence: number;
  specificity: number;
};

export interface CalculateCommissionOptions {
  configurationVersionId: string;
  policies: CommissionPolicy[];
  input: CommissionCalculationInput;
  calculatedAt?: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

/** Stable non-cryptographic fingerprint for immutable snapshot comparison. */
export function commissionSnapshotHash(value: unknown): string {
  const input = JSON.stringify(canonicalize(value));
  let hash = BigInt("0x6c62272e07bb014262b821756295c58d");
  const prime = BigInt("0x0000000001000000000000000000013b");
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(128, hash * prime);
  }
  return hash.toString(16).padStart(32, "0");
}

function roundRatio(
  numerator: bigint,
  denominator: bigint,
  mode: "half_up" | "half_even" | "down" | "up",
): number {
  if (numerator <= BIGINT_ZERO) return 0;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  let rounded = quotient;
  if (mode === "up" && remainder > BIGINT_ZERO) rounded += BIGINT_ONE;
  if (mode === "half_up" && remainder * BIGINT_TWO >= denominator)
    rounded += BIGINT_ONE;
  if (
    mode === "half_even" &&
    (remainder * BIGINT_TWO > denominator ||
      (remainder * BIGINT_TWO === denominator &&
        quotient % BIGINT_TWO === BIGINT_ONE))
  ) {
    rounded += BIGINT_ONE;
  }
  const amount = Number(rounded);
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError("Commission calculation exceeds safe integer range.");
  }
  return amount;
}

function percentage(
  amountMinor: number,
  rateBps: number,
  mode: "half_up" | "half_even" | "down" | "up",
) {
  return roundRatio(BigInt(amountMinor) * BigInt(rateBps), BASIS_POINTS, mode);
}

function activeAt(
  value: { effectiveFrom?: string; effectiveUntil?: string },
  effectiveAt: string,
) {
  const at = new Date(effectiveAt).getTime();
  return (
    (!value.effectiveFrom || new Date(value.effectiveFrom).getTime() <= at) &&
    (!value.effectiveUntil || new Date(value.effectiveUntil).getTime() > at)
  );
}

function includesOrAll<T>(values: readonly T[], value: T | undefined) {
  return values.length === 0 || (value !== undefined && values.includes(value));
}

function scopeMatches(
  scope: CommissionScope,
  input: CommissionCalculationInput,
) {
  const verticalIds = scope.verticalIds.map((value) =>
    normalizeBusinessVerticalCode(value),
  );
  return (
    includesOrAll(scope.countryCodes, input.countryCode) &&
    includesOrAll(scope.marketCodes, input.marketCode) &&
    includesOrAll(scope.currencies, input.currency) &&
    includesOrAll(
      verticalIds,
      normalizeBusinessVerticalCode(input.verticalId),
    ) &&
    includesOrAll(scope.categoryIds, input.categoryId) &&
    includesOrAll(scope.subcategoryIds, input.subcategoryId) &&
    includesOrAll(scope.transactionTypes, input.transactionType) &&
    includesOrAll(scope.sellerTypes, input.sellerType) &&
    includesOrAll(scope.sellerSegments, input.sellerSegment) &&
    includesOrAll(scope.planIds, input.planId) &&
    includesOrAll(scope.organizationIds, input.organizationId) &&
    includesOrAll(scope.accountIds, input.sellerAccountId) &&
    (scope.campaignIds.length === 0 ||
      scope.campaignIds.some((id) => input.campaignIds.includes(id))) &&
    includesOrAll(scope.paymentMethods, input.paymentMethod)
  );
}

const PRECEDENCE: Array<[keyof CommissionScope, number]> = [
  ["accountIds", 1_000_000],
  ["organizationIds", 900_000],
  ["campaignIds", 800_000],
  ["planIds", 700_000],
  ["subcategoryIds", 650_000],
  ["categoryIds", 600_000],
  ["verticalIds", 500_000],
  ["transactionTypes", 450_000],
  ["sellerSegments", 400_000],
  ["sellerTypes", 350_000],
  ["marketCodes", 200_000],
  ["countryCodes", 100_000],
];

function precedence(scope: CommissionScope) {
  return PRECEDENCE.find(([key]) => scope[key].length > 0)?.[1] ?? 0;
}

function specificity(scope: CommissionScope) {
  return Object.values(scope).filter((values) => values.length > 0).length;
}

function rolloutMatches(
  policy: CommissionPolicy,
  input: CommissionCalculationInput,
) {
  if (policy.rolloutBps >= 10_000) return true;
  if (policy.rolloutBps <= 0) return false;
  const identity =
    input.sellerAccountId ||
    input.organizationId ||
    input.transactionId ||
    "anonymous";
  const bucket =
    Number.parseInt(
      commissionSnapshotHash(`${policy.id}:${identity}`).slice(-4),
      16,
    ) % 10_000;
  return bucket < policy.rolloutBps;
}

function compareCandidates(
  left: CommissionCandidate,
  right: CommissionCandidate,
) {
  return (
    right.precedence - left.precedence ||
    right.rule.priority - left.rule.priority ||
    right.specificity - left.specificity ||
    (
      right.rule.effectiveFrom ||
      right.policy.effectiveFrom ||
      ""
    ).localeCompare(
      left.rule.effectiveFrom || left.policy.effectiveFrom || "",
    ) ||
    left.policy.id.localeCompare(right.policy.id) ||
    left.rule.id.localeCompare(right.rule.id)
  );
}

function resolveCandidates(
  policies: CommissionPolicy[],
  input: CommissionCalculationInput,
  kind: "commission" | "adjustment",
) {
  const candidates: CommissionCandidate[] = [];
  const explanation: CommissionCalculation["explanation"] = [];
  policies.forEach((rawPolicy) => {
    const policy = commissionPolicySchema.parse(rawPolicy);
    policy.rules.forEach((rule) => {
      const reason =
        policy.status !== "active"
          ? "POLICY_NOT_ACTIVE"
          : !activeAt(policy, input.effectiveAt) ||
              !activeAt(rule, input.effectiveAt)
            ? "OUTSIDE_EFFECTIVE_PERIOD"
            : rule.effect.kind !== kind
              ? "DIFFERENT_POLICY_KIND"
              : !rolloutMatches(policy, input)
                ? "OUTSIDE_ROLLOUT"
                : !scopeMatches(rule.scope, input)
                  ? "SCOPE_NOT_MATCHED"
                  : "RULE_MATCHED";
      const matched = reason === "RULE_MATCHED";
      const rank = precedence(rule.scope);
      explanation.push({
        policyId: policy.id,
        ruleId: rule.id,
        policyName: policy.name,
        ruleName: rule.name,
        matched,
        precedence: rank,
        reasonCode: reason,
      });
      if (matched) {
        candidates.push({
          policy,
          rule,
          precedence: rank,
          specificity: specificity(rule.scope),
        });
      }
    });
  });
  return { candidates: candidates.sort(compareCandidates), explanation };
}

function commissionBase(input: CommissionCalculationInput, base: string) {
  if (base === "item_subtotal") return input.itemSubtotalMinor;
  if (base === "subtotal_after_discount") {
    return Math.max(0, input.itemSubtotalMinor - input.discountMinor);
  }
  if (base === "total_excluding_tax") {
    return Math.max(0, input.totalMinor - input.taxMinor);
  }
  if (base === "total_including_tax") return input.totalMinor;
  return input.platformCollectedMinor;
}

function thresholdApplies(
  model: Extract<CommissionModel, { type: "threshold" }>,
  base: number,
) {
  if (model.appliesWhen === "above") return base > model.thresholdMinor;
  if (model.appliesWhen === "below") return base < model.thresholdMinor;
  return base >= model.thresholdMinor;
}

function calculateModel(
  model: CommissionModel,
  base: number,
  mode: "half_up" | "half_even" | "down" | "up",
  historicalVolumeMinor: number,
) {
  let amount = 0;
  if (model.type === "percentage")
    amount = percentage(base, model.rateBps, mode);
  if (model.type === "fixed" || model.type === "flat_category") {
    amount = model.fixedMinor;
  }
  if (model.type === "combined") {
    amount = percentage(base, model.rateBps, mode) + model.fixedMinor;
  }
  if (model.type === "threshold" && thresholdApplies(model, base)) {
    amount = percentage(base, model.rateBps, mode) + model.fixedMinor;
  }
  if (model.type === "tiered") {
    if (model.basis === "historical_volume") {
      const periodStart = historicalVolumeMinor;
      const periodEnd = historicalVolumeMinor + base;
      if (model.tierMode === "cliff") {
        const selected = model.tiers.find(
          (tier) =>
            periodEnd >= tier.fromMinor &&
            (tier.toMinor === undefined || periodEnd < tier.toMinor),
        );
        amount = selected
          ? percentage(base, selected.rateBps, mode) + selected.fixedMinor
          : 0;
      } else {
        amount = model.tiers.reduce((sum, tier) => {
          const overlapStart = Math.max(periodStart, tier.fromMinor);
          const overlapEnd = Math.min(
            periodEnd,
            tier.toMinor === undefined ? periodEnd : tier.toMinor,
          );
          const tranche = Math.max(0, overlapEnd - overlapStart);
          return tranche > 0
            ? sum + percentage(tranche, tier.rateBps, mode) + tier.fixedMinor
            : sum;
        }, 0);
      }
    } else if (model.tierMode === "cliff") {
      const selected = model.tiers.find(
        (tier) =>
          base >= tier.fromMinor &&
          (tier.toMinor === undefined || base < tier.toMinor),
      );
      amount = selected
        ? percentage(base, selected.rateBps, mode) + selected.fixedMinor
        : 0;
    } else {
      amount = model.tiers.reduce((sum, tier) => {
        if (base <= tier.fromMinor) return sum;
        const upper =
          tier.toMinor === undefined ? base : Math.min(base, tier.toMinor);
        const tranche = Math.max(0, upper - tier.fromMinor);
        return sum + percentage(tranche, tier.rateBps, mode) + tier.fixedMinor;
      }, 0);
    }
  }
  if (model.minimumMinor !== undefined)
    amount = Math.max(amount, model.minimumMinor);
  if (model.maximumMinor !== undefined)
    amount = Math.min(amount, model.maximumMinor);
  return amount;
}

function applyAdjustment(
  current: number,
  adjustment: CommissionAdjustment,
  base: number,
  roundingMode: "half_up" | "half_even" | "down" | "up",
) {
  if (adjustment.type === "full_waiver") return 0;
  if (adjustment.type === "fixed_discount") {
    return Math.max(0, current - adjustment.amountMinor);
  }
  if (adjustment.type === "percentage_discount") {
    return Math.max(
      0,
      current - percentage(current, adjustment.discountBps, roundingMode),
    );
  }
  if (adjustment.type === "rate_override") {
    return percentage(base, adjustment.rateBps, roundingMode);
  }
  return adjustment.amountMinor;
}

function selectedAdjustments(candidates: CommissionCandidate[]) {
  const exclusive = candidates.find(
    ({ rule }) =>
      rule.effect.kind === "adjustment" &&
      rule.effect.stackingPolicy === "exclusive",
  );
  if (exclusive) return [exclusive];
  const stackable = candidates.filter(
    ({ rule }) =>
      rule.effect.kind === "adjustment" &&
      rule.effect.stackingPolicy === "stackable",
  );
  const bestPrice = candidates.filter(
    ({ rule }) =>
      rule.effect.kind === "adjustment" &&
      rule.effect.stackingPolicy === "best_price",
  );
  return [...stackable, ...bestPrice];
}

function emptyCalculation(
  configurationVersionId: string,
  input: CommissionCalculationInput,
  calculatedAt: string,
  reasonCode: string,
  explanation: CommissionCalculation["explanation"],
): CommissionCalculation {
  const snapshot = {
    configurationVersionId,
    input,
    reasonCode,
    calculatedAt,
  };
  const snapshotHash = commissionSnapshotHash(snapshot);
  return commissionCalculationSchema.parse({
    id: `commission_${snapshotHash}`,
    idempotencyKey: input.idempotencyKey,
    configurationVersionId,
    transactionId: input.transactionId,
    orderId: input.orderId,
    state: input.transactionId ? "earned" : "quoted",
    eligible: false,
    reasonCode,
    currency: input.currency,
    baseAmountMinor: 0,
    grossCommissionMinor: 0,
    adjustmentMinor: 0,
    netCommissionExcludingTaxMinor: 0,
    commissionTaxMinor: 0,
    totalCommissionMinor: 0,
    sellerChargeMinor: 0,
    buyerChargeMinor: 0,
    platformAbsorbedMinor: 0,
    platformRevenueMinor: 0,
    sellerPayableMinor: input.itemSubtotalMinor,
    buyerTotalMinor: input.totalMinor,
    appliedAdjustmentRuleIds: [],
    inputSnapshot: input,
    explanation,
    calculatedAt,
    expiresAt: input.quoteExpiresAt,
    snapshotHash,
  });
}

/**
 * Pure commission resolver/calculator used authoritatively by the backend and
 * by the standalone deterministic demo adapter through the same contract.
 */
export function calculateCommission(options: CalculateCommissionOptions) {
  const input = commissionCalculationInputSchema.parse(options.input);
  const calculatedAt = options.calculatedAt || new Date().toISOString();
  const baseResolution = resolveCandidates(
    options.policies,
    input,
    "commission",
  );
  if (!input.eligibleCommercialEvent) {
    return emptyCalculation(
      options.configurationVersionId,
      input,
      calculatedAt,
      "COMMERCIAL_EVENT_NOT_ELIGIBLE",
      baseResolution.explanation,
    );
  }
  const selected = baseResolution.candidates[0];
  if (!selected || selected.rule.effect.kind !== "commission") {
    return emptyCalculation(
      options.configurationVersionId,
      input,
      calculatedAt,
      "NO_ACTIVE_ELIGIBLE_POLICY",
      baseResolution.explanation,
    );
  }
  const effect = selected.rule.effect;
  if (effect.earningEvent !== input.earningEvent) {
    return emptyCalculation(
      options.configurationVersionId,
      input,
      calculatedAt,
      "EARNING_EVENT_NOT_REACHED",
      baseResolution.explanation,
    );
  }

  const baseAmountMinor = commissionBase(input, effect.base);
  const grossCommissionMinor = calculateModel(
    effect.model,
    baseAmountMinor,
    effect.roundingMode,
    input.historicalVolumeMinor,
  );
  const adjustmentResolution = resolveCandidates(
    options.policies,
    input,
    "adjustment",
  );
  const adjustments = selectedAdjustments(adjustmentResolution.candidates);
  let adjustedCommissionMinor = grossCommissionMinor;
  let bestPrice = grossCommissionMinor;
  adjustments.forEach(({ rule }) => {
    if (rule.effect.kind !== "adjustment") return;
    const next = applyAdjustment(
      rule.effect.stackingPolicy === "best_price"
        ? grossCommissionMinor
        : adjustedCommissionMinor,
      rule.effect.adjustment,
      baseAmountMinor,
      effect.roundingMode,
    );
    if (rule.effect.stackingPolicy === "best_price")
      bestPrice = Math.min(bestPrice, next);
    else adjustedCommissionMinor = next;
  });
  adjustedCommissionMinor = Math.min(adjustedCommissionMinor, bestPrice);

  let netCommissionExcludingTaxMinor = adjustedCommissionMinor;
  let commissionTaxMinor = 0;
  let totalCommissionMinor = adjustedCommissionMinor;
  if (effect.tax.mode === "exclusive") {
    commissionTaxMinor = percentage(
      adjustedCommissionMinor,
      effect.tax.rateBps,
      effect.roundingMode,
    );
    totalCommissionMinor += commissionTaxMinor;
  } else if (effect.tax.mode === "inclusive" && effect.tax.rateBps > 0) {
    netCommissionExcludingTaxMinor = roundRatio(
      BigInt(adjustedCommissionMinor) * BASIS_POINTS,
      BASIS_POINTS + BigInt(effect.tax.rateBps),
      effect.roundingMode,
    );
    commissionTaxMinor =
      adjustedCommissionMinor - netCommissionExcludingTaxMinor;
  }

  const sellerChargeMinor = percentage(
    totalCommissionMinor,
    effect.allocation.sellerBps,
    effect.roundingMode,
  );
  const buyerChargeMinor = Math.min(
    totalCommissionMinor - sellerChargeMinor,
    percentage(
      totalCommissionMinor,
      effect.allocation.buyerBps,
      effect.roundingMode,
    ),
  );
  const platformAbsorbedMinor = Math.max(
    0,
    totalCommissionMinor - sellerChargeMinor - buyerChargeMinor,
  );
  const billedShareBps =
    effect.allocation.sellerBps + effect.allocation.buyerBps;
  const platformRevenueMinor = Math.min(
    sellerChargeMinor + buyerChargeMinor,
    percentage(
      netCommissionExcludingTaxMinor,
      billedShareBps,
      effect.roundingMode,
    ),
  );
  const explanation = [
    ...baseResolution.explanation,
    ...adjustmentResolution.explanation,
  ];
  const snapshot = {
    configurationVersionId: options.configurationVersionId,
    input,
    policy: selected.policy,
    rule: selected.rule,
    adjustments: adjustments.map(({ policy, rule }) => ({ policy, rule })),
    amounts: {
      baseAmountMinor,
      grossCommissionMinor,
      adjustedCommissionMinor,
      netCommissionExcludingTaxMinor,
      commissionTaxMinor,
      totalCommissionMinor,
      sellerChargeMinor,
      buyerChargeMinor,
      platformAbsorbedMinor,
      platformRevenueMinor,
    },
    calculatedAt,
  };
  const snapshotHash = commissionSnapshotHash(snapshot);
  return commissionCalculationSchema.parse({
    id: `commission_${snapshotHash}`,
    idempotencyKey: input.idempotencyKey,
    configurationVersionId: options.configurationVersionId,
    transactionId: input.transactionId,
    orderId: input.orderId,
    state: input.transactionId ? "earned" : "quoted",
    eligible: true,
    reasonCode: "COMMISSION_POLICY_APPLIED",
    currency: input.currency,
    baseAmountMinor,
    grossCommissionMinor,
    adjustmentMinor: grossCommissionMinor - adjustedCommissionMinor,
    netCommissionExcludingTaxMinor,
    commissionTaxMinor,
    totalCommissionMinor,
    sellerChargeMinor,
    buyerChargeMinor,
    platformAbsorbedMinor,
    platformRevenueMinor,
    sellerPayableMinor: Math.max(
      0,
      input.itemSubtotalMinor - sellerChargeMinor,
    ),
    buyerTotalMinor: input.totalMinor + buyerChargeMinor,
    appliedPolicyId: selected.policy.id,
    appliedPolicyVersionId: selected.policy.versionId,
    appliedRuleId: selected.rule.id,
    appliedAdjustmentRuleIds: adjustments.map(({ rule }) => rule.id),
    effectSnapshot: effect,
    inputSnapshot: input,
    explanation,
    calculatedAt,
    expiresAt: input.quoteExpiresAt,
    snapshotHash,
  });
}

/** Reverses the immutable original snapshot; current policies are never read. */
export function calculateCommissionReversal(rawRequest: unknown) {
  const request = commissionRefundRequestSchema.parse(rawRequest);
  const calculation = request.calculation;
  const refundPolicy =
    calculation.effectSnapshot?.kind === "commission"
      ? calculation.effectSnapshot.refundPolicy
      : "manual_review";
  const remainingBaseMinor = Math.max(
    0,
    calculation.baseAmountMinor - request.previouslyReversedBaseMinor,
  );
  const ratioBase = Math.min(request.refundBaseMinor, remainingBaseMinor);
  const isFull =
    calculation.baseAmountMinor > 0 &&
    request.previouslyReversedBaseMinor + ratioBase >=
      calculation.baseAmountMinor;
  const manual =
    refundPolicy === "manual_review" ||
    (refundPolicy === "full_only" && !isFull);
  const refundable = refundPolicy !== "non_refundable" && !manual;
  const ratio = (amountMinor: number) =>
    calculation.baseAmountMinor === 0
      ? 0
      : roundRatio(
          BigInt(amountMinor) * BigInt(ratioBase),
          BigInt(calculation.baseAmountMinor),
          "half_up",
        );
  const reversedCommissionMinor = refundable
    ? isFull
      ? Math.max(
          0,
          calculation.totalCommissionMinor -
            request.previouslyReversedCommissionMinor,
        )
      : ratio(calculation.totalCommissionMinor)
    : 0;
  const reversedTaxMinor = refundable
    ? isFull
      ? Math.max(
          0,
          calculation.commissionTaxMinor - request.previouslyReversedTaxMinor,
        )
      : ratio(calculation.commissionTaxMinor)
    : 0;
  const sellerCreditMinor = refundable
    ? isFull
      ? Math.max(
          0,
          calculation.sellerChargeMinor - request.previouslyCreditedSellerMinor,
        )
      : ratio(calculation.sellerChargeMinor)
    : 0;
  const buyerCreditMinor = refundable
    ? isFull
      ? Math.max(
          0,
          calculation.buyerChargeMinor - request.previouslyCreditedBuyerMinor,
        )
      : ratio(calculation.buyerChargeMinor)
    : 0;
  const platformRevenueReversalMinor = refundable
    ? isFull
      ? Math.max(
          0,
          calculation.platformRevenueMinor -
            request.previouslyReversedRevenueMinor,
        )
      : ratio(calculation.platformRevenueMinor)
    : 0;
  const state = manual
    ? "manual_review"
    : !refundable
      ? "retained"
      : isFull
        ? "reversed"
        : "partially_reversed";
  const snapshot = {
    calculationId: calculation.id,
    request: {
      idempotencyKey: request.idempotencyKey,
      refundBaseMinor: request.refundBaseMinor,
      previouslyReversedBaseMinor: request.previouslyReversedBaseMinor,
      occurredAt: request.occurredAt,
    },
    reversedCommissionMinor,
    reversedTaxMinor,
    sellerCreditMinor,
    buyerCreditMinor,
    platformRevenueReversalMinor,
    state,
  };
  const snapshotHash = commissionSnapshotHash(snapshot);
  return commissionReversalSchema.parse({
    id: `commission_reversal_${snapshotHash}`,
    calculationId: calculation.id,
    idempotencyKey: request.idempotencyKey,
    reversedBaseMinor: ratioBase,
    reversedCommissionMinor,
    reversedTaxMinor,
    sellerCreditMinor,
    buyerCreditMinor,
    platformRevenueReversalMinor,
    state,
    occurredAt: request.occurredAt,
    snapshotHash,
  });
}
