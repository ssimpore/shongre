/**
 * SHONGRE MULTI-MARKET PROVIDER RESOLVER
 * Core resolver implementing explicit market assignments, approved failover
 * routing, and impact analysis.
 */

import {
  ProviderCapability,
  ProviderConfiguration,
  ProviderHealthStatus,
  EffectiveProviderResolution,
  CapabilityHealthResult,
  ProviderImpactAnalysis,
  ProviderRoutingRule,
  PROVIDER_CONFIGURATION_CONSTRAINTS,
} from "./provider.types";
import {
  CANONICAL_PROVIDER_REGISTRY,
  getProviderById,
} from "./provider.registry";
import { getCapabilityMetadata } from "./provider-capabilities";
import { isDemoMode } from "../../api/client/data-mode.service";
import { DEFAULT_MARKET_CODE } from "../../configuration/market-baseline";

export class ProviderResolver {
  /**
   * A provider must be assigned explicitly outside the default market.
   */
  public isProviderEnabledForMarket(
    providerId: string,
    marketCode: string,
    configurations: Record<string, ProviderConfiguration>,
  ): boolean {
    const config = configurations[providerId];
    if (!config) return false;

    const normMarket = marketCode.trim().toUpperCase();
    if (!normMarket) return false;

    // The default market owns its explicit root assignment.
    if (normMarket === DEFAULT_MARKET_CODE) {
      return config.enabled;
    }

    // Non-default markets fail closed without an explicit assignment.
    const override = config.marketOverrides?.[normMarket];
    return override?.enabled === true;
  }

  /**
   * Resolves the effective priority of a provider in a market.
   */
  public getEffectivePriority(
    providerId: string,
    marketCode: string,
    configurations: Record<string, ProviderConfiguration>,
  ): number {
    const config = configurations[providerId];
    if (!config)
      return PROVIDER_CONFIGURATION_CONSTRAINTS.unconfiguredSortPriority;

    const normMarket = marketCode.trim().toUpperCase();
    if (!normMarket)
      return PROVIDER_CONFIGURATION_CONSTRAINTS.unconfiguredSortPriority;
    if (normMarket !== DEFAULT_MARKET_CODE) {
      const override = config.marketOverrides?.[normMarket];
      if (override?.enabled === true && override.priority !== undefined) {
        return override.priority;
      }
      return PROVIDER_CONFIGURATION_CONSTRAINTS.unconfiguredSortPriority;
    }

    return config.priority ?? PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min;
  }

  /**
   * Shared settings are visible only after an explicit market assignment.
   */
  public getEffectiveSettings(
    providerId: string,
    marketCode: string,
    configurations: Record<string, ProviderConfiguration>,
  ): Record<string, any> {
    const config = configurations[providerId];
    if (!config) return {};

    const normMarket = marketCode.trim().toUpperCase();
    if (!normMarket) return {};
    const baseSettings = config.settings || {};

    if (normMarket === DEFAULT_MARKET_CODE) {
      return { ...baseSettings };
    }

    const override = config.marketOverrides?.[normMarket];
    if (override?.enabled !== true) return {};
    if (!override.settings) return { ...baseSettings };

    return {
      ...baseSettings,
      ...override.settings,
    };
  }

  /**
   * Resolves the effective providers for a specific capability in a market.
   */
  public resolveEffectiveProviders(params: {
    capability: ProviderCapability;
    marketCode?: string;
    configurations: Record<string, ProviderConfiguration>;
    routingRules?: Record<string, ProviderRoutingRule>;
  }): EffectiveProviderResolution {
    const {
      capability,
      marketCode = DEFAULT_MARKET_CODE,
      configurations,
      routingRules,
    } = params;
    const normMarket = marketCode.toUpperCase();

    // Find all providers registered for this capability
    const candidateProviders = CANONICAL_PROVIDER_REGISTRY.filter((p) =>
      p.capabilities.includes(capability),
    );

    // Filter candidate providers that support this market and are enabled
    const enabledCandidates = candidateProviders.filter((p) => {
      const supportsMarket =
        p.supportedMarkets.includes("*") ||
        p.supportedMarkets.includes(normMarket);
      if (!supportsMarket) return false;
      const config = configurations[p.id];
      const hasLiveAdapter =
        p.operational.implementedCapabilities.includes(capability);
      const hasDemoAdapter = Boolean(
        isDemoMode() &&
        config?.environment === "demo" &&
        p.operational.demoOnlyCapabilities?.includes(capability),
      );
      if (!hasLiveAdapter && !hasDemoAdapter) return false;
      return this.isProviderEnabledForMarket(p.id, normMarket, configurations);
    });

    if (enabledCandidates.length === 0) {
      return {
        capability,
        marketCode: normMarket,
        isAvailable: false,
        primaryProvider: null,
        primaryConfig: null,
        fallbackProvider: null,
        fallbackConfig: null,
        fallbackActivationApproved: false,
        isInheritedFromBaseline: false,
        effectiveHealth: "unavailable",
        reason: `Aucun prestataire actif configuré pour ${capability} sur le marché ${normMarket}.`,
      };
    }

    // Sort candidates by effective priority (lower number = higher priority).
    const sorted = [...enabledCandidates].sort((a, b) => {
      const prioA = this.getEffectivePriority(a.id, normMarket, configurations);
      const prioB = this.getEffectivePriority(b.id, normMarket, configurations);
      return prioA - prioB;
    });

    const routingRule =
      routingRules?.[`${normMarket}:${capability}`] ??
      routingRules?.[capability];
    const primary = routingRule
      ? sorted.find((provider) => provider.id === routingRule.primaryProviderId)
      : sorted[0];
    if (!primary) {
      return {
        capability,
        marketCode: normMarket,
        isAvailable: false,
        primaryProvider: null,
        primaryConfig: null,
        fallbackProvider: null,
        fallbackConfig: null,
        fallbackActivationApproved: false,
        isInheritedFromBaseline: false,
        effectiveHealth: "unavailable",
        reason: `Le prestataire principal configuré n'est pas éligible pour ${capability} sur ${normMarket}.`,
      };
    }
    const primaryConfig = configurations[primary.id] || null;
    const fallback = routingRule?.fallbackProviderId
      ? (sorted.find(
          (provider) => provider.id === routingRule.fallbackProviderId,
        ) ?? null)
      : null;
    const fallbackConfig = fallback
      ? configurations[fallback.id] || null
      : null;

    // Determine effective health
    const primaryHealth = primaryConfig?.health || "unknown";
    let effectiveHealth: ProviderHealthStatus = primaryHealth;

    if (
      primaryHealth === "unavailable" &&
      fallback &&
      fallbackConfig &&
      routingRule?.automaticFailover === true &&
      fallbackConfig.health === "healthy"
    ) {
      effectiveHealth = "degraded"; // Fallback takes over with degraded platform state
    }

    return {
      capability,
      marketCode: normMarket,
      isAvailable: effectiveHealth !== "unavailable",
      primaryProvider: primary,
      primaryConfig,
      fallbackProvider: fallback,
      fallbackConfig,
      fallbackActivationApproved: routingRule?.automaticFailover === true,
      isInheritedFromBaseline: false,
      effectiveHealth,
    };
  }

  /**
   * Resolves the operational health of a platform capability for the Admin Overview matrix.
   */
  public resolveCapabilityHealth(params: {
    capability: ProviderCapability;
    marketCode?: string;
    configurations: Record<string, ProviderConfiguration>;
    routingRules?: Record<string, ProviderRoutingRule>;
  }): CapabilityHealthResult {
    const {
      capability,
      marketCode = DEFAULT_MARKET_CODE,
      configurations,
      routingRules,
    } = params;
    const capMeta = getCapabilityMetadata(capability);
    const resolution = this.resolveEffectiveProviders({
      capability,
      marketCode,
      configurations,
      routingRules,
    });

    if (!resolution.primaryProvider || !resolution.isAvailable) {
      return {
        capability,
        category: capMeta.category,
        marketCode,
        status: resolution.primaryProvider ? "unavailable" : "unconfigured",
        activeProviderName: resolution.primaryProvider?.name || "Non configuré",
        activeProviderId: resolution.primaryProvider?.id || "",
        isFallbackActive: false,
        isInherited: resolution.isInheritedFromBaseline,
        message: resolution.reason || "Service non disponible dans ce marché.",
      };
    }

    const primaryHealth = resolution.primaryConfig?.health || "unknown";
    const isFallbackRunning =
      primaryHealth === "unavailable" &&
      Boolean(
        resolution.fallbackProvider &&
        resolution.fallbackActivationApproved &&
        resolution.fallbackConfig?.health === "healthy",
      );

    const activeProvider = isFallbackRunning
      ? resolution.fallbackProvider!
      : resolution.primaryProvider;

    let status: CapabilityHealthResult["status"] = "unknown";
    const isDemoCapability = Boolean(
      resolution.primaryConfig?.environment === "demo" &&
      resolution.primaryProvider.operational.demoOnlyCapabilities?.includes(
        capability,
      ),
    );
    if (isDemoCapability) {
      status = "demo";
    } else if (isFallbackRunning || primaryHealth === "degraded") {
      status = "degraded";
    } else if (primaryHealth === "unavailable") {
      status = "unavailable";
    } else if (
      primaryHealth === "healthy" &&
      resolution.primaryConfig?.environment !== "demo" &&
      resolution.primaryConfig?.healthLastCheckedAt
    ) {
      status = "operational";
    }

    return {
      capability,
      category: capMeta.category,
      marketCode,
      status,
      activeProviderName: activeProvider.name,
      activeProviderId: activeProvider.id,
      isFallbackActive: isFallbackRunning,
      isInherited: resolution.isInheritedFromBaseline,
      message: isFallbackRunning
        ? `Secours actif (${activeProvider.name}) car le prestataire principal est indisponible.`
        : undefined,
    };
  }

  /**
   * Evaluates the impact of disabling, modifying, or deleting a provider before applying changes.
   */
  public analyzeProviderImpact(params: {
    providerId: string;
    configurations: Record<string, ProviderConfiguration>;
    targetMarketCode?: string;
    allMarkets?: string[];
  }): ProviderImpactAnalysis {
    const {
      providerId,
      configurations,
      targetMarketCode = DEFAULT_MARKET_CODE,
      allMarkets = [
        ...new Set(
          CANONICAL_PROVIDER_REGISTRY.flatMap((provider) =>
            provider.supportedMarkets.filter((code) => code !== "*"),
          ),
        ),
      ],
    } = params;
    const provider = getProviderById(providerId);

    if (!provider) {
      return {
        providerId,
        providerName: "Inconnu",
        affectedCapabilities: [],
        directlyAffectedMarkets: [],
        inheritedMarketsAffected: [],
        impactedPlatformFeatures: [],
        isSafeToDisable: true,
        warningMessages: [],
        hasAlternativeFallback: false,
      };
    }

    const affectedCapabilities = provider.capabilities;
    const directlyAffectedMarkets: string[] = [];
    const inheritedMarketsAffected: string[] = [];
    const impactedFeaturesSet = new Set<string>();
    const warnings: string[] = [];

    // Collect impacted platform features
    for (const cap of affectedCapabilities) {
      const meta = getCapabilityMetadata(cap);
      meta.usedByFeatures.forEach((f) => impactedFeaturesSet.add(f));
    }

    // Check which markets use this provider as primary
    for (const mCode of allMarkets) {
      for (const cap of affectedCapabilities) {
        const resolution = this.resolveEffectiveProviders({
          capability: cap,
          marketCode: mCode,
          configurations,
        });

        if (resolution.primaryProvider?.id === providerId) {
          if (mCode === DEFAULT_MARKET_CODE) {
            directlyAffectedMarkets.push(DEFAULT_MARKET_CODE);
          } else {
            if (!directlyAffectedMarkets.includes(mCode)) {
              directlyAffectedMarkets.push(mCode);
            }
          }
        }
      }
    }

    // Check if fallback exists for all capabilities
    let hasAlternativeFallback = true;
    for (const cap of affectedCapabilities) {
      const resolution = this.resolveEffectiveProviders({
        capability: cap,
        marketCode: targetMarketCode,
        configurations,
      });

      if (
        !resolution.fallbackProvider ||
        resolution.fallbackProvider.id === providerId
      ) {
        hasAlternativeFallback = false;
        warnings.push(
          `Aucun prestataire de secours disponible pour la capacité critique "${getCapabilityMetadata(cap).name}".`,
        );
      }
    }

    const isSafeToDisable = hasAlternativeFallback && warnings.length <= 1;

    return {
      providerId,
      providerName: provider.name,
      affectedCapabilities,
      directlyAffectedMarkets,
      inheritedMarketsAffected,
      impactedPlatformFeatures: Array.from(impactedFeaturesSet),
      isSafeToDisable,
      warningMessages: warnings,
      hasAlternativeFallback,
    };
  }
}

export const providerResolver = new ProviderResolver();
