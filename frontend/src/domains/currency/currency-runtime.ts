import type {
  CurrencyCatalog,
  CurrencyDefinition,
  Money,
  MoneyConversionProjection,
} from "@shongre/contracts";
import {
  convertMoney,
  type CurrencyConversionErrorCode,
} from "@shongre/shared/currency-conversion";
import { majorToMinorAmount, minorToMajorAmount } from "@shongre/shared/money";
import { formatPrice } from "../../utilities/formatters";

export type CurrencyConversionIssue = CurrencyConversionErrorCode;

export interface CurrencyRuntime {
  availableCurrencies(
    supportedCurrencies: readonly string[],
  ): CurrencyDefinition[];
  project(money: Money, targetCurrency: string): MoneyConversionProjection;
  conversionIssue(
    sourceCurrency: string,
    targetCurrency: string,
  ): CurrencyConversionIssue | null;
  formatLegacyPrice(
    amount: number,
    sourceCurrency: string,
    targetCurrency: string,
    locale: string,
    options?: { showCurrency?: boolean; isFreeDonation?: boolean },
  ): string;
}

function conversionErrorCode(error: unknown): CurrencyConversionIssue {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code as CurrencyConversionIssue;
  }
  return "INVALID_RATE";
}

export function createCurrencyRuntime(
  catalog: CurrencyCatalog,
): CurrencyRuntime {
  const convert = (money: Money, targetCurrency: string) =>
    convertMoney(money, targetCurrency, catalog);

  return {
    availableCurrencies(supportedCurrencies) {
      const allowed = new Set(supportedCurrencies);
      return catalog.currencies.filter(
        (currency) => currency.enabled && allowed.has(currency.code),
      );
    },
    project(money, targetCurrency) {
      try {
        return convert(money, targetCurrency);
      } catch {
        return {
          original: { ...money },
          display: { ...money },
          converted: false,
          estimated: false,
        };
      }
    },
    conversionIssue(sourceCurrency, targetCurrency) {
      if (sourceCurrency === targetCurrency) return null;
      try {
        convert({ amountMinor: 0, currency: sourceCurrency }, targetCurrency);
        return null;
      } catch (error) {
        return conversionErrorCode(error);
      }
    },
    formatLegacyPrice(amount, sourceCurrency, targetCurrency, locale, options) {
      try {
        const projection = convert(
          {
            amountMinor: majorToMinorAmount(amount, sourceCurrency, locale),
            currency: sourceCurrency,
          },
          targetCurrency,
        );
        const formatted = formatPrice(
          minorToMajorAmount(
            projection.display.amountMinor,
            projection.display.currency,
            locale,
          ),
          {
            ...options,
            locale,
            currency: projection.display.currency,
          },
        );
        return projection.estimated ? `≈ ${formatted}` : formatted;
      } catch {
        return formatPrice(amount, {
          ...options,
          locale,
          currency: sourceCurrency,
        });
      }
    },
  };
}
