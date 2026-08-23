import { describe, it, expect } from "vitest";
import {
  calculateOrderTotal,
  DEFAULT_MARKET_RULES,
} from "../../src/shared/money/escrow.js";

describe("Escrow & Order Calculation Engine", () => {
  it("calculates standard France protection fee correctly (4% + 0.70€)", () => {
    const res = calculateOrderTotal({
      itemAmount: 100,
      shippingFee: 5,
      marketCode: "FR",
    });
    // 100 * 0.04 + 0.70 = 4.70
    expect(res.protectionFee).toBe(4.7);
    // 100 + 4.70 + 5 = 109.70
    expect(res.totalCharged).toBe(109.7);
    // 100 + 5 = 105
    expect(res.escrowSecuredAmount).toBe(105);
    expect(res.sellerNetProceeds).toBe(100);
    expect(res.platformMargin).toBe(4.7);
  });

  it("calculates Belgian market fee correctly (4.5% + 0.80€)", () => {
    const res = calculateOrderTotal({
      itemAmount: 200,
      shippingFee: 10,
      marketCode: "BE",
    });
    // 200 * 0.045 + 0.80 = 9.80
    expect(res.protectionFee).toBe(9.8);
    expect(res.totalCharged).toBe(219.8);
    expect(res.escrowSecuredAmount).toBe(210);
  });

  it("handles 0 euro shipping fee for hand delivery", () => {
    const res = calculateOrderTotal({
      itemAmount: 50,
      shippingFee: 0,
      marketCode: "FR",
    });
    // 50 * 0.04 + 0.70 = 2.70
    expect(res.protectionFee).toBe(2.7);
    expect(res.totalCharged).toBe(52.7);
    expect(res.escrowSecuredAmount).toBe(50);
  });

  it("handles explicit rule override without losing precision", () => {
    const res = calculateOrderTotal({
      itemAmount: 1000,
      shippingFee: 0,
      ruleOverride: { protectionFeeRate: 0.02, protectionFixedFee: 0.0 },
    });
    expect(res.protectionFee).toBe(20.0);
    expect(res.totalCharged).toBe(1020.0);
  });
});
