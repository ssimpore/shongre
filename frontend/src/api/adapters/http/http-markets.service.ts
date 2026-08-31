import {
  MarketsServiceContract,
  type CountryConfigChangeInput,
  type MarketConfigurationChangeRequest,
} from "../../contracts/markets.contract";
import { httpClient } from "./http-client";
import { CountryMarketDefinition } from "../../../configuration/market.config";
import type {
  CountryConfig,
  MarketDetectionRecommendation,
} from "@shongre/contracts";
import type { MarketCoordinateDetectionInput } from "../../contracts/markets.contract";

export class HttpMarketsService implements MarketsServiceContract {
  detectProbableCountry(): Promise<MarketDetectionRecommendation> {
    return httpClient.get<MarketDetectionRecommendation>("/markets/detection");
  }

  detectCountryFromCoordinates(
    input: MarketCoordinateDetectionInput,
  ): Promise<MarketDetectionRecommendation> {
    return httpClient.post<MarketDetectionRecommendation>(
      "/markets/detection/coordinates",
      input,
    );
  }

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

  updateCountryConfiguration(
    code: string,
    input: CountryConfigChangeInput,
  ): Promise<MarketConfigurationChangeRequest> {
    return httpClient.patch<MarketConfigurationChangeRequest>(
      `/admin/countries/${encodeURIComponent(code)}`,
      input,
    );
  }

  listCountryConfigurationChanges(
    code: string,
  ): Promise<readonly MarketConfigurationChangeRequest[]> {
    return httpClient.get<readonly MarketConfigurationChangeRequest[]>(
      `/admin/countries/${encodeURIComponent(code)}/changes`,
    );
  }

  approveCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<CountryConfig> {
    return httpClient.post<CountryConfig>(
      `/admin/countries/${encodeURIComponent(code)}/changes/${encodeURIComponent(requestId)}/approve`,
      { reason },
    );
  }

  rejectCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<{ rejected: true }> {
    return httpClient.post<{ rejected: true }>(
      `/admin/countries/${encodeURIComponent(code)}/changes/${encodeURIComponent(requestId)}/reject`,
      { reason },
    );
  }
}

export const httpMarketsService = new HttpMarketsService();
