import { CountryMarketDefinition } from "../../configuration/market.config";
import type { CountryConfig } from "@shongre/contracts";

export interface MarketsServiceContract {
  getAllMarkets(): Promise<CountryMarketDefinition[]>;
  getMarketByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActiveMarket(): Promise<CountryMarketDefinition>;
  setActiveMarket(code: string): Promise<CountryMarketDefinition>;
  getEffectiveMarketConfig(code: string): Promise<CountryMarketDefinition>;
  updateCountryConfiguration(
    code: string,
    patch: Partial<CountryConfig>,
  ): Promise<CountryConfig>;
}
