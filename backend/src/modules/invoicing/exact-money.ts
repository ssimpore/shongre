import type {
  InvoicingLine,
  InvoicingLineInput,
} from "@shongre/contracts/invoicing";

const DECIMAL_SCALE = 1_000_000n;
const PRICE_QUANTITY_DIVISOR = DECIMAL_SCALE * DECIMAL_SCALE;
const BASIS_POINTS_DIVISOR = 10_000n;

export class InvoicingCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoicingCalculationError";
  }
}

function parseScaledDecimal(value: string): bigint {
  const match = /^(0|[1-9]\d{0,17})(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) {
    throw new InvoicingCalculationError(
      "Decimal values must be non-negative and have no more than six fractional digits.",
    );
  }
  const fraction = (match[2] ?? "").padEnd(6, "0");
  return BigInt(match[1]) * DECIMAL_SCALE + BigInt(fraction || "0");
}

/** Round a non-negative rational value to the nearest integer, ties away from zero. */
function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new InvoicingCalculationError(
      "The Phase 1 calculator accepts only non-negative values.",
    );
  }
  return (numerator + denominator / 2n) / denominator;
}

function toSafeMinor(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new InvoicingCalculationError(
      "Calculated minor-unit amount exceeds the supported safe range.",
    );
  }
  return result;
}

export interface CalculatedInvoiceLines {
  lines: InvoicingLine[];
  taxBreakdowns: Array<{
    taxRateBps: number;
    taxCategory: InvoicingLine["taxCategory"];
    taxableAmountMinor: number;
    taxAmountMinor: number;
  }>;
  subtotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
}

/**
 * Exact Phase 1 line policy:
 *
 * 1. quantity and minor-unit price are parsed as scaled integers (six digits);
 * 2. each net line is rounded half-up to a minor unit;
 * 3. each line's tax is rounded half-up from its immutable net minor amount;
 * 4. document totals are sums of those exact line results.
 */
export function calculateInvoiceLines(
  inputs: readonly InvoicingLineInput[],
  createId: (position: number) => string,
): CalculatedInvoiceLines {
  if (inputs.length === 0) {
    throw new InvoicingCalculationError("An invoice requires at least one line.");
  }

  const taxGroups = new Map<
    string,
    {
      taxRateBps: number;
      taxCategory: InvoicingLine["taxCategory"];
      taxableMinor: bigint;
      taxMinor: bigint;
    }
  >();
  let subtotal = 0n;
  let totalTax = 0n;

  const lines = inputs.map((input, index): InvoicingLine => {
    const quantity = parseScaledDecimal(input.quantity);
    if (quantity <= 0n) {
      throw new InvoicingCalculationError("Line quantity must be greater than zero.");
    }
    const unitPrice = parseScaledDecimal(input.unitPriceMinorDecimal);
    const net = divideHalfUp(
      quantity * unitPrice,
      PRICE_QUANTITY_DIVISOR,
    );
    const tax = divideHalfUp(
      net * BigInt(input.taxRateBps),
      BASIS_POINTS_DIVISOR,
    );
    const gross = net + tax;
    subtotal += net;
    totalTax += tax;

    const groupKey = `${input.taxCategory}:${input.taxRateBps}`;
    const group = taxGroups.get(groupKey) ?? {
      taxRateBps: input.taxRateBps,
      taxCategory: input.taxCategory,
      taxableMinor: 0n,
      taxMinor: 0n,
    };
    group.taxableMinor += net;
    group.taxMinor += tax;
    taxGroups.set(groupKey, group);

    return {
      ...input,
      id: createId(index + 1),
      position: index + 1,
      netAmountMinor: toSafeMinor(net),
      taxAmountMinor: toSafeMinor(tax),
      grossAmountMinor: toSafeMinor(gross),
    };
  });

  const total = subtotal + totalTax;
  return {
    lines,
    taxBreakdowns: [...taxGroups.values()]
      .sort(
        (left, right) =>
          left.taxCategory.localeCompare(right.taxCategory) ||
          left.taxRateBps - right.taxRateBps,
      )
      .map((group) => ({
        taxRateBps: group.taxRateBps,
        taxCategory: group.taxCategory,
        taxableAmountMinor: toSafeMinor(group.taxableMinor),
        taxAmountMinor: toSafeMinor(group.taxMinor),
      })),
    subtotalMinor: toSafeMinor(subtotal),
    taxTotalMinor: toSafeMinor(totalTax),
    totalMinor: toSafeMinor(total),
  };
}

