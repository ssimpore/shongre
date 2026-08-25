import type { Money } from "@shongre/contracts";

/**
 * Fixed demo-scenario reporting rates from the EUR fixture currency.
 *
 * These are intentionally deterministic rather than live FX quotes. Production
 * reporting conversion will be owned by the backend and exposed through the
 * same service contracts.
 */
const DEMO_EUR_REPORTING_RATES = {
  EUR: { numerator: BigInt(1), denominator: BigInt(1) },
  CHF: { numerator: BigInt(94), denominator: BigInt(100) },
  XOF: { numerator: BigInt(655_957), denominator: BigInt(1_000) },
} as const;

type DemoReportingCurrency = keyof typeof DEMO_EUR_REPORTING_RATES;

export function convertDemoReportingMinorUnits(
  amountMinor: number,
  currency: string,
  sourceCurrency = "EUR",
): number {
  if (sourceCurrency === currency) return amountMinor;
  if (sourceCurrency !== "EUR") {
    throw new Error(
      `Unsupported demo reporting source currency: ${sourceCurrency}.`,
    );
  }
  const rate = DEMO_EUR_REPORTING_RATES[currency as DemoReportingCurrency];
  if (!rate) {
    throw new Error(`Unsupported demo reporting currency: ${currency}.`);
  }
  const scaled = BigInt(amountMinor) * rate.numerator;
  const half = rate.denominator / BigInt(2);
  const rounded =
    scaled >= BigInt(0)
      ? (scaled + half) / rate.denominator
      : (scaled - half) / rate.denominator;
  return Number(rounded);
}

export function convertDemoReportingMoney(
  money: Money,
  currency: string,
): Money {
  return {
    amountMinor: convertDemoReportingMinorUnits(
      money.amountMinor,
      currency,
      money.currency,
    ),
    currency,
  };
}
