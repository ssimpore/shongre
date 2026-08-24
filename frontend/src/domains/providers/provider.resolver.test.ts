import { describe, it, expect } from "vitest";
import { providerResolver } from "./provider.resolver";
import { ProviderConfiguration } from "./provider.types";

describe("Provider Resolver & Multi-Market Inheritance", () => {
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
    expect(resolution.fallbackProvider?.id).toBe("stripe");
    expect(resolution.isInheritedFromFrance).toBe(false);
  });

  it("inherits France configuration for Belgium when no override exists", () => {
    const resolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "BE",
      configurations: mockConfigurations,
    });

    expect(resolution.isAvailable).toBe(true);
    expect(resolution.primaryProvider?.id).toBe("mangopay");
    expect(resolution.fallbackProvider?.id).toBe("stripe");
    expect(resolution.isInheritedFromFrance).toBe(true);
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
    expect(beResolution.fallbackProvider?.id).toBe("mangopay");
    expect(beResolution.isInheritedFromFrance).toBe(false);

    // France should still remain MangoPay as primary
    const frResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "FR",
      configurations: configsWithOverride,
    });
    expect(frResolution.primaryProvider?.id).toBe("mangopay");
    expect(frResolution.fallbackProvider?.id).toBe("stripe");
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

  it("automatically propagates France configuration change to inheriting markets", () => {
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

    // Switzerland (CH) has no override -> should now receive Stripe as primary
    const chResolution = providerResolver.resolveEffectiveProviders({
      capability: "payment.card",
      marketCode: "CH",
      configurations: configsWithFrUpdate,
    });

    expect(chResolution.primaryProvider?.id).toBe("stripe");
    expect(chResolution.isInheritedFromFrance).toBe(true);
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
    expect(impact.inheritedMarketsAffected.length).toBeGreaterThan(0);
    expect(impact.impactedPlatformFeatures.length).toBeGreaterThan(0);
  });
});
