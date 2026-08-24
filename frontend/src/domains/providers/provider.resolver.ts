/**
 * SHONGRE MULTI-MARKET PROVIDER RESOLVER & INHERITANCE ENGINE
 * Core resolver implementing France as canonical reference market,
 * market override inheritance semantics, failover routing, and impact analysis.
 */

import {
  ProviderCapability,
  ProviderConfiguration,
  ProviderHealthStatus,
  EffectiveProviderResolution,
  CapabilityHealthResult,
  ProviderImpactAnalysis,
  ProviderRoutingRule,
} from "./provider.types";
import {
  CANONICAL_PROVIDER_REGISTRY,
  getProviderById,
} from "./provider.registry";
import { getCapabilityMetadata } from "./provider-capabilities";

export class ProviderResolver {
  /**
   * Resolves whether a provider is enabled for a given market considering France inheritance.
   */
  public isProviderEnabledForMarket(
    providerId: string,
    marketCode: string,
    configurations: Record<string, ProviderConfiguration>,
  ): boolean {
    const config = configurations[providerId];
    if (!config) return false;

    const normMarket = (marketCode || "FR").toUpperCase();

    // 1. France is canonical baseline
    if (normMarket === "FR") {
      return config.enabled;
    }

    // 2. Check for explicit market override
    const override = config.marketOverrides?.[normMarket];
    if (override && override.enabled !== undefined) {
      return override.enabled;
    }

    // 3. Fall back to France baseline enablement
    return config.enabled;
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
    if (!config) return 999;

    const normMarket = (marketCode || "FR").toUpperCase();
    if (normMarket !== "FR") {
      const override = config.marketOverrides?.[normMarket];
      if (override && override.priority !== undefined) {
        return override.priority;
      }
    }

    return config.priority ?? 1;
  }

  /**
   * Resolves effective settings for a provider in a market with France baseline merge.
   */
  public getEffectiveSettings(
    providerId: string,
    marketCode: string,
    configurations: Record<string, ProviderConfiguration>,
  ): Record<string, any> {
    const config = configurations[providerId];
    if (!config) return {};

    const normMarket = (marketCode || "FR").toUpperCase();
    const baseSettings = config.settings || {};

    if (normMarket === "FR") {
      return { ...baseSettings };
    }

    const override = config.marketOverrides?.[normMarket];
    if (!override || !override.settings) {
      return { ...baseSettings };
    }

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
    const { capability, marketCode = "FR", configurations } = params;
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
      const hasLiveAdapter = p.operational.implementedCapabilities.includes(
        capability,
      );
      const hasDemoAdapter = Boolean(
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
        isInheritedFromFrance: normMarket !== "FR",
        effectiveHealth: "unavailable",
        reason: `Aucun prestataire actif configuré pour ${capability} sur le marché ${normMarket}.`,
      };
    }

    // Sort candidates by effective priority (lower number = higher priority)
    const sorted = [...enabledCandidates].sort((a, b) => {
      const prioA = this.getEffectivePriority(a.id, normMarket, configurations);
      const prioB = this.getEffectivePriority(b.id, normMarket, configurations);
      return prioA - prioB;
    });

    const primary = sorted[0];
    const primaryConfig = configurations[primary.id] || null;
    const fallback = sorted.length > 1 ? sorted[1] : null;
    const fallbackConfig = fallback
      ? configurations[fallback.id] || null
      : null;

    // Check if configuration is inherited from France
    let isInherited = false;
    if (normMarket !== "FR") {
      const override = primaryConfig?.marketOverrides?.[normMarket];
      isInherited =
        !override ||
        (override.enabled === undefined && override.priority === undefined);
    }

    // Determine effective health
    const primaryHealth = primaryConfig?.health || "unknown";
    let effectiveHealth: ProviderHealthStatus = primaryHealth;

    if (
      primaryHealth === "unavailable" &&
      fallback &&
      fallbackConfig &&
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
      isInheritedFromFrance: isInherited,
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
  }): CapabilityHealthResult {
    const { capability, marketCode = "FR", configurations } = params;
    const capMeta = getCapabilityMetadata(capability);
    const resolution = this.resolveEffectiveProviders({
      capability,
      marketCode,
      configurations,
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
        isInherited: resolution.isInheritedFromFrance,
        message: resolution.reason || "Service non disponible dans ce marché.",
      };
    }

    const primaryHealth = resolution.primaryConfig?.health || "unknown";
    const isFallbackRunning =
      primaryHealth === "unavailable" &&
      Boolean(
        resolution.fallbackProvider &&
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
      isInherited: resolution.isInheritedFromFrance,
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
      targetMarketCode = "FR",
      allMarkets = ["FR", "BE", "CH", "ES", "LU", "DE"],
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
          if (mCode === "FR") {
            directlyAffectedMarkets.push("FR");
          } else if (resolution.isInheritedFromFrance) {
            if (!inheritedMarketsAffected.includes(mCode)) {
              inheritedMarketsAffected.push(mCode);
            }
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

    if (
      directlyAffectedMarkets.includes("FR") &&
      inheritedMarketsAffected.length > 0
    ) {
      warnings.push(
        `La modification en France impactera automatiquement ${inheritedMarketsAffected.length} marché(s) dépendant(s) : ${inheritedMarketsAffected.join(", ")}.`,
      );
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
