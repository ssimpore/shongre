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

export const DEFAULT_MARKET_RULES: Record<string, MarketPricingRule> = {
  FR: { protectionFeeRate: 0.04, protectionFixedFee: 0.7 },
  BE: { protectionFeeRate: 0.045, protectionFixedFee: 0.8 },
  CH: { protectionFeeRate: 0.035, protectionFixedFee: 1.0 },
  LU: { protectionFeeRate: 0.04, protectionFixedFee: 0.7 },
  DE: { protectionFeeRate: 0.04, protectionFixedFee: 0.7 },
  ES: { protectionFeeRate: 0.045, protectionFixedFee: 0.7 },
};

export function calculateOrderTotal(params: {
  itemAmount: number;
  shippingFee?: number;
  marketCode?: string;
  ruleOverride?: Partial<MarketPricingRule>;
}): EscrowOrderBreakdown {
  const itemAmount = Math.max(0, Number(params.itemAmount) || 0);
  const shippingFee = Math.max(0, Number(params.shippingFee) || 0);
  const baseRule = DEFAULT_MARKET_RULES[params.marketCode || 'FR'] || DEFAULT_MARKET_RULES.FR;

  const rate = params.ruleOverride?.protectionFeeRate ?? baseRule.protectionFeeRate;
  const fixed = params.ruleOverride?.protectionFixedFee ?? baseRule.protectionFixedFee;

  // Round protection fee to 2 decimal places
  const protectionFee = Math.round((itemAmount * rate + fixed) * 100) / 100;
  const totalCharged = Math.round((itemAmount + protectionFee + shippingFee) * 100) / 100;
  const escrowSecuredAmount = Math.round((itemAmount + shippingFee) * 100) / 100;
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
