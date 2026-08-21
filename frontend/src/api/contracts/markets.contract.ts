import { CountryMarketDefinition } from "../../configuration/market.config";

export interface MarketsServiceContract {
  getAllMarkets(): Promise<CountryMarketDefinition[]>;
  getMarketByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActiveMarket(): Promise<CountryMarketDefinition>;
  setActiveMarket(code: string): Promise<CountryMarketDefinition>;
  getEffectiveMarketConfig(code: string): Promise<CountryMarketDefinition>;
}
