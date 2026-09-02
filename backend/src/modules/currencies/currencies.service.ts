import {
  currencyCodeSchema,
  currencyDefinitionUpdateSchema,
  exchangeRateUpdateSchema,
  type CurrencyCatalog,
  type CurrencyDefinition,
  type ExchangeRate,
} from "@shongre/contracts";
import {
  type ICurrencyRepository,
  type IMarketRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";

export class CurrenciesService {
  constructor(
    private currencyRepo: ICurrencyRepository = repositories.currencies,
    private marketRepo: IMarketRepository = repositories.markets,
  ) {}

  getPublicCatalog(): Promise<CurrencyCatalog> {
    return this.currencyRepo.getCatalog(false);
  }

  getAdminCatalog(): Promise<CurrencyCatalog> {
    return this.currencyRepo.getCatalog(true);
  }

  async upsertCurrency(
    rawCode: string,
    rawInput: unknown,
    actorId: string,
  ): Promise<CurrencyDefinition> {
    const code = currencyCodeSchema.parse(String(rawCode || "").toUpperCase());
    const input = currencyDefinitionUpdateSchema.parse(rawInput || {});
    if (!input.enabled) {
      const referencingMarkets = (await this.marketRepo.getAll()).filter(
        (market) =>
          market.currency === code || market.supportedCurrencies.includes(code),
      );
      if (referencingMarkets.length > 0) {
        throw new AppError({
          code: "CONFLICT",
          message: `Retirez d’abord ${code} des marchés suivants : ${referencingMarkets
            .map((market) => market.code)
            .join(", ")}.`,
        });
      }
    }
    const updated = await this.currencyRepo.upsertCurrency(
      code,
      input,
      actorId,
    );
    logger.warn("currency_definition_updated", {
      actorId,
      currency: code,
      enabled: updated.enabled,
      version: updated.version,
    });
    return updated;
  }

  async upsertExchangeRate(
    rawBaseCurrency: string,
    rawQuoteCurrency: string,
    rawInput: unknown,
    actorId: string,
  ): Promise<ExchangeRate> {
    const baseCurrency = currencyCodeSchema.parse(
      String(rawBaseCurrency || "").toUpperCase(),
    );
    const quoteCurrency = currencyCodeSchema.parse(
      String(rawQuoteCurrency || "").toUpperCase(),
    );
    if (baseCurrency === quoteCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une paire de change doit contenir deux devises différentes.",
      });
    }
    const input = exchangeRateUpdateSchema.parse(rawInput || {});
    const catalog = await this.currencyRepo.getCatalog(true);
    const definitions = new Map(
      catalog.currencies.map((currency) => [currency.code, currency]),
    );
    if (!definitions.has(baseCurrency) || !definitions.has(quoteCurrency)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les deux devises doivent exister avant la création du taux.",
      });
    }
    if (
      input.enabled &&
      (!definitions.get(baseCurrency)?.enabled ||
        !definitions.get(quoteCurrency)?.enabled)
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Un taux actif ne peut référencer une devise désactivée.",
      });
    }
    if (input.enabled && Date.parse(input.expiresAt) <= Date.now()) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un taux activé ne peut pas être déjà expiré.",
      });
    }
    if (input.enabled && Date.parse(input.asOf) > Date.now()) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un taux activé ne peut pas avoir une date de valeur future.",
      });
    }
    const updated = await this.currencyRepo.upsertExchangeRate(
      baseCurrency,
      quoteCurrency,
      input,
      actorId,
    );
    logger.warn("currency_exchange_rate_updated", {
      actorId,
      baseCurrency,
      quoteCurrency,
      source: updated.source,
      version: updated.version,
    });
    return updated;
  }
}

export const currenciesService = new CurrenciesService();
