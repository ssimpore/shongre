import type { Money } from "@shongre/contracts";

export function formatMoney(money: Money, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: money.amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}

/** Adapter for legacy view models that still carry major currency units. */
export function formatMajorMoney(
  amount: number,
  currency = "EUR",
  locale = "fr-FR",
): string {
  return formatMoney(
    { amountMinor: Math.round(amount * 100), currency },
    locale,
  );
}
