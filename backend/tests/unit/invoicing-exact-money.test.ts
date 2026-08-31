import { describe, expect, it } from "vitest";
import { calculateInvoiceLines } from "../../src/modules/invoicing/exact-money.js";

describe("invoicing exact money", () => {
  it("calculates decimal quantities and tax without floating point", () => {
    const result = calculateInvoiceLines(
      [
        {
          description: "Conseil",
          quantity: "1.5",
          unit: "hour",
          unitPriceMinorDecimal: "1000",
          taxRateBps: 2000,
          taxCategory: "STANDARD",
        },
      ],
      (position) => `line-${position}`,
    );

    expect(result.lines[0]).toMatchObject({
      netAmountMinor: 1500,
      taxAmountMinor: 300,
      grossAmountMinor: 1800,
    });
    expect(result.totalMinor).toBe(1800);
  });

  it("rounds each line half-up and reconciles every total", () => {
    const result = calculateInvoiceLines(
      [
        {
          description: "Fraction A",
          quantity: "1",
          unit: "unit",
          unitPriceMinorDecimal: "0.5",
          taxRateBps: 0,
          taxCategory: "ZERO",
        },
        {
          description: "Fraction B",
          quantity: "3",
          unit: "unit",
          unitPriceMinorDecimal: "0.5",
          taxRateBps: 2000,
          taxCategory: "STANDARD",
        },
      ],
      (position) => `line-${position}`,
    );

    expect(result.lines.map((line) => line.netAmountMinor)).toEqual([1, 2]);
    expect(result.subtotalMinor).toBe(3);
    expect(result.taxTotalMinor).toBe(0);
    expect(result.totalMinor).toBe(
      result.lines.reduce((sum, line) => sum + line.grossAmountMinor, 0),
    );
  });

  it("keeps tax rates as separate immutable breakdowns", () => {
    const result = calculateInvoiceLines(
      [
        {
          description: "Standard",
          quantity: "2",
          unit: "unit",
          unitPriceMinorDecimal: "100",
          taxRateBps: 2000,
          taxCategory: "STANDARD",
        },
        {
          description: "Reduced",
          quantity: "1",
          unit: "unit",
          unitPriceMinorDecimal: "100",
          taxRateBps: 550,
          taxCategory: "REDUCED",
        },
      ],
      (position) => `line-${position}`,
    );

    expect(result.taxBreakdowns).toEqual([
      {
        taxRateBps: 550,
        taxCategory: "REDUCED",
        taxableAmountMinor: 100,
        taxAmountMinor: 6,
      },
      {
        taxRateBps: 2000,
        taxCategory: "STANDARD",
        taxableAmountMinor: 200,
        taxAmountMinor: 40,
      },
    ]);
  });
});
