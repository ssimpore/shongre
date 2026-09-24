import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { minorToMajorAmount } from "@shongre/shared";
import { AppError } from "../errors/app-error.js";

export interface MarketPricingRule {
  /** Share of the item amount, e.g. 0.04 for 4 %. */
  protectionFeeRate: number;
  /** Fixed fee in the minor unit of the order currency. */
  protectionFixedFeeMinor: number;
}

export interface EscrowOrderBreakdown {
  itemAmountMinor: number;
  protectionFeeMinor: number;
  shippingFeeMinor: number;
  totalChargedMinor: number;
  escrowSecuredAmountMinor: number;
  itemAmount: number;
  protectionFee: number;
  shippingFee: number;
  totalCharged: number;
  escrowSecuredAmount: number;
  sellerNetProceeds: number;
  platformMargin: number;
}

export const DEFAULT_MARKET_RULES: Record<string, MarketPricingRule> =
  Object.fromEntries(
    BASELINE_MONETIZATION_CATALOG.rules
      .filter((rule) => rule.key.startsWith("fees.buyer_protection."))
      .flatMap((rule) =>
        rule.scope.marketCodes.map((marketCode) => [
          marketCode,
          {
            protectionFeeRate: (rule.outcome.feeRateBps || 0) / 10_000,
            protectionFixedFeeMinor: rule.outcome.fixedFeeMinor || 0,
          },
        ]),
      ),
  );

function nonNegativeMinor(amount: number | undefined): number {
  return Math.max(0, Math.round(Number(amount) || 0));
}

/**
 * Integer arithmetic in the order currency's minor unit. The major-unit fields
 * are projections through that currency's own exponent, so a zero-decimal
 * currency such as XOF is never divided by a hundred it does not have.
 */
export function calculateOrderTotal(params: {
  itemAmountMinor: number;
  shippingFeeMinor?: number;
  currency: string;
  marketCode: string;
  ruleOverride?: Partial<MarketPricingRule>;
}): EscrowOrderBreakdown {
  const baseRule = DEFAULT_MARKET_RULES[params.marketCode.toUpperCase()];
  // A market without an approved buyer-protection rule cannot take a protected
  // payment; it is never priced with another market's fee.
  if (!baseRule)
    throw new AppError({
      code: "CONFLICT",
      message: "Le paiement protégé n’est pas disponible sur ce marché.",
    });
  const itemAmountMinor = nonNegativeMinor(params.itemAmountMinor);
  const shippingFeeMinor = nonNegativeMinor(params.shippingFeeMinor);
  const rate =
    params.ruleOverride?.protectionFeeRate ?? baseRule.protectionFeeRate;
  const fixedMinor = nonNegativeMinor(
    params.ruleOverride?.protectionFixedFeeMinor ??
      baseRule.protectionFixedFeeMinor,
  );

  const protectionFeeMinor = Math.round(itemAmountMinor * rate) + fixedMinor;
  const totalChargedMinor =
    itemAmountMinor + protectionFeeMinor + shippingFeeMinor;
  const escrowSecuredAmountMinor = itemAmountMinor + shippingFeeMinor;
  const major = (amountMinor: number) =>
    minorToMajorAmount(amountMinor, params.currency);

  return {
    itemAmountMinor,
    protectionFeeMinor,
    shippingFeeMinor,
    totalChargedMinor,
    escrowSecuredAmountMinor,
    itemAmount: major(itemAmountMinor),
    protectionFee: major(protectionFeeMinor),
    shippingFee: major(shippingFeeMinor),
    totalCharged: major(totalChargedMinor),
    escrowSecuredAmount: major(escrowSecuredAmountMinor),
    sellerNetProceeds: major(itemAmountMinor),
    platformMargin: major(protectionFeeMinor),
  };
}
