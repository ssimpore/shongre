import { MarketsServiceContract } from "../../contracts/markets.contract";
import {
  getMarketDefinition,
  CountryMarketDefinition,
} from "../../../configuration/market.config";
import { marketService } from "../../../domains/market/market.service";
import { storageService } from "../../../services/storage.service";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoMarketsService implements MarketsServiceContract {
  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    await simulateNetworkDelay();
    return marketService.getMarkets().map((m) => getMarketDefinition(m.code));
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    await simulateNetworkDelay();
    return getMarketDefinition(code);
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    await simulateNetworkDelay();
    const stored = storageService.get<string>("shongre_active_market_v1", "FR");
    return getMarketDefinition(stored);
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    await simulateNetworkDelay();
    storageService.set("shongre_active_market_v1", code);
    return getMarketDefinition(code);
  }

  async getEffectiveMarketConfig(code: string): Promise<any> {
    await simulateNetworkDelay();
    return getMarketDefinition(code);
  }
}

export const demoMarketsService = new DemoMarketsService();
