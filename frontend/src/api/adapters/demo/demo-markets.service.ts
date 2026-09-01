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
import {
  getCountryConfig,
  getDefaultCountryConfig,
  resolveCountryFromCoordinates,
  resolveCountryRecommendation,
  type CountryConfig,
  type MarketDetectionRecommendation,
} from "@shongre/contracts";
import type { MarketCoordinateDetectionInput } from "../../contracts/markets.contract";
import { requireDemoCapability } from "./demo-authorization";

export interface DemoMarketDetectionScenario {
  probableCountryCode?: string | null;
  failAttempts?: number;
}

export class DemoMarketsService implements MarketsServiceContract {
  private readonly configurationChanges = new Map<
    string,
    MarketConfigurationChangeRequest
  >();
  private changeSequence = 0;
  private detectionAttempt = 0;

  constructor(
    private readonly detectionScenario: DemoMarketDetectionScenario = {},
  ) {}

  async detectProbableCountry(): Promise<MarketDetectionRecommendation> {
    await simulateNetworkDelay();
    this.detectionAttempt += 1;
    if (this.detectionAttempt <= (this.detectionScenario.failAttempts ?? 0)) {
      throw new Error("DEMO_MARKET_DETECTION_UNAVAILABLE");
    }
    const hasConfiguredCountry = Object.prototype.hasOwnProperty.call(
      this.detectionScenario,
      "probableCountryCode",
    );
    return resolveCountryRecommendation({
      // A known demo persona supplies a deterministic scenario signal. A guest
      // has no probable country; unknown visitors are never labelled French by
      // default merely because France is the default marketplace.
      countryCode: hasConfiguredCountry
        ? this.detectionScenario.probableCountryCode
        : storageService.getCurrentUser()?.country,
      source: "demo",
      confidence: "high",
    });
  }

  async detectCountryFromCoordinates(
    input: MarketCoordinateDetectionInput,
  ): Promise<MarketDetectionRecommendation> {
    await simulateNetworkDelay();
    return resolveCountryFromCoordinates(input);
  }

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
    const stored = storageService.get<string>(
      "shongre_active_market_v1",
      getDefaultCountryConfig().code,
    );
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
    requireDemoCapability("market.configure");
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
    requireDemoCapability("market.manage");
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
    requireDemoCapability("market.configure");
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
    requireDemoCapability("market.configure");
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
