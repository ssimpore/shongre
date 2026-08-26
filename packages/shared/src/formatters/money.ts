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
  const factor = 10 ** getCurrencyMinorUnitDigits(currency, locale);
  return formatMoney(
    { amountMinor: Math.round(amount * factor), currency },
    locale,
  );
}
