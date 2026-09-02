import type {
  CurrencyCatalog,
  CurrencyDefinition,
  CurrencyDefinitionUpdate,
  ExchangeRate,
  ExchangeRateUpdate,
} from "@shongre/contracts";
import type { CurrenciesServiceContract } from "../../contracts/currencies.contract";
import { httpClient } from "./http-client";

export class HttpCurrenciesService implements CurrenciesServiceContract {
  getPublicCatalog(): Promise<CurrencyCatalog> {
    return httpClient.get<CurrencyCatalog>("/currencies");
  }

  getAdminCatalog(): Promise<CurrencyCatalog> {
    return httpClient.get<CurrencyCatalog>("/admin/currencies");
  }

  upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
  ): Promise<CurrencyDefinition> {
    return httpClient.put<CurrencyDefinition>(
      `/admin/currencies/${encodeURIComponent(code)}`,
      input,
    );
  }

  upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
  ): Promise<ExchangeRate> {
    return httpClient.put<ExchangeRate>(
      `/admin/exchange-rates/${encodeURIComponent(baseCurrency)}/${encodeURIComponent(quoteCurrency)}`,
      input,
    );
  }
}

export const httpCurrenciesService = new HttpCurrenciesService();
