import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";

export type DemoCommercialCategory =
  | typeof CANONICAL_TAXONOMY_IDS.vehicles
  | typeof CANONICAL_TAXONOMY_IDS.realEstate
  | typeof CANONICAL_TAXONOMY_IDS.courses
  | undefined;

const PLAN_PRODUCT_IDS: Record<string, string> = {
  free: "listing.standard.individual",
  pro_starter: "plan.pro.starter",
  pro_business: "plan.pro.business",
  pro_enterprise: "plan.pro.enterprise",
};

function rule(key: string, marketCode = "FR") {
  return BASELINE_MONETIZATION_CATALOG.rules.find(
    (candidate) =>
      candidate.key === key &&
      (candidate.scope.marketCodes.length === 0 ||
        candidate.scope.marketCodes.includes(marketCode)),
  );
}

export function getDemoTransactionCommercials(
  marketCode: string,
  sellerType: "individual" | "pro",
) {
  const protection = rule(
    `fees.buyer_protection.${marketCode.toLowerCase()}`,
    marketCode,
  );
  const commission = rule(
    sellerType === "pro"
      ? "commission.seller.professional"
      : "commission.seller.individual",
    marketCode,
  );
  const range = rule("transaction.range.fr", marketCode);
  const instantPayout = rule("payout.instant.fr", marketCode);
  return {
    protectionRateBps: protection?.outcome.feeRateBps || 0,
    protectionFixedMinor: protection?.outcome.fixedFeeMinor || 0,
    commissionRateBps: commission?.outcome.commissionRateBps || 0,
    minimumAmountMinor: range?.outcome.minimumAmountMinor || 0,
    maximumAmountMinor: range?.outcome.maximumAmountMinor,
    instantPayoutRateBps: instantPayout?.outcome.feeRateBps || 0,
    instantPayoutFixedMinor: instantPayout?.outcome.fixedFeeMinor || 0,
  };
}

export function getDemoDeliveryAmountMinor(
  delivery:
    | "hand_delivery"
    | "relay_point"
    | "home"
    | "express"
    | "bulky"
    | "seller_direct",
  tier: "small" | "medium" | "large" | "xlarge" = "medium",
) {
  const product = BASELINE_MONETIZATION_CATALOG.products.find(
    (candidate) => candidate.id === `delivery.${delivery}`,
  );
  const tierAmount = product?.entitlements.find(
    (entry) => entry.key === `tier.${tier}.amountMinor`,
  )?.value;
  return typeof tierAmount === "number"
    ? tierAmount
    : product?.prices[0]?.amount.amountMinor || 0;
}

export function getDemoTaxRateBps(marketCode: string) {
  return (
    rule(`tax.digital.${marketCode.toLowerCase()}`, marketCode)?.outcome
      .taxRateBps || 0
  );
}

/**
 * Resolves legacy UI vocabulary to canonical taxonomy identities at the demo
 * adapter boundary so publication components do not learn rule identifiers.
 */
export function normalizeCommercialCategory(
  taxonomyId?: string,
): DemoCommercialCategory {
  const normalized = taxonomyId?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (
    normalized.includes("vehicle") ||
    normalized.includes("vehicule") ||
    normalized.includes("auto") ||
    normalized.includes("moto")
  ) {
    return CANONICAL_TAXONOMY_IDS.vehicles;
  }
  if (
    normalized.includes("real-estate") ||
    normalized.includes("real_estate") ||
    normalized.includes("immobilier") ||
    normalized.includes("immo")
  ) {
    return CANONICAL_TAXONOMY_IDS.realEstate;
  }
  if (
    normalized === CANONICAL_TAXONOMY_IDS.courses ||
    normalized.includes("course") ||
    normalized.includes("cours") ||
    normalized.includes("lesson") ||
    normalized.includes("tutoring")
  ) {
    return CANONICAL_TAXONOMY_IDS.courses;
  }
  return undefined;
}

export function getDemoPublicationPolicy(input: {
  marketCode: string;
  audience: "individual" | "professional" | "organization";
  categoryId?: DemoCommercialCategory;
  planId?: string;
}) {
  const marketCode = input.marketCode.toUpperCase();
  const candidates = BASELINE_MONETIZATION_CATALOG.rules
    .filter((candidate) => {
      if (!candidate.key.startsWith("listing.")) return false;
      if (!["active", "approved", "scheduled"].includes(candidate.status)) {
        return false;
      }
      const { scope } = candidate;
      return (
        (scope.marketCodes.length === 0 ||
          scope.marketCodes.includes(marketCode)) &&
        (scope.audiences.length === 0 ||
          scope.audiences.includes(input.audience)) &&
        (scope.categoryIds.length === 0 ||
          (!!input.categoryId &&
            scope.categoryIds.includes(input.categoryId))) &&
        (scope.planIds.length === 0 ||
          (!!input.planId && scope.planIds.includes(input.planId)))
      );
    })
    .sort((left, right) => {
      const scopeSize = (candidate: (typeof candidates)[number]) =>
        candidate.scope.categoryIds.length +
        candidate.scope.planIds.length +
        candidate.scope.audiences.length;
      return (
        right.priority - left.priority ||
        scopeSize(right) - scopeSize(left) ||
        left.id.localeCompare(right.id)
      );
    });

  const resolvedRule = candidates[0];
  const planProductId =
    PLAN_PRODUCT_IDS[input.planId || ""] ||
    (input.audience === "individual"
      ? "listing.standard.individual"
      : "plan.pro.starter");
  const planProduct = BASELINE_MONETIZATION_CATALOG.products.find(
    (candidate) => candidate.id === planProductId,
  );
  const productQuota = planProduct?.entitlements.find(
    (candidate) => candidate.key === "maxActiveListings",
  )?.value;
  const ruleQuota = resolvedRule?.outcome.quotaLimit;
  const categorySpecific = !!resolvedRule?.scope.categoryIds.length;

  return {
    eligible: resolvedRule?.outcome.eligible ?? true,
    quotaLimit:
      categorySpecific || typeof productQuota !== "number"
        ? (ruleQuota ?? 0)
        : productQuota,
    durationDays:
      resolvedRule?.outcome.durationDays ||
      planProduct?.prices[0]?.durationDays ||
      60,
    reasonCode: resolvedRule?.outcome.reasonCode || "STANDARD_LISTING_INCLUDED",
    configurationVersionId:
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
  };
}
