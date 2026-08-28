import {
  MarketsServiceContract,
  type CountryConfigChangeInput,
  type MarketConfigurationChangeRequest,
} from "../../contracts/markets.contract";
import {
  getMarketDefinition,
  CountryMarketDefinition,
} from "../../../configuration/market.config";
import { marketService } from "../../../domains/market/market.service";
import { storageService } from "../../../services/storage.service";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { getCountryConfig, type CountryConfig } from "@shongre/contracts";

export class DemoMarketsService implements MarketsServiceContract {
  private readonly configurationChanges = new Map<
    string,
    MarketConfigurationChangeRequest
  >();
  private changeSequence = 0;

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
    input: CountryConfigChangeInput,
  ): Promise<MarketConfigurationChangeRequest> {
    await simulateNetworkDelay();
    const country = getCountryConfig(code);
    if (!country) throw new Error("Marché introuvable.");
    if (
      input.reason.trim().length < 8 ||
      Object.keys(input.patch).length === 0
    ) {
      throw new Error("Un motif détaillé et une modification sont requis.");
    }
    const current = marketService.getMarket(code);
    if (current.version !== input.expectedVersion) {
      throw new Error(
        "La configuration a changé. Rechargez-la avant de continuer.",
      );
    }
    this.changeSequence += 1;
    const candidate = {
      ...country,
      ...input.patch,
      canonicalDomainMode:
        input.patch.canonicalDomainMode || country.canonicalDomainMode,
      basePath: input.patch.basePath || country.basePath,
    } as CountryConfig;
    const request: MarketConfigurationChangeRequest = {
      id: `00000000-0000-4000-8000-${String(this.changeSequence).padStart(12, "0")}`,
      marketCode: code.toUpperCase(),
      requestedBy: "00000000-0000-4000-8000-000000000101",
      baseVersion: input.expectedVersion,
      changedFields: Object.keys(input.patch),
      reason: input.reason,
      candidate,
      status: "pending",
      createdAt: new Date(Date.UTC(2026, 0, this.changeSequence)).toISOString(),
    };
    this.configurationChanges.set(request.id, request);
    return request;
  }

  async listCountryConfigurationChanges(
    code: string,
  ): Promise<readonly MarketConfigurationChangeRequest[]> {
    await simulateNetworkDelay();
    return [...this.configurationChanges.values()].filter(
      (request) => request.marketCode === code.toUpperCase(),
    );
  }

  async approveCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<CountryConfig> {
    await simulateNetworkDelay();
    if (reason.trim().length < 8) {
      throw new Error("Un motif d’approbation détaillé est requis.");
    }
    const request = this.configurationChanges.get(requestId);
    if (
      !request ||
      request.marketCode !== code.toUpperCase() ||
      request.status !== "pending"
    ) {
      throw new Error("Demande de configuration en attente introuvable.");
    }
    const candidate = request.candidate;
    marketService.updateMarketRouting(code, {
      canonicalDomainMode: candidate.canonicalDomainMode,
      basePath: candidate.basePath,
      gatewayVisible: candidate.gatewayVisible,
      seoIndexable: candidate.seo.indexable,
    });
    this.configurationChanges.set(requestId, {
      ...request,
      status: "approved",
      reviewedBy: "00000000-0000-4000-8000-000000000202",
      reviewReason: reason,
    });
    return candidate;
  }

  async rejectCountryConfigurationChange(
    code: string,
    requestId: string,
    reason: string,
  ): Promise<{ rejected: true }> {
    await simulateNetworkDelay();
    if (reason.trim().length < 8) {
      throw new Error("Un motif de rejet détaillé est requis.");
    }
    const request = this.configurationChanges.get(requestId);
    if (
      !request ||
      request.marketCode !== code.toUpperCase() ||
      request.status !== "pending"
    ) {
      throw new Error("Demande de configuration en attente introuvable.");
    }
    this.configurationChanges.set(requestId, {
      ...request,
      status: "rejected",
      reviewedBy: "00000000-0000-4000-8000-000000000202",
      reviewReason: reason,
    });
    return { rejected: true };
  }
}

export const demoMarketsService = new DemoMarketsService();
