import { MarketsServiceContract } from "../../contracts/markets.contract";
import { httpClient } from "./http-client";
import { CountryMarketDefinition } from "../../../configuration/market.config";

export class HttpMarketsService implements MarketsServiceContract {
  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    return httpClient.get<CountryMarketDefinition[]>("/markets");
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    return httpClient.get<CountryMarketDefinition>(`/markets/${code}`);
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    return httpClient.get<CountryMarketDefinition>("/markets/active");
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    return httpClient.post<CountryMarketDefinition>("/markets/active", {
      code,
    });
  }

  async getEffectiveMarketConfig(
    code: string,
  ): Promise<CountryMarketDefinition> {
    return httpClient.get<CountryMarketDefinition>(
      `/markets/effective/${code}`,
    );
  }
}

export const httpMarketsService = new HttpMarketsService();
