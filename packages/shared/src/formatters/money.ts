import type { Money } from "@shongre/contracts";

/** Resolve the ISO currency exponent from the runtime's CLDR data. */
export function getCurrencyMinorUnitDigits(
  currency: string,
  locale?: string,
): number {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new RangeError(`Invalid ISO 4217 currency code: ${currency}`);
  }
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalized,
  }).resolvedOptions().maximumFractionDigits;
  return fractionDigits ?? 2;
}

export function minorToMajorAmount(
  amountMinor: number,
  currency: string,
  locale?: string,
): number {
  return amountMinor / 10 ** getCurrencyMinorUnitDigits(currency, locale);
}

/**
 * Boundary adapter for legacy major-unit values. Decimal text is normalized
 * before integer arithmetic so new contracts can remain minor-unit only.
 */
export function majorToMinorAmount(
  amount: number,
  currency: string,
  locale?: string,
): number {
  if (!Number.isFinite(amount)) throw new RangeError("Invalid money amount.");
  const digits = getCurrencyMinorUnitDigits(currency, locale);
  const sign = amount < 0 ? -1 : 1;
  const [whole = "0", fraction = ""] = Math.abs(amount)
    .toFixed(digits)
    .split(".");
  return (
    sign *
    (Number.parseInt(whole, 10) * 10 ** digits +
      Number.parseInt(fraction.padEnd(digits, "0") || "0", 10))
  );
}

export function formatMoney(money: Money, locale?: string): string {
  const fractionDigits = getCurrencyMinorUnitDigits(money.currency, locale);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(minorToMajorAmount(money.amountMinor, money.currency, locale));
}

/** Adapter for legacy view models that still carry major currency units. */
export function formatMajorMoney(
  amount: number,
  currency: string,
  locale?: string,
): string {
  return formatMoney(
    { amountMinor: majorToMinorAmount(amount, currency, locale), currency },
    locale,
  );
}
