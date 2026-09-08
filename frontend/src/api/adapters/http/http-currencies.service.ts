import type {
  CurrencyCatalog,
  CurrencyDefinition,
  CurrencyDefinitionUpdate,
  ExchangeRate,
  ExchangeRateUpdate,
} from "@shongre/contracts/currency";
import { apiOperation } from "./generated-api-operation";
import type { CurrenciesServiceContract } from "../../contracts/currencies.contract";

export class HttpCurrenciesService implements CurrenciesServiceContract {
  getPublicCatalog(): Promise<CurrencyCatalog> {
    return apiOperation<CurrencyCatalog, "getCurrencyCatalog">(
      "getCurrencyCatalog",
      {},
    );
  }

  getAdminCatalog(): Promise<CurrencyCatalog> {
    return apiOperation<CurrencyCatalog, "getAdminCurrencyCatalog">(
      "getAdminCurrencyCatalog",
      {},
    );
  }

  upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
  ): Promise<CurrencyDefinition> {
    return apiOperation<CurrencyDefinition, "putAdminCurrency">(
      "putAdminCurrency",
      { path: { code: code }, body: input },
    );
  }

  upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
  ): Promise<ExchangeRate> {
    return apiOperation<ExchangeRate, "putAdminExchangeRate">(
      "putAdminExchangeRate",
      {
        path: { baseCurrency: baseCurrency, quoteCurrency: quoteCurrency },
        body: input,
      },
    );
  }
}

export const httpCurrenciesService = new HttpCurrenciesService();
