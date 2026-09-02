import type {
  CurrencyCatalog,
  CurrencyDefinition,
  CurrencyDefinitionUpdate,
  ExchangeRate,
  ExchangeRateUpdate,
} from "@shongre/contracts";

export interface CurrenciesServiceContract {
  getPublicCatalog(): Promise<CurrencyCatalog>;
  getAdminCatalog(): Promise<CurrencyCatalog>;
  upsertCurrency(
    code: string,
    input: CurrencyDefinitionUpdate,
  ): Promise<CurrencyDefinition>;
  upsertExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    input: ExchangeRateUpdate,
  ): Promise<ExchangeRate>;
}
