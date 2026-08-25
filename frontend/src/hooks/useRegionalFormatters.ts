import { useCallback } from "react";
import type { Money } from "@shongre/contracts";
import { useMarketLocation } from "../app/providers/MarketLocationProvider";
import { formatMoney as formatMoneyValue } from "../utilities/formatters";

/**
 * Locale-aware presentation helpers backed by the active market preference.
 * UI modules should use this hook instead of pinning `fr-FR`, `EUR`, or a
 * market-specific number/date shape into a component.
 */
export function useRegionalFormatters() {
  const { currentCurrency, currentLocale } = useMarketLocation();

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(currentLocale, options).format(value),
    [currentLocale],
  );

  const formatMoney = useCallback(
    (money: Money) => formatMoneyValue(money, { locale: currentLocale }),
    [currentLocale],
  );

  const formatMoneyMinor = useCallback(
    (amountMinor: number, currency = currentCurrency) =>
      formatMoneyValue({ amountMinor, currency }, { locale: currentLocale }),
    [currentCurrency, currentLocale],
  );

  const formatDate = useCallback(
    (
      value: string | number | Date | undefined,
      options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
    ) =>
      value === undefined
        ? "—"
        : new Intl.DateTimeFormat(currentLocale, options).format(
            value instanceof Date ? value : new Date(value),
          ),
    [currentLocale],
  );

  const formatDateTime = useCallback(
    (value: string | number | Date | undefined) =>
      formatDate(value, { dateStyle: "medium", timeStyle: "short" }),
    [formatDate],
  );

  const formatPercentFromBps = useCallback(
    (basisPoints: number, maximumFractionDigits = 2) =>
      new Intl.NumberFormat(currentLocale, {
        style: "percent",
        maximumFractionDigits,
      }).format(basisPoints / 10_000),
    [currentLocale],
  );

  return {
    currentCurrency,
    currentLocale,
    formatDate,
    formatDateTime,
    formatMoney,
    formatMoneyMinor,
    formatNumber,
    formatPercentFromBps,
  };
}
