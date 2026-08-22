import { BASELINE_MONETIZATION_CATALOG } from '@shongre/contracts/monetization-catalog';

export interface MarketPricingRule {
  protectionFeeRate: number; // e.g. 0.04 (4%)
  protectionFixedFee: number; // e.g. 0.70 EUR
}

export interface EscrowOrderBreakdown {
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
      .filter((rule) => rule.key.startsWith('fees.buyer_protection.'))
      .flatMap((rule) =>
        rule.scope.marketCodes.map((marketCode) => [
          marketCode,
          {
            protectionFeeRate: (rule.outcome.feeRateBps || 0) / 10_000,
            protectionFixedFee: (rule.outcome.fixedFeeMinor || 0) / 100,
          },
        ]),
      ),
  );

export function calculateOrderTotal(params: {
  itemAmount: number;
  shippingFee?: number;
  marketCode?: string;
  ruleOverride?: Partial<MarketPricingRule>;
}): EscrowOrderBreakdown {
  const itemAmountMinor = Math.max(0, Math.round((Number(params.itemAmount) || 0) * 100));
  const shippingFeeMinor = Math.max(0, Math.round((Number(params.shippingFee) || 0) * 100));
  const itemAmount = itemAmountMinor / 100;
  const shippingFee = shippingFeeMinor / 100;
  const baseRule = DEFAULT_MARKET_RULES[params.marketCode || 'FR'] || DEFAULT_MARKET_RULES.FR;

  const rate = params.ruleOverride?.protectionFeeRate ?? baseRule.protectionFeeRate;
  const fixed = params.ruleOverride?.protectionFixedFee ?? baseRule.protectionFixedFee;

  const protectionFeeMinor = Math.round(itemAmountMinor * rate) + Math.round(fixed * 100);
  const protectionFee = protectionFeeMinor / 100;
  const totalCharged = (itemAmountMinor + protectionFeeMinor + shippingFeeMinor) / 100;
  const escrowSecuredAmount = (itemAmountMinor + shippingFeeMinor) / 100;
  const sellerNetProceeds = itemAmount;
  const platformMargin = protectionFee;

  return {
    itemAmount,
    protectionFee,
    shippingFee,
    totalCharged,
    escrowSecuredAmount,
    sellerNetProceeds,
    platformMargin,
  };
}
