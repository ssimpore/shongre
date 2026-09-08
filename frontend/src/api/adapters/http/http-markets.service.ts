import {
  MarketsServiceContract,
  type CountryConfigChangeInput,
  type MarketConfigurationChangeRequest,
} from "../../contracts/markets.contract";
import { apiOperation } from "./generated-api-operation";
import type { CountryMarketDefinition } from "../../contracts/markets.contract";
import type {
  CountryConfig,
  MarketDetectionRecommendation,
} from "@shongre/contracts/market-country";
import type { MarketCoordinateDetectionInput } from "../../contracts/markets.contract";
import { BOOTSTRAP_MARKETS } from "../../../domains/market/market.bootstrap";
import type { Market } from "../../../domains/market/market.types";

export class HttpMarketsService implements MarketsServiceContract {
  async loadRuntimeMarkets(): Promise<Market[]> {
    const definitions = await this.getAllMarkets();
    return definitions.flatMap((definition) => {
      const bootstrap = BOOTSTRAP_MARKETS.find(
        (candidate) => candidate.code === definition.code,
      );
      if (!bootstrap) return [];
      const provider = definition.payments.providerIds.find((id) =>
        id.includes("mangopay"),
      )
        ? "mangopay_escrow"
        : definition.payments.providerIds.find((id) => id.includes("stripe"))
          ? "stripe_connect"
          : "none";
      return [
        {
          ...bootstrap,
          id: definition.marketId,
          countryCode: definition.countryCode,
          name: definition.name,
          flag: definition.flag,
          status: definition.launchStatus,
          isDefault: Boolean(definition.isDefault),
          defaultLocale: definition.defaultLocale,
          currency: definition.currency,
          supportedCurrencies: [...definition.supportedCurrencies],
          currencySymbol: definition.currencySymbol || definition.currency,
          version: definition.version ?? bootstrap.version,
          configuration: {
            ...bootstrap.configuration,
            general: {
              ...bootstrap.configuration.general,
              name: definition.name,
              tagline: definition.launchContent.title,
              launchState:
                definition.launchStatus === "active"
                  ? "full"
                  : "selected_cities",
            },
            localization: {
              ...bootstrap.configuration.localization,
              defaultLocale: definition.defaultLocale,
              defaultCurrency: definition.currency,
              currencySymbol: definition.currencySymbol || definition.currency,
              timezone: definition.timezone,
              phonePrefix: definition.phoneCountryCode,
            },
            payments: {
              ...bootstrap.configuration.payments,
              enabled: definition.payments.enabled,
              provider,
            },
            delivery: {
              ...bootstrap.configuration.delivery,
              enabled: definition.capabilities.delivery,
            },
            taxes: {
              ...bootstrap.configuration.taxes,
              taxEnabled: definition.taxes.mode === "configured",
              vatRateStandard:
                (definition.taxes.defaultVatRateBps ?? 0) / 10_000,
              pricesTaxInclusive: definition.taxes.pricingIncludesTax,
            },
            features: {
              ...bootstrap.configuration.features,
              savedSearchesEnabled: definition.capabilities.discovery,
              proStorefrontsEnabled: definition.capabilities.discovery,
            },
          },
        },
      ];
    });
  }

  detectProbableCountry(): Promise<MarketDetectionRecommendation> {
    return apiOperation<MarketDetectionRecommendation, "detectProbableMarket">(
      "detectProbableMarket",
      {},
    );
  }

  detectCountryFromCoordinates(
    input: MarketCoordinateDetectionInput,
  ): Promise<MarketDetectionRecommendation> {
    return apiOperation<
      MarketDetectionRecommendation,
      "detectMarketFromCoordinates"
    >("detectMarketFromCoordinates", { body: input });
  }

  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    return apiOperation<CountryMarketDefinition[], "getMarkets">(
      "getMarkets",
      {},
    );
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    return apiOperation<CountryMarketDefinition, "getMarketsByCode">(
      "getMarketsByCode",
      { path: { code: code } },
    );
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    return apiOperation<CountryMarketDefinition, "getMarketsActive">(
      "getMarketsActive",
      {},
    );
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    return apiOperation<CountryMarketDefinition, "postMarketsActive">(
      "postMarketsActive",
      {
        body: {
          code,
        },
      },
    );
  }

  async getEffectiveMarketConfig(
    code: string,
  ): Promise<CountryMarketDefinition> {
    return apiOperation<CountryMarketDefinition, "getMarketsEffectiveByCode">(
      "getMarketsEffectiveByCode",
      { path: { code: code } },
    );
  }

  updateCountryConfiguration(
    code: string,
    input: CountryConfigChangeInput,
  ): Promise<MarketConfigurationChangeRequest> {
    return apiOperation<
      MarketConfigurationChangeRequest,
      "patchAdminCountriesByCode"
    >("patchAdminCountriesByCode", { path: { code: code }, body: input });
  }

  listCountryConfigurationChanges(
    code: string,
  ): Promise<readonly MarketConfigurationChangeRequest[]> {
    return apiOperation<
      readonly MarketConfigurationChangeRequest[],
      "getAdminCountriesByCodeChanges"
    >("getAdminCountriesByCodeChanges", { path: { code: code } });
  }

  approveCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<CountryConfig> {
    return apiOperation<
      CountryConfig,
      "postAdminCountriesByCodeChangesByIdApprove"
    >("postAdminCountriesByCodeChangesByIdApprove", {
      path: { code: code, id: requestId },
      body: { reason },
    });
  }

  rejectCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<{ rejected: true }> {
    return apiOperation<
      { rejected: true },
      "postAdminCountriesByCodeChangesByIdReject"
    >("postAdminCountriesByCodeChangesByIdReject", {
      path: { code: code, id: requestId },
      body: { reason },
    });
  }
}

export const httpMarketsService = new HttpMarketsService();
