import type {
  CountryConfig,
  MarketDetectionRecommendation,
} from "@shongre/contracts";
import type { Market } from "../../domains/market/market.types";

export interface MarketCoordinateDetectionInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CountryConfigChangeInput {
  expectedVersion: number;
  reason: string;
  patch: Partial<CountryConfig>;
}

export interface MarketConfigurationChangeRequest {
  id: string;
  marketCode: string;
  requestedBy: string;
  baseVersion: number;
  changedFields: readonly string[];
  reason: string;
  candidate: CountryConfig;
  status: "pending" | "approved" | "rejected" | "stale";
  reviewedBy?: string;
  reviewReason?: string;
  createdAt: string;
}

export type CountryMarketDefinition = CountryConfig & {
  version?: number;
};

export interface MarketsServiceContract {
  loadRuntimeMarkets(): Promise<Market[]>;
  detectProbableCountry(): Promise<MarketDetectionRecommendation>;
  detectCountryFromCoordinates(
    input: MarketCoordinateDetectionInput,
  ): Promise<MarketDetectionRecommendation>;
  getAllMarkets(): Promise<CountryMarketDefinition[]>;
  getMarketByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActiveMarket(): Promise<CountryMarketDefinition>;
  setActiveMarket(code: string): Promise<CountryMarketDefinition>;
  getEffectiveMarketConfig(code: string): Promise<CountryMarketDefinition>;
  updateCountryConfiguration(
    code: string,
    input: CountryConfigChangeInput,
  ): Promise<MarketConfigurationChangeRequest>;
  listCountryConfigurationChanges(
    code: string,
  ): Promise<readonly MarketConfigurationChangeRequest[]>;
  approveCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<CountryConfig>;
  rejectCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<{ rejected: true }>;
}
