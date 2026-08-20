/**
 * SHONGRE HIGH-LEVEL PROVIDER SERVICE
 * Centralized business engine consumed by UI, domain resolvers, and feature modules.
 */

import {
  Provider,
  ProviderCategory,
  ProviderCapability,
  ProviderConfiguration,
  ProviderHealthStatus,
  ProviderMarketOverride,
  ProviderAuditEvent,
  ProviderTestResult,
  EffectiveProviderResolution,
  CapabilityHealthResult,
  ProviderImpactAnalysis,
} from './provider.types';
import {
  providerRepository,
  IProviderRepository,
} from '../../repositories/provider.repository';
import {
  getAllCapabilities,
  getCapabilitiesByCategory,
  
  getCapabilityMetadata
} from './provider-capabilities';

export interface MarketCoverageRow {
  capability: ProviderCapability;
  capabilityName: string;
  category: ProviderCategory;
  markets: Record<
    string,
    {
      activeProviderName: string;
      activeProviderId: string;
      isAvailable: boolean;
      isInherited: boolean;
      health: ProviderHealthStatus;
    }
  >;
}

export class ProviderService {
  constructor(private repo: IProviderRepository = providerRepository) {}

  public getProviders(): Provider[] {
    return this.repo.getProviders();
  }

  public getProvider(id: string): Provider | undefined {
    return this.repo.getProvider(id);
  }

  public getProvidersByCategory(category: ProviderCategory): Provider[] {
    return this.repo.getProviders().filter((p) => p.category === category);
  }

  public getProvidersByCapability(capability: ProviderCapability): Provider[] {
    return this.repo.getProviders().filter((p) => p.capabilities.includes(capability));
  }

  public getConfigurations(): Record<string, ProviderConfiguration> {
    return this.repo.getConfigurations();
  }

  public getConfiguration(providerId: string): ProviderConfiguration | null {
    return this.repo.getConfiguration(providerId);
  }

  public async saveConfiguration(
    providerId: string,
    updates: Partial<ProviderConfiguration>,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    return this.repo.saveConfiguration(providerId, updates, actor);
  }

  public async setMarketOverride(
    providerId: string,
    marketCode: string,
    override: ProviderMarketOverride,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    return this.repo.setMarketOverride(providerId, marketCode, override, actor);
  }

  public async resetMarketOverride(
    providerId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    return this.repo.resetMarketOverride(providerId, marketCode, actor);
  }

  public async setProviderHealth(
    providerId: string,
    health: ProviderHealthStatus,
    message?: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    return this.repo.setProviderHealth(providerId, health, message, actor);
  }

  public async testProvider(
    providerId: string,
    scenario?: 'healthy' | 'missing_credentials' | 'timeout' | 'invalid_config' | 'unsupported_market'
  ): Promise<ProviderTestResult> {
    return this.repo.testProvider(providerId, scenario);
  }

  public resolveEffectiveProviders(
    capability: ProviderCapability,
    marketCode = 'FR'
  ): EffectiveProviderResolution {
    return this.repo.resolveEffectiveProviders(capability, marketCode);
  }

  /**
   * Quick check if a platform capability is fully available and usable in a market
   */
  public isCapabilityAvailable(capability: ProviderCapability, marketCode = 'FR'): boolean {
    const resolution = this.resolveEffectiveProviders(capability, marketCode);
    return resolution.isAvailable && resolution.effectiveHealth !== 'unavailable';
  }

  public resolveCapabilityHealth(
    capability: ProviderCapability,
    marketCode = 'FR'
  ): CapabilityHealthResult {
    return this.repo.resolveCapabilityHealth(capability, marketCode);
  }

  public analyzeImpact(providerId: string, targetMarketCode = 'FR'): ProviderImpactAnalysis {
    return this.repo.analyzeImpact(providerId, targetMarketCode);
  }

  public getAuditHistory(providerId?: string): ProviderAuditEvent[] {
    return this.repo.getAuditHistory(providerId);
  }

  /**
   * Generates a complete cross-market coverage matrix for administrative inspection
   */
  public getMarketCoverageMatrix(
    marketCodes: string[] = ['FR', 'BE', 'CH', 'ES', 'LU', 'DE'],
    categoryFilter?: ProviderCategory
  ): MarketCoverageRow[] {
    const capabilities = categoryFilter
      ? getCapabilitiesByCategory(categoryFilter).map((c) => c.id)
      : getAllCapabilities().map((c) => c.id);

    return capabilities.map((cap) => {
      const capMeta = getCapabilityMetadata(cap);
      const rowMarkets: MarketCoverageRow['markets'] = {};

      marketCodes.forEach((mCode) => {
        const resolution = this.resolveEffectiveProviders(cap, mCode);
        const active = resolution.primaryProvider;
        rowMarkets[mCode] = {
          activeProviderName: active?.name || 'Désactivé / Inexistant',
          activeProviderId: active?.id || '',
          isAvailable: resolution.isAvailable,
          isInherited: resolution.isInheritedFromFrance,
          health: resolution.effectiveHealth,
        };
      });

      return {
        capability: cap,
        capabilityName: capMeta.name,
        category: capMeta.category,
        markets: rowMarkets,
      };
    });
  }
}

export const providerService = new ProviderService();
