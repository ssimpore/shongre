import type { Money } from "@shongre/contracts";

/** Empty input is unbounded; malformed or negative input remains invalid. */
export function parseMajorAmountInput(
  value: string,
  locale: string,
): number | undefined {
  if (!value.trim()) return undefined;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  const group = parts.find((part) => part.type === "group")?.value;
  let normalized = value.trim().replace(/\s/g, "");
  if (group && !/\s/.test(group)) {
    const [whole, fraction] = normalized.split(decimal);
    if (fraction?.includes(group)) return NaN;
    const groups = whole.split(group);
    if (
      groups.length > 1 &&
      (groups[0].length < 1 ||
        groups[0].length > 3 ||
        groups.slice(1).some((part) => part.length !== 3))
    )
      return NaN;
    normalized = normalized.split(group).join("");
  }
  normalized = normalized.replace(decimal, ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

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

/**
 * Compact marketplace formatting: preserve meaningful minor units while
 * omitting an all-zero decimal suffix that consumes scarce card width.
 */
export function formatCompactMoney(money: Money, locale?: string): string {
  const fractionDigits = getCurrencyMinorUnitDigits(money.currency, locale);
  const divisor = 10 ** fractionDigits;
  const hasFraction = money.amountMinor % divisor !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: hasFraction ? fractionDigits : 0,
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
