import { describe, expect, it } from "vitest";
import {
  evaluateProviderReadiness,
  resolveProviderRoute,
  SHONGRE_CAPABILITY_REQUIREMENTS,
  SHONGRE_PROVIDER_REGISTRY,
} from "./provider-platform";

describe("provider platform registry", () => {
  it("has stable unique provider and capability identifiers", () => {
    const providerIds = SHONGRE_PROVIDER_REGISTRY.map(({ id }) => id);
    const capabilities = SHONGRE_CAPABILITY_REQUIREMENTS.map(
      ({ capability }) => capability,
    );

    expect(new Set(providerIds).size).toBe(providerIds.length);
    expect(new Set(capabilities).size).toBe(capabilities.length);
  });

  it("assigns every capability to a registered operational owner", () => {
    const providerIds = new Set(SHONGRE_PROVIDER_REGISTRY.map(({ id }) => id));

    for (const requirement of SHONGRE_CAPABILITY_REQUIREMENTS) {
      expect(providerIds.has(requirement.primaryProviderId)).toBe(true);
      if (requirement.fallbackProviderId) {
        expect(providerIds.has(requirement.fallbackProviderId)).toBe(true);
      }
    }
  });

  it("never promotes demo or configuration-only evidence to production ready", () => {
    const gemini = SHONGRE_PROVIDER_REGISTRY.find(
      ({ id }) => id === "google_gemini",
    )!;
    const readiness = evaluateProviderReadiness(gemini, {
      configured: true,
      enabled: true,
      environment: "demo",
      health: "HEALTHY",
      healthEvidence: "CONFIGURATION",
      message: "Demo response succeeded",
    });

    expect(readiness.productionReady).toBe(false);
    expect(readiness.active).toBe(false);
    expect(readiness.blockers).toContain(
      "Demo evidence cannot establish production readiness.",
    );
  });

  it("activates only an explicitly approved, compatible and healthy fallback", () => {
    const observedAt = "2026-08-24T10:00:00.000Z";
    const definitions = ["primary", "fallback"].map((id) => ({
      ...SHONGRE_PROVIDER_REGISTRY.find(({ id }) => id === "stripe")!,
      id,
      capabilities: ["payment.card"],
      implementedCapabilities: ["payment.card"],
      blockers: [],
    }));
    const entries = definitions.map((definition, index) => ({
      definition,
      runtime: {
        configured: true,
        enabled: true,
        environment: "sandbox" as const,
        health: index === 0 ? ("OUTAGE" as const) : ("HEALTHY" as const),
        healthEvidence: "LIVE_PROBE" as const,
        lastCheckedAt: observedAt,
        message: "test",
      },
      readiness: {
        score: 100,
        productionReady: true,
        active: true,
        blockers: [],
      },
    }));

    const withoutApproval = resolveProviderRoute({
      policy: {
        capability: "payment.card",
        operation: "authorize",
        marketCode: "FR",
        currency: "EUR",
        primaryProviderId: "primary",
        fallbackProviderId: "fallback",
        automaticFailover: false,
      },
      entries,
      nowMs: Date.parse(observedAt),
    });
    expect(withoutApproval.selectedProviderId).toBeNull();

    const approved = resolveProviderRoute({
      policy: {
        capability: "payment.card",
        operation: "authorize",
        marketCode: "FR",
        currency: "EUR",
        primaryProviderId: "primary",
        fallbackProviderId: "fallback",
        automaticFailover: true,
      },
      entries,
      nowMs: Date.parse(observedAt),
    });
    expect(approved).toMatchObject({
      selectedProviderId: "fallback",
      isFallbackActive: true,
      status: "DEGRADED",
    });
  });

  it("rejects a healthy provider that cannot handle the requested currency", () => {
    const observedAt = "2026-08-24T10:00:00.000Z";
    const stripe = SHONGRE_PROVIDER_REGISTRY.find(({ id }) => id === "stripe")!;
    const result = resolveProviderRoute({
      policy: {
        capability: "payment.card",
        operation: "authorize",
        marketCode: "CH",
        currency: "CHF",
        primaryProviderId: "stripe",
        automaticFailover: false,
      },
      entries: [
        {
          definition: { ...stripe, supportedCurrencies: ["EUR"] },
          runtime: {
            configured: true,
            enabled: true,
            environment: "sandbox",
            health: "HEALTHY",
            healthEvidence: "LIVE_PROBE",
            lastCheckedAt: observedAt,
            message: "test",
          },
          readiness: {
            score: 100,
            productionReady: true,
            active: true,
            blockers: [],
          },
        },
      ],
      nowMs: Date.parse(observedAt),
    });

    expect(result.selectedProviderId).toBeNull();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.reasons).toContain(
      "Primary provider does not support CHF for authorize.",
    );
  });
});
