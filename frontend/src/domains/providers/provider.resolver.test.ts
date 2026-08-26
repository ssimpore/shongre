import { afterEach, describe, it, expect } from "vitest";
import { providerResolver } from "./provider.resolver";
import { ProviderConfiguration } from "./provider.types";
import { apiClientConfig } from "../../api/client/api-client.config";

afterEach(() => {
  apiClientConfig.dataMode = "demo";
});

describe("Provider Resolver & explicit multi-market assignments", () => {
  const mockConfigurations: Record<string, ProviderConfiguration> = {
    mangopay: {
      providerId: "mangopay",
      enabled: true,
      environment: "demo",
      priority: 1,
      credentialStatus: "configured",
      health: "healthy",
      settings: { clientId: "shongre_fr" },
      marketOverrides: {},
      updatedAt: "2026-08-17T00:00:00Z",
      version: 1,
    },
    stripe: {
      providerId: "stripe",
      enabled: true,
      environment: "demo",
      priority: 2,
      credentialStatus: "configured",
      health: "healthy",
      settings: { publishableKey: "pk_live_fr" },
      marketOverrides: {},
      updatedAt: "2026-08-17T00:00:00Z",
      version: 1,
    },
  };

  it("resolves primary provider for France correctly", () => {
    const resolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "FR",
      configurations: mockConfigurations,
    });

    expect(resolution.isAvailable).toBe(true);
    expect(resolution.primaryProvider?.id).toBe("mangopay");
    expect(resolution.fallbackProvider).toBeNull();
    expect(resolution.isInheritedFromBaseline).toBe(false);
  });

  it("fails closed for Belgium when no assignment exists", () => {
    const resolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "BE",
      configurations: mockConfigurations,
    });

    expect(resolution.isAvailable).toBe(false);
    expect(resolution.primaryProvider).toBeNull();
    expect(resolution.isInheritedFromBaseline).toBe(false);
  });

  it("respects explicit custom override for Belgium (e.g. Stripe prioritized over MangoPay)", () => {
    const configsWithOverride: Record<string, ProviderConfiguration> = {
      ...mockConfigurations,
      stripe: {
        ...mockConfigurations.stripe,
        marketOverrides: {
          BE: {
            enabled: true,
            priority: 1, // Stripe is P1 in Belgium
          },
        },
      },
      mangopay: {
        ...mockConfigurations.mangopay,
        marketOverrides: {
          BE: {
            enabled: true,
            priority: 2, // MangoPay is P2 in Belgium
          },
        },
      },
    };

    // Belgium should have Stripe as primary
    const beResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "BE",
      configurations: configsWithOverride,
    });
    expect(beResolution.primaryProvider?.id).toBe("stripe");
    expect(beResolution.fallbackProvider).toBeNull();
    expect(beResolution.isInheritedFromBaseline).toBe(false);

    // France should still remain MangoPay as primary
    const frResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "FR",
      configurations: configsWithOverride,
    });
    expect(frResolution.primaryProvider?.id).toBe("mangopay");
    expect(frResolution.fallbackProvider).toBeNull();
  });

  it("respects explicit disable in Spain without falling back to France", () => {
    const configsWithDisabledES: Record<string, ProviderConfiguration> = {
      ...mockConfigurations,
      mangopay: {
        ...mockConfigurations.mangopay,
        marketOverrides: {
          ES: {
            enabled: false, // Explicitly disabled in Spain
          },
        },
      },
      stripe: {
        ...mockConfigurations.stripe,
        marketOverrides: {
          ES: {
            enabled: false, // Explicitly disabled in Spain
          },
        },
      },
    };

    const esResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "ES",
      configurations: configsWithDisabledES,
    });

    expect(esResolution.isAvailable).toBe(false);
    expect(esResolution.primaryProvider).toBeNull();
  });

  it("never exposes a demo-only carrier capability in API mode", () => {
    apiClientConfig.dataMode = "api";
    const resolution = providerResolver.resolveEffectiveProviders({
      capability: "delivery.relay_point",
      marketCode: "FR",
      configurations: {
        mondial_relay: {
          providerId: "mondial_relay",
          enabled: true,
          environment: "demo",
          priority: 1,
          credentialStatus: "not_required",
          health: "unknown",
          settings: {},
          marketOverrides: {},
          updatedAt: "2026-08-24T00:00:00Z",
          version: 1,
        },
      },
    });

    expect(resolution.isAvailable).toBe(false);
    expect(resolution.primaryProvider).toBeNull();
  });

  it("does not propagate a France configuration change to another market", () => {
    // France swaps Stripe to priority 1 and MangoPay to priority 2
    const configsWithFrUpdate: Record<string, ProviderConfiguration> = {
      ...mockConfigurations,
      stripe: {
        ...mockConfigurations.stripe,
        priority: 1,
      },
      mangopay: {
        ...mockConfigurations.mangopay,
        priority: 2,
      },
    };

    // Switzerland has no explicit assignment and therefore remains unavailable.
    const chResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "CH",
      configurations: configsWithFrUpdate,
    });

    expect(chResolution.primaryProvider).toBeNull();
    expect(chResolution.isAvailable).toBe(false);
    expect(chResolution.isInheritedFromBaseline).toBe(false);
  });

  it("activates fallback provider when primary provider becomes unavailable", () => {
    const configsWithDegradedPrimary: Record<string, ProviderConfiguration> = {
      ...mockConfigurations,
      mangopay: {
        ...mockConfigurations.mangopay,
        health: "unavailable", // Primary goes down
      },
      stripe: {
        ...mockConfigurations.stripe,
        health: "healthy", // Fallback is up
      },
    };

    const health = providerResolver.resolveCapabilityHealth({
      capability: "payment.card",
      marketCode: "FR",
      configurations: configsWithDegradedPrimary,
      routingRules: {
        "FR:payment.card": {
          capability: "payment.card",
          marketCode: "FR",
          primaryProviderId: "mangopay",
          fallbackProviderId: "stripe",
          availableProviderIds: ["mangopay", "stripe"],
          automaticFailover: true,
          isCustomized: true,
          updatedAt: "2026-08-17T00:00:00Z",
        },
      },
    });

    expect(health.status).toBe("demo");
    expect(health.isFallbackActive).toBe(true);
    expect(health.activeProviderId).toBe("stripe");
  });

  it("generates accurate impact analysis for disabling a critical provider", () => {
    const impact = providerResolver.analyzeProviderImpact({
      providerId: "mangopay",
      configurations: mockConfigurations,
      targetMarketCode: "FR",
      allMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    });

    expect(impact.affectedCapabilities).toContain("payment.card");
    expect(impact.affectedCapabilities).toContain("payment.escrow");
    expect(impact.directlyAffectedMarkets).toContain("FR");
    expect(impact.inheritedMarketsAffected).toEqual([]);
    expect(impact.impactedPlatformFeatures.length).toBeGreaterThan(0);
  });
});
