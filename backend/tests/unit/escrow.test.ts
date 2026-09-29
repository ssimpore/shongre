import { describe, it, expect } from "vitest";
import { calculateOrderTotal } from "../../src/shared/money/escrow.js";
import { AppError } from "../../src/shared/errors/app-error.js";

describe("Escrow & Order Calculation Engine", () => {
  it("calculates standard France protection fee correctly (4% + 0.70€)", () => {
    const res = calculateOrderTotal({
      itemAmountMinor: 10_000,
      shippingFeeMinor: 500,
      currency: "EUR",
      marketCode: "FR",
    });
    // 100 * 0.04 + 0.70 = 4.70
    expect(res.protectionFeeMinor).toBe(470);
    expect(res.protectionFee).toBe(4.7);
    // 100 + 4.70 + 5 = 109.70
    expect(res.totalChargedMinor).toBe(10_970);
    expect(res.totalCharged).toBe(109.7);
    // 100 + 5 = 105
    expect(res.escrowSecuredAmount).toBe(105);
    expect(res.sellerNetProceeds).toBe(100);
    expect(res.platformMargin).toBe(4.7);
  });

  it("calculates Belgian market fee correctly (4.5% + 0.80€)", () => {
    const res = calculateOrderTotal({
      itemAmountMinor: 20_000,
      shippingFeeMinor: 1_000,
      currency: "EUR",
      marketCode: "BE",
    });
    // 200 * 0.045 + 0.80 = 9.80
    expect(res.protectionFee).toBe(9.8);
    expect(res.totalCharged).toBe(219.8);
    expect(res.escrowSecuredAmount).toBe(210);
  });

  it("handles 0 euro shipping fee for hand delivery", () => {
    const res = calculateOrderTotal({
      itemAmountMinor: 5_000,
      currency: "EUR",
      marketCode: "FR",
    });
    // 50 * 0.04 + 0.70 = 2.70
    expect(res.protectionFee).toBe(2.7);
    expect(res.totalCharged).toBe(52.7);
    expect(res.escrowSecuredAmount).toBe(50);
  });

  it("handles explicit rule override without losing precision", () => {
    const res = calculateOrderTotal({
      itemAmountMinor: 100_000,
      currency: "EUR",
      marketCode: "FR",
      ruleOverride: { protectionFeeRate: 0.02, protectionFixedFeeMinor: 0 },
    });
    expect(res.protectionFee).toBe(20.0);
    expect(res.totalCharged).toBe(1020.0);
  });

  it("keeps a zero-decimal currency in whole units", () => {
    // 25 000 XOF at 4 % + 350 XOF: the franc has no minor subdivision, so the
    // minor and major amounts are the same number.
    const res = calculateOrderTotal({
      itemAmountMinor: 25_000,
      shippingFeeMinor: 1_500,
      currency: "XOF",
      marketCode: "FR",
      ruleOverride: { protectionFeeRate: 0.04, protectionFixedFeeMinor: 350 },
    });
    expect(res.protectionFeeMinor).toBe(1_350);
    expect(res.totalChargedMinor).toBe(27_850);
    expect(res.totalCharged).toBe(27_850);
    expect(res.escrowSecuredAmount).toBe(26_500);
    expect(res.sellerNetProceeds).toBe(25_000);
  });

  it("refuses a market with no approved buyer-protection rule", () => {
    expect(() =>
      calculateOrderTotal({
        itemAmountMinor: 25_000,
        currency: "XOF",
        marketCode: "SN",
      }),
    ).toThrow(AppError);
  });
});
