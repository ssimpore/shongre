import {
  DETERMINISTIC_DEMO_CURRENCY_CATALOG,
  currencyCodeSchema,
  currencyDefinitionUpdateSchema,
  exchangeRateUpdateSchema,
  type CurrencyCatalog,
  type CurrencyDefinition,
  type CurrencyDefinitionUpdate,
  type ExchangeRate,
  type ExchangeRateUpdate,
} from "@shongre/contracts";
import type { CurrenciesServiceContract } from "../../contracts/currencies.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { requireDemoCapability } from "./demo-authorization";
import { marketService } from "../../../domains/market/market.service";

export class DemoCurrenciesService implements CurrenciesServiceContract {
  private catalog: CurrencyCatalog = structuredClone(
    DETERMINISTIC_DEMO_CURRENCY_CATALOG,
  );

  reset(): void {
    this.catalog = structuredClone(DETERMINISTIC_DEMO_CURRENCY_CATALOG);
  }

  async getPublicCatalog(): Promise<CurrencyCatalog> {
    await simulateNetworkDelay();
    const enabledCodes = new Set(
      this.catalog.currencies
        .filter((currency) => currency.enabled)
        .map((currency) => currency.code),
    );
    return {
      generatedAt: this.catalog.generatedAt,
      currencies: this.catalog.currencies
        .filter((currency) => currency.enabled)
        .map((currency) => ({ ...currency })),
      rates: this.catalog.rates
        .filter(
          (rate) =>
            rate.enabled &&
            enabledCodes.has(rate.baseCurrency) &&
            enabledCodes.has(rate.quoteCurrency),
        )
        .map((rate) => ({ ...rate })),
    };
  }

  async getAdminCatalog(): Promise<CurrencyCatalog> {
    await simulateNetworkDelay();
    requireDemoCapability("market.manage");
    return structuredClone(this.catalog);
  }

  async upsertCurrency(
    rawCode: string,
    rawInput: CurrencyDefinitionUpdate,
  ): Promise<CurrencyDefinition> {
    await simulateNetworkDelay();
    requireDemoCapability("market.configure");
    const code = currencyCodeSchema.parse(rawCode.trim().toUpperCase());
    const input = currencyDefinitionUpdateSchema.parse(rawInput);
    if (
      !input.enabled &&
      marketService
        .getMarkets()
        .some(
          (market) =>
            market.currency === code ||
            market.supportedCurrencies.includes(code),
        )
    ) {
      throw new Error(
        `Retirez d’abord ${code} des marchés qui l’utilisent comme devise.`,
      );
    }
    const index = this.catalog.currencies.findIndex(
      (currency) => currency.code === code,
    );
    const previous = index >= 0 ? this.catalog.currencies[index] : undefined;
    const now = new Date().toISOString();
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
    return { ...currency };
  }

  async upsertExchangeRate(
    rawBaseCurrency: string,
    rawQuoteCurrency: string,
    rawInput: ExchangeRateUpdate,
  ): Promise<ExchangeRate> {
    await simulateNetworkDelay();
    requireDemoCapability("market.configure");
    const baseCurrency = currencyCodeSchema.parse(
      rawBaseCurrency.trim().toUpperCase(),
    );
    const quoteCurrency = currencyCodeSchema.parse(
      rawQuoteCurrency.trim().toUpperCase(),
    );
    if (baseCurrency === quoteCurrency) {
      throw new Error("Les deux devises de la paire doivent être différentes.");
    }
    const input = exchangeRateUpdateSchema.parse(rawInput);
    const definitions = new Map(
      this.catalog.currencies.map((currency) => [currency.code, currency]),
    );
    if (!definitions.has(baseCurrency) || !definitions.has(quoteCurrency)) {
      throw new Error("Créez les deux devises avant leur taux de change.");
    }
    if (
      input.enabled &&
      (!definitions.get(baseCurrency)?.enabled ||
        !definitions.get(quoteCurrency)?.enabled)
    ) {
      throw new Error("Un taux actif exige deux devises activées.");
    }
    if (input.enabled && Date.parse(input.expiresAt) <= Date.now()) {
      throw new Error("Un taux actif ne peut pas être déjà expiré.");
    }
    if (input.enabled && Date.parse(input.asOf) > Date.now()) {
      throw new Error("Un taux actif ne peut pas avoir une date future.");
    }
    const index = this.catalog.rates.findIndex(
      (rate) =>
        rate.baseCurrency === baseCurrency &&
        rate.quoteCurrency === quoteCurrency,
    );
    const previous = index >= 0 ? this.catalog.rates[index] : undefined;
    const now = new Date().toISOString();
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
    return { ...rate };
  }
}

export const demoCurrenciesService = new DemoCurrenciesService();
