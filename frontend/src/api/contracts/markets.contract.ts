import { CountryMarketDefinition } from "../../configuration/market.config";
import type { CountryConfig } from "@shongre/contracts";

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

export interface MarketsServiceContract {
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
