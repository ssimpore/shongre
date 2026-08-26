import { MarketsServiceContract } from "../../contracts/markets.contract";
import {
  getMarketDefinition,
  CountryMarketDefinition,
} from "../../../configuration/market.config";
import { marketService } from "../../../domains/market/market.service";
import { storageService } from "../../../services/storage.service";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { getCountryConfig, type CountryConfig } from "@shongre/contracts";

export class DemoMarketsService implements MarketsServiceContract {
  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    await simulateNetworkDelay();
    return marketService.getMarkets().map((m) => getMarketDefinition(m.code));
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    await simulateNetworkDelay();
    const market = marketService.getMarketByCode(code);
    return market ? getMarketDefinition(market.code) : null;
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    await simulateNetworkDelay();
    const stored = storageService.get<string>("shongre_active_market_v1", "FR");
    return getMarketDefinition(stored);
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    await simulateNetworkDelay();
    const market = marketService.getMarketByCode(code);
    if (!market) throw new Error("Marché inconnu ou désactivé.");
    storageService.set("shongre_active_market_v1", code);
    return getMarketDefinition(market.code);
  }

  async getEffectiveMarketConfig(
    code: string,
  ): Promise<CountryMarketDefinition> {
    await simulateNetworkDelay();
    return getMarketDefinition(code);
  }

  async updateCountryConfiguration(
    code: string,
    patch: Partial<CountryConfig>,
  ): Promise<CountryConfig> {
    await simulateNetworkDelay();
    const country = getCountryConfig(code);
    if (!country) throw new Error("Marché introuvable.");
    const current = marketService.getMarket(code);
    marketService.updateMarketRouting(code, {
      canonicalDomainMode:
        patch.canonicalDomainMode ||
        current.routing?.canonicalDomainMode ||
        country.canonicalDomainMode,
      basePath: patch.basePath || current.routing?.basePath || country.basePath,
      gatewayVisible:
        patch.gatewayVisible ??
        current.routing?.gatewayVisible ??
        country.gatewayVisible,
      seoIndexable:
        patch.seo?.indexable ??
        current.routing?.seoIndexable ??
        country.seo.indexable,
    });
    return {
      ...country,
      ...patch,
      canonicalDomainMode:
        patch.canonicalDomainMode || country.canonicalDomainMode,
      basePath: patch.basePath || country.basePath,
    } as CountryConfig;
  }
}

export const demoMarketsService = new DemoMarketsService();
