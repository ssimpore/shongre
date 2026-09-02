import {
  DETERMINISTIC_DEMO_CURRENCY_CATALOG,
  type CurrencyCatalog,
  type CurrencyDefinition,
  type CurrencyDefinitionUpdate,
  type ExchangeRate,
  type ExchangeRateUpdate,
} from "@shongre/contracts";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface ICurrencyRepository {
  getCatalog(includeDisabled: boolean): Promise<CurrencyCatalog>;
  upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
    actorId: string,
  ): Promise<CurrencyDefinition>;
  upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
    actorId: string,
  ): Promise<ExchangeRate>;
}

function cloneCatalog(catalog: CurrencyCatalog): CurrencyCatalog {
  return structuredClone(catalog);
}

export class DemoCurrencyRepository implements ICurrencyRepository {
  private catalog = cloneCatalog(DETERMINISTIC_DEMO_CURRENCY_CATALOG);

  reset(): void {
    this.catalog = cloneCatalog(DETERMINISTIC_DEMO_CURRENCY_CATALOG);
  }

  async getCatalog(includeDisabled: boolean): Promise<CurrencyCatalog> {
    const catalog = cloneCatalog(this.catalog);
    if (includeDisabled) return catalog;
    const enabledCodes = new Set(
      catalog.currencies
        .filter((currency) => currency.enabled)
        .map((currency) => currency.code),
    );
    return {
      ...catalog,
      currencies: catalog.currencies.filter((currency) => currency.enabled),
      rates: catalog.rates.filter(
        (rate) =>
          rate.enabled &&
          enabledCodes.has(rate.baseCurrency) &&
          enabledCodes.has(rate.quoteCurrency),
      ),
    };
  }

  async upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
    _actorId: string,
  ): Promise<CurrencyDefinition> {
    const now = new Date().toISOString();
    const index = this.catalog.currencies.findIndex(
      (currency) => currency.code === code,
    );
    const previous = index >= 0 ? this.catalog.currencies[index] : undefined;
    const currency: CurrencyDefinition = {
      code,
      displayName: input.displayName,
      symbol: input.symbol,
      minorUnitDigits: input.minorUnitDigits,
      enabled: input.enabled,
      version: (previous?.version || 0) + 1,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    if (index >= 0) this.catalog.currencies[index] = currency;
    else this.catalog.currencies.push(currency);
    this.catalog.generatedAt = now;
    return structuredClone(currency);
  }

  async upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
    _actorId: string,
  ): Promise<ExchangeRate> {
    const now = new Date().toISOString();
    const index = this.catalog.rates.findIndex(
      (rate) =>
        rate.baseCurrency === baseCurrency &&
        rate.quoteCurrency === quoteCurrency,
    );
    const previous = index >= 0 ? this.catalog.rates[index] : undefined;
    const rate: ExchangeRate = {
      baseCurrency,
      quoteCurrency,
      rateNumerator: input.rateNumerator,
      rateDenominator: input.rateDenominator,
      source: input.source,
      asOf: input.asOf,
      expiresAt: input.expiresAt,
      enabled: input.enabled,
      version: (previous?.version || 0) + 1,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    if (index >= 0) this.catalog.rates[index] = rate;
    else this.catalog.rates.push(rate);
    this.catalog.generatedAt = now;
    return structuredClone(rate);
  }
}

export class PostgresCurrencyRepository implements ICurrencyRepository {
  async getCatalog(includeDisabled: boolean): Promise<CurrencyCatalog> {
    try {
      const client = getSupabaseAdminClient();
      let currencyQuery = client
        .from("currency_definitions")
        .select("*")
        .order("code");
      let rateQuery = client
        .from("currency_exchange_rates")
        .select("*")
        .order("base_currency")
        .order("quote_currency");
      if (!includeDisabled) {
        currencyQuery = currencyQuery.eq("enabled", true);
        rateQuery = rateQuery.eq("enabled", true);
      }
      const [currenciesResult, ratesResult] = await Promise.all([
        currencyQuery,
        rateQuery,
      ]);
      if (currenciesResult.error) {
        databaseFailure(
          "currencies.getCatalog.currencies",
          currenciesResult.error,
        );
      }
      if (ratesResult.error) {
        databaseFailure("currencies.getCatalog.rates", ratesResult.error);
      }
      const currencies = (currenciesResult.data || []).map((row) =>
        this.mapCurrency(row),
      );
      const enabledCodes = new Set(
        currencies
          .filter((currency) => currency.enabled)
          .map(({ code }) => code),
      );
      const rates = (ratesResult.data || [])
        .map((row) => this.mapRate(row))
        .filter(
          (rate) =>
            includeDisabled ||
            (enabledCodes.has(rate.baseCurrency) &&
              enabledCodes.has(rate.quoteCurrency)),
        );
      return {
        currencies,
        rates,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      databaseFailure("currencies.getCatalog", error);
    }
  }

  async upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
    actorId: string,
  ): Promise<CurrencyDefinition> {
    try {
      const { data, error } = await getSupabaseAdminClient().rpc(
        "upsert_currency_definition",
        {
          p_code: code,
          p_display_name: input.displayName,
          p_symbol: input.symbol,
          p_minor_unit_digits: input.minorUnitDigits,
          p_enabled: input.enabled,
          p_actor_id: actorId,
          p_reason: input.reason,
        },
      );
      if (error || !data?.[0]) {
        databaseFailure("currencies.upsertCurrency", error);
      }
      return this.mapCurrency(data[0]);
    } catch (error) {
      databaseFailure("currencies.upsertCurrency", error);
    }
  }

  async upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
    actorId: string,
  ): Promise<ExchangeRate> {
    try {
      const { data, error } = await getSupabaseAdminClient().rpc(
        "upsert_currency_exchange_rate",
        {
          p_base_currency: baseCurrency,
          p_quote_currency: quoteCurrency,
          p_rate_numerator: input.rateNumerator,
          p_rate_denominator: input.rateDenominator,
          p_source: input.source,
          p_as_of: input.asOf,
          p_expires_at: input.expiresAt,
          p_enabled: input.enabled,
          p_actor_id: actorId,
          p_reason: input.reason,
        },
      );
      if (error || !data?.[0]) {
        databaseFailure("currencies.upsertExchangeRate", error);
      }
      return this.mapRate(data[0]);
    } catch (error) {
      databaseFailure("currencies.upsertExchangeRate", error);
    }
  }

  private mapCurrency(row: {
    code: string;
    display_name: string;
    symbol: string;
    minor_unit_digits: number;
    enabled: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }): CurrencyDefinition {
    return {
      code: row.code,
      displayName: row.display_name,
      symbol: row.symbol,
      minorUnitDigits: row.minor_unit_digits,
      enabled: row.enabled,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRate(row: {
    base_currency: string;
    quote_currency: string;
    rate_numerator: number;
    rate_denominator: number;
    source: string;
    as_of: string;
    expires_at: string;
    enabled: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }): ExchangeRate {
    return {
      baseCurrency: row.base_currency,
      quoteCurrency: row.quote_currency,
      rateNumerator: Number(row.rate_numerator),
      rateDenominator: Number(row.rate_denominator),
      source: row.source,
      asOf: row.as_of,
      expiresAt: row.expires_at,
      enabled: row.enabled,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
