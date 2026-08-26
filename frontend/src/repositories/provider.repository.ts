/**
 * SHONGRE PROVIDER REPOSITORY
 * Repository contract and deterministic demo implementation with localStorage persistence.
 * Safe credentials metadata representation and zero plain secrets in frontend.
 */

import {
  Provider,
  ProviderConfiguration,
  ProviderHealthStatus,
  ProviderMarketOverride,
  ProviderAuditEvent,
  ProviderTestResult,
  EffectiveProviderResolution,
  CapabilityHealthResult,
  ProviderImpactAnalysis,
  ProviderCapability,
  PROVIDER_CONFIGURATION_CONSTRAINTS,
} from "../domains/providers/provider.types";
import { deterministicRuntimeId } from "../utilities/deterministic-id";
import {
  CANONICAL_PROVIDER_REGISTRY,
  getProviderById,
} from "../domains/providers/provider.registry";
import { providerResolver } from "../domains/providers/provider.resolver";
import { providerValidator } from "../domains/providers/provider-validation";
import { storageService } from "../services/storage.service";
import { auditService } from "../security/audit.service";
import { DEFAULT_MARKET_CODE } from "../configuration/market-baseline";
import { COUNTRY_REGISTRY } from "@shongre/contracts";

export interface IProviderRepository {
  getProviders(): Provider[];
  getProvider(id: string): Provider | undefined;
  getConfigurations(): Record<string, ProviderConfiguration>;
  getConfiguration(providerId: string): ProviderConfiguration | null;
  saveConfiguration(
    providerId: string,
    updates: Partial<ProviderConfiguration>,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration>;
  setMarketOverride(
    providerId: string,
    marketCode: string,
    override: ProviderMarketOverride,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration>;
  resetMarketOverride(
    providerId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration>;
  setProviderHealth(
    providerId: string,
    health: ProviderHealthStatus,
    message?: string,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration>;
  testProvider(
    providerId: string,
    scenario?:
      | "healthy"
      | "missing_credentials"
      | "timeout"
      | "invalid_config"
      | "unsupported_market",
  ): Promise<ProviderTestResult>;
  resolveEffectiveProviders(
    capability: ProviderCapability,
    marketCode?: string,
  ): EffectiveProviderResolution;
  resolveCapabilityHealth(
    capability: ProviderCapability,
    marketCode?: string,
  ): CapabilityHealthResult;
  analyzeImpact(
    providerId: string,
    targetMarketCode?: string,
  ): ProviderImpactAnalysis;
  getAuditHistory(providerId?: string): ProviderAuditEvent[];
}
/**
 * Demo configuration keeps deterministic journeys available without
 * impersonating server credentials or live provider health.
 */
export const INITIAL_PROVIDER_CONFIGURATIONS: Record<
  string,
  ProviderConfiguration
> = Object.fromEntries(
  CANONICAL_PROVIDER_REGISTRY.map((provider, index) => {
    const isNotNeeded = provider.operational.lifecycle === "NOT_NEEDED";
    return [
      provider.id,
      {
        providerId: provider.id,
        enabled: !isNotNeeded,
        environment: "demo" as const,
        priority: index + PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min,
        credentialStatus: "not_required" as const,
        health: "unknown" as const,
        healthMessage:
          provider.operational.adapterStatus === "IMPLEMENTED"
            ? "Adapter détecté dans le code ; aucune santé live n'est vérifiée en mode démo."
            : provider.operational.adapterStatus === "DEMO_ONLY"
              ? "Simulation déterministe uniquement — aucun statut de production."
              : "Aucun adaptateur de production n'est implémenté.",
        settings: {},
        marketOverrides: Object.fromEntries(
          COUNTRY_REGISTRY.filter(
            (country) =>
              country.launchStatus === "active" &&
              !country.isDefault &&
              (provider.supportedMarkets.includes("*") ||
                provider.supportedMarkets.includes(country.marketCode)),
          ).map((country) => [
            country.marketCode,
            {
              enabled: !isNotNeeded,
              priority: index + PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min,
              customNotes: "Affectation explicite du scénario démo.",
            },
          ]),
        ),
        updatedAt: "2026-08-24T00:00:00.000Z",
        version: 2,
      },
    ];
  }),
);

export class DemoProviderRepository implements IProviderRepository {
  private auditEvents: ProviderAuditEvent[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    const existing = storageService.get<Record<
      string,
      ProviderConfiguration
    > | null>("shongre_provider_configs_v2", null);
    if (!existing) {
      storageService.set(
        "shongre_provider_configs_v2",
        INITIAL_PROVIDER_CONFIGURATIONS,
      );
    }
  }

  public getProviders(): Provider[] {
    return CANONICAL_PROVIDER_REGISTRY;
  }

  public getProvider(id: string): Provider | undefined {
    return getProviderById(id);
  }

  public getConfigurations(): Record<string, ProviderConfiguration> {
    return (
      storageService.get<Record<string, ProviderConfiguration>>(
        "shongre_provider_configs_v2",
        INITIAL_PROVIDER_CONFIGURATIONS,
      ) || INITIAL_PROVIDER_CONFIGURATIONS
    );
  }

  public getConfiguration(providerId: string): ProviderConfiguration | null {
    const configs = this.getConfigurations();
    return configs[providerId] || null;
  }

  public async saveConfiguration(
    providerId: string,
    updates: Partial<ProviderConfiguration>,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(
        `Prestataire "${providerId}" introuvable dans le registre.`,
      );
    }

    const configs = this.getConfigurations();
    const current = configs[providerId] || {
      providerId,
      enabled: false,
      environment: "demo",
      priority: PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min,
      credentialStatus: "not_configured",
      health: "unknown",
      settings: {},
      marketOverrides: {},
      updatedAt: new Date().toISOString(),
      version: 0,
    };

    const newConfig: ProviderConfiguration = {
      ...current,
      ...updates,
      providerId,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || "Administrateur",
      version: current.version + 1,
    };

    // Validate
    const validation = providerValidator.validateConfiguration(
      provider,
      newConfig,
    );
    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    configs[providerId] = newConfig;
    storageService.set("shongre_provider_configs_v2", configs);

    // Audit log
    this.recordAuditEvent({
      actorId: actor?.id || "admin-1",
      actorName: actor?.name || "Administrateur",
      actorRole: actor?.role || "admin",
      providerId,
      providerName: provider.name,
      action:
        updates.enabled !== undefined && updates.enabled !== current.enabled
          ? updates.enabled
            ? "enabled"
            : "disabled"
          : "configured",
      details: `Configuration mise à jour pour ${provider.name} (v${newConfig.version}).`,
      previousValue: current,
      newValue: newConfig,
    });

    return newConfig;
  }

  public async setMarketOverride(
    providerId: string,
    marketCode: string,
    override: ProviderMarketOverride,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    const normMarket = marketCode.toUpperCase();
    const validation = providerValidator.validateMarketOverride(
      provider,
      normMarket,
      override,
    );
    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    const configs = this.getConfigurations();
    const current = configs[providerId];
    if (!current)
      throw new Error(`Configuration introuvable pour "${providerId}".`);

    const updatedOverrides = {
      ...current.marketOverrides,
      [normMarket]: {
        ...override,
        updatedAt: new Date().toISOString(),
        updatedBy: actor?.name || "Administrateur",
      },
    };

    const newConfig: ProviderConfiguration = {
      ...current,
      marketOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || "Administrateur",
      version: current.version + 1,
    };

    configs[providerId] = newConfig;
    storageService.set("shongre_provider_configs_v2", configs);

    this.recordAuditEvent({
      actorId: actor?.id || "admin-1",
      actorName: actor?.name || "Administrateur",
      actorRole: actor?.role || "admin",
      providerId,
      providerName: provider.name,
      action: "market_override_set",
      marketCode: normMarket,
      details: `Surcharge de marché configurée pour ${normMarket} sur ${provider.name}.`,
    });

    return newConfig;
  }

  public async resetMarketOverride(
    providerId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    const normMarket = marketCode.toUpperCase();
    const configs = this.getConfigurations();
    const current = configs[providerId];
    if (!current)
      throw new Error(`Configuration introuvable pour "${providerId}".`);

    const updatedOverrides = { ...current.marketOverrides };
    delete updatedOverrides[normMarket];

    const newConfig: ProviderConfiguration = {
      ...current,
      marketOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || "Administrateur",
      version: current.version + 1,
    };

    configs[providerId] = newConfig;
    storageService.set("shongre_provider_configs_v2", configs);

    this.recordAuditEvent({
      actorId: actor?.id || "admin-1",
      actorName: actor?.name || "Administrateur",
      actorRole: actor?.role || "admin",
      providerId,
      providerName: provider.name,
      action: "market_override_reset",
      marketCode: normMarket,
      details: `Affectation retirée pour ${normMarket} sur ${provider.name}. Le prestataire y est désormais indisponible.`,
    });

    return newConfig;
  }

  public async setProviderHealth(
    providerId: string,
    health: ProviderHealthStatus,
    message?: string,
    actor?: { id: string; name: string; role: string },
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    throw new Error(
      "La santé opérationnelle ne peut pas être simulée. Utilisez le diagnostic backend pour enregistrer une preuve réelle.",
    );
  }

  public async testProvider(
    providerId: string,
    scenario:
      | "healthy"
      | "missing_credentials"
      | "timeout"
      | "invalid_config"
      | "unsupported_market" = "healthy",
  ): Promise<ProviderTestResult> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return {
        providerId,
        success: false,
        scenario,
        latencyMs: 15,
        message: `Prestataire ${providerId} introuvable.`,
        testedAt: new Date().toISOString(),
        diagnostics: { error: "PROVIDER_NOT_FOUND" },
      };
    }

    const demoConfig = this.getConfiguration(providerId);
    return {
      providerId,
      success: false,
      supported: false,
      scenario,
      latencyMs: 0,
      message:
        demoConfig?.environment === "demo"
          ? "Mode démo : aucun endpoint externe n'a été contacté. Lancez ce diagnostic via le backend dans un environnement configuré."
          : "Le dépôt de démonstration n'est pas autorisé à tester une intégration externe.",
      testedAt: new Date().toISOString(),
      evidence: "none",
      diagnostics: {
        code: "LIVE_DIAGNOSTIC_REQUIRES_BACKEND",
        adapterStatus: provider.operational.adapterStatus,
        lifecycle: provider.operational.lifecycle,
      },
    };
  }

  public resolveEffectiveProviders(
    capability: ProviderCapability,
    marketCode = DEFAULT_MARKET_CODE,
  ): EffectiveProviderResolution {
    const configs = this.getConfigurations();
    return providerResolver.resolveEffectiveProviders({
      capability,
      marketCode,
      configurations: configs,
    });
  }

  public resolveCapabilityHealth(
    capability: ProviderCapability,
    marketCode = DEFAULT_MARKET_CODE,
  ): CapabilityHealthResult {
    const configs = this.getConfigurations();
    return providerResolver.resolveCapabilityHealth({
      capability,
      marketCode,
      configurations: configs,
    });
  }

  public analyzeImpact(
    providerId: string,
    targetMarketCode = DEFAULT_MARKET_CODE,
  ): ProviderImpactAnalysis {
    const configs = this.getConfigurations();
    return providerResolver.analyzeProviderImpact({
      providerId,
      configurations: configs,
      targetMarketCode,
    });
  }

  public getAuditHistory(providerId?: string): ProviderAuditEvent[] {
    const stored = storageService.get<ProviderAuditEvent[]>(
      "shongre_provider_audit_logs_v1",
      [],
    );
    const merged = [...stored, ...this.auditEvents];
    if (providerId) {
      return merged.filter((e) => e.providerId === providerId);
    }
    return merged;
  }

  private recordAuditEvent(
    event: Omit<ProviderAuditEvent, "id" | "timestamp">,
  ): void {
    const newEvent: ProviderAuditEvent = {
      ...event,
      id: deterministicRuntimeId("p-aud", [event]),
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.unshift(newEvent);

    const stored = storageService.get<ProviderAuditEvent[]>(
      "shongre_provider_audit_logs_v1",
      [],
    );
    stored.unshift(newEvent);
    storageService.set("shongre_provider_audit_logs_v1", stored.slice(0, 100)); // Keep last 100

    // Also bridge to security audit log
    auditService.logEvent({
      actorId: event.actorId,
      actorName: event.actorName,
      actorRole: event.actorRole,
      targetId: event.providerId,
      targetName: event.providerName,
      action: "provider_configured",
      details: event.details,
    });
  }
}

export const providerRepository: IProviderRepository =
  new DemoProviderRepository();
