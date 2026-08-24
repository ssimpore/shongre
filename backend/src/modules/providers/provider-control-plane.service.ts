import {
  evaluateProviderReadiness,
  getProviderOperationalDefinition,
  SHONGRE_CAPABILITY_REQUIREMENTS,
  SHONGRE_PROVIDER_REGISTRY,
  type ProviderOperationalDefinition,
  type ProviderCapabilityControlPlaneEntry,
  type ProviderControlPlaneSnapshot,
  type ProviderDiagnosticResult,
  type ProviderRuntimeEvidence,
} from "@shongre/contracts/provider-platform";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";

const now = () => new Date().toISOString();

function runtimeEnvironment(): ProviderRuntimeEvidence["environment"] {
  if (config.dataMode === "demo") return "demo";
  return config.nodeEnv === "production" ? "production" : "sandbox";
}

function baseEvidence(
  overrides: Partial<ProviderRuntimeEvidence>,
): ProviderRuntimeEvidence {
  return {
    configured: false,
    enabled: false,
    environment: runtimeEnvironment(),
    health: "DISABLED",
    healthEvidence: "NONE",
    message: "No runtime adapter is selected in this environment.",
    ...overrides,
  };
}

function oauthEvidence(
  enabled: boolean,
  configured: boolean,
): ProviderRuntimeEvidence {
  return baseEvidence({
    configured,
    enabled,
    health: enabled
      ? configured
        ? "UNKNOWN"
        : "MISCONFIGURED"
      : "DISABLED",
    healthEvidence: configured ? "CONFIGURATION" : "NONE",
    message: enabled
      ? configured
        ? "OAuth adapter and configuration are present; no end-to-end login has been verified by this snapshot."
        : "OAuth is enabled but required server configuration is incomplete."
      : "OAuth provider is disabled.",
  });
}

function currentRuntimeEvidence(
  definition: ProviderOperationalDefinition,
): ProviderRuntimeEvidence {
  switch (definition.id) {
    case "stripe": {
      const enabled = config.paymentProvider === "stripe";
      const configured = Boolean(
        config.stripeSecretKey && config.stripeWebhookSecret,
      );
      return baseEvidence({
        configured,
        enabled,
        health: enabled
          ? configured
            ? "UNKNOWN"
            : "MISCONFIGURED"
          : "DISABLED",
        healthEvidence: configured ? "CONFIGURATION" : "NONE",
        message: enabled
          ? configured
            ? "Checkout adapter is configured; run the safe authenticated diagnostic for current upstream evidence."
            : "Stripe mode is selected but secret/webhook configuration is incomplete."
          : "Stripe is not the selected payment adapter.",
      });
    }
    case "google_identity":
      return oauthEvidence(
        config.socialAuthEnabled && config.googleOAuth.enabled,
        Boolean(
          config.googleOAuth.clientId &&
            config.googleOAuth.clientSecret &&
            config.googleOAuth.callbackUrl,
        ),
      );
    case "apple_id":
      return oauthEvidence(
        config.socialAuthEnabled && config.appleOAuth.enabled,
        Boolean(
          config.appleOAuth.clientId &&
            config.appleOAuth.teamId &&
            config.appleOAuth.keyId &&
            config.appleOAuth.privateKey &&
            config.appleOAuth.callbackUrl,
        ),
      );
    case "facebook_identity":
      return oauthEvidence(
        config.socialAuthEnabled && config.facebookOAuth.enabled,
        Boolean(
          config.facebookOAuth.clientId &&
            config.facebookOAuth.clientSecret &&
            config.facebookOAuth.callbackUrl &&
            config.facebookOAuth.graphApiBaseUrl,
        ),
      );
    case "configured_email_delivery": {
      const configured = Boolean(
        config.authEmailDeliveryUrl && config.authEmailDeliveryToken,
      );
      return baseEvidence({
        configured,
        enabled: configured,
        health: configured ? "UNKNOWN" : "MISCONFIGURED",
        healthEvidence: configured ? "CONFIGURATION" : "NONE",
        message: configured
          ? "Delivery endpoint is configured; delivery/bounce health is not observable yet."
          : "Transactional email endpoint or token is missing.",
      });
    }
    case "google_gemini": {
      const selected = config.aiProvider === "gemini";
      return baseEvidence({
        configured: Boolean(config.geminiApiKey),
        enabled: selected,
        health: selected ? "MISCONFIGURED" : "DISABLED",
        healthEvidence: "NONE",
        message: selected
          ? "Gemini was selected, but the live adapter deliberately fails closed because it is not implemented."
          : "Only the deterministic demo AI adapter is available.",
      });
    }
    case "insee_sirene": {
      const selected = config.businessRegistryProvider === "siret";
      return baseEvidence({
        configured: false,
        enabled: selected,
        health: selected ? "MISCONFIGURED" : "DISABLED",
        message: selected
          ? "The live SIRET adapter is not implemented and fails closed."
          : "Only the deterministic demo business registry is available.",
      });
    }
    case "veriff": {
      const selected = config.kycProvider !== "demo";
      return baseEvidence({
        configured: false,
        enabled: selected,
        health: selected ? "MISCONFIGURED" : "DISABLED",
        message: selected
          ? "A live KYC mode is selected, but the adapter is not implemented and fails closed."
          : "Only the deterministic demo KYC adapter is available.",
      });
    }
    case "shongre_auth":
      return baseEvidence({
        configured: true,
        enabled: config.emailPasswordAuthEnabled,
        health: config.emailPasswordAuthEnabled ? "HEALTHY" : "DISABLED",
        healthEvidence: "RUNTIME_SIGNAL",
        lastCheckedAt: now(),
        lastSuccessfulAt: config.emailPasswordAuthEnabled ? now() : undefined,
        message: config.emailPasswordAuthEnabled
          ? "The in-process authentication and session service is loaded."
          : "Email/password authentication is disabled.",
      });
    case "postgres_search":
    case "supabase_storage": {
      const configured = Boolean(
        config.supabaseUrl && config.supabaseServiceRoleKey,
      );
      const enabled = config.dataMode === "database" && configured;
      return baseEvidence({
        configured,
        enabled,
        health: enabled ? "UNKNOWN" : configured ? "DISABLED" : "MISCONFIGURED",
        healthEvidence: configured ? "CONFIGURATION" : "NONE",
        message: enabled
          ? "Database adapter is selected; no live dependency probe has been recorded."
          : "The backend is not running in configured database mode.",
      });
    }
    case "in_app_notifications":
      return baseEvidence({
        configured: true,
        enabled: true,
        health: "HEALTHY",
        healthEvidence: "RUNTIME_SIGNAL",
        lastCheckedAt: now(),
        lastSuccessfulAt: now(),
        message: "The in-process notification service is loaded; external push delivery is a separate missing capability.",
      });
    case "osm_nominatim":
      return baseEvidence({
        configured: true,
        enabled: true,
        health: "UNKNOWN",
        healthEvidence: "NONE",
        message: "Browser map tiles are implemented, but no backend geocoding adapter or current provider probe exists.",
      });
    default:
      return baseEvidence({
        message:
          definition.lifecycle === "NOT_NEEDED"
            ? "This provider is explicitly not needed while the current operational owner remains sufficient."
            : definition.adapterStatus === "DEMO_ONLY"
              ? "A demo adapter exists, but no production adapter is implemented."
              : "No runtime adapter is implemented.",
      });
  }
}

function capabilityState(
  definition: ProviderOperationalDefinition | undefined,
  runtime: ProviderRuntimeEvidence | undefined,
  capability: string,
): ProviderCapabilityControlPlaneEntry["primaryState"] {
  if (!definition || !runtime) return "UNCONFIGURED";
  if (!definition.implementedCapabilities.includes(capability)) {
    return "UNAVAILABLE";
  }
  if (!runtime.enabled || !runtime.configured) return "UNCONFIGURED";
  if (runtime.health === "HEALTHY") return "OPERATIONAL";
  if (runtime.health === "DEGRADED" || runtime.health === "PARTIAL_OUTAGE") {
    return "DEGRADED";
  }
  if (runtime.health === "UNKNOWN") return "UNKNOWN";
  return "UNAVAILABLE";
}

export class ProviderControlPlaneService {
  private lastDiagnostics = new Map<string, ProviderRuntimeEvidence>();

  private runtimeFor(
    definition: ProviderOperationalDefinition,
  ): ProviderRuntimeEvidence {
    const baseline = currentRuntimeEvidence(definition);
    const diagnostic = this.lastDiagnostics.get(definition.id);
    if (!diagnostic) return baseline;
    return {
      ...baseline,
      ...diagnostic,
      configured: baseline.configured,
      enabled: baseline.enabled,
      environment: baseline.environment,
    };
  }

  getSnapshot(): ProviderControlPlaneSnapshot {
    const providers = SHONGRE_PROVIDER_REGISTRY.map((definition) => {
      const runtime = this.runtimeFor(definition);
      return {
        definition,
        runtime,
        readiness: evaluateProviderReadiness(definition, runtime),
      };
    });
    const byId = new Map(providers.map((entry) => [entry.definition.id, entry]));

    const capabilities = SHONGRE_CAPABILITY_REQUIREMENTS.map((requirement) => {
      const primary = byId.get(requirement.primaryProviderId);
      const fallback = requirement.fallbackProviderId
        ? byId.get(requirement.fallbackProviderId)
        : undefined;
      const primaryState = capabilityState(
        primary?.definition,
        primary?.runtime,
        requirement.capability,
      );
      const fallbackReady =
        capabilityState(
          fallback?.definition,
          fallback?.runtime,
          requirement.capability,
        ) === "OPERATIONAL";
      const blockers = [
        ...(primary?.readiness.blockers || ["No provider definition exists."]),
      ];
      if (
        primary &&
        !primary.definition.implementedCapabilities.includes(
          requirement.capability,
        )
      ) {
        blockers.unshift("The primary provider does not implement this capability.");
      }

      return {
        ...requirement,
        primaryState,
        fallbackReady,
        blockers: [...new Set(blockers)],
      };
    });

    const critical = capabilities.filter(({ criticality }) =>
      criticality === "P0" || criticality === "P1",
    );
    const verified = critical.filter(({ primaryState }) =>
      ["OPERATIONAL", "DEGRADED", "UNAVAILABLE"].includes(primaryState),
    );
    const verifiedScore =
      verified.length > 0 && verified.length === critical.length
      ? Math.round(
          (verified.reduce((total, item) => {
            if (item.primaryState === "OPERATIONAL") return total + 1;
            if (item.primaryState === "DEGRADED") return total + 0.5;
            return total;
          }, 0) /
            verified.length) *
            100,
        )
        : null;

    return {
      generatedAt: now(),
      environment: runtimeEnvironment(),
      providers,
      capabilities,
      summary: {
        discovered: providers.length,
        implemented: providers.filter(
          ({ definition }) => definition.adapterStatus === "IMPLEMENTED",
        ).length,
        active: providers.filter(({ readiness }) => readiness.active).length,
        productionReady: providers.filter(
          ({ readiness }) => readiness.productionReady,
        ).length,
        missingCriticalCapabilities: critical.filter(({ primaryState }) =>
          ["UNAVAILABLE", "UNCONFIGURED"].includes(primaryState),
        ).length,
        verifiedHealthScore: verifiedScore,
        verifiedCriticalCapabilities: verified.length,
      },
    };
  }

  async testProvider(providerId: string): Promise<ProviderDiagnosticResult> {
    const definition = getProviderOperationalDefinition(providerId);
    if (!definition) {
      throw new AppError({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Provider not found in the canonical registry.",
      });
    }

    const startedAt = Date.now();
    const baseline = currentRuntimeEvidence(definition);
    const configurationCheck = {
      name: "runtime_configuration",
      status: baseline.configured ? ("PASS" as const) : ("FAIL" as const),
      message: baseline.configured
        ? "Required runtime configuration is present."
        : "Required runtime configuration is incomplete.",
    };

    if (definition.adapterStatus !== "IMPLEMENTED") {
      return {
        providerId,
        supported: false,
        success: false,
        health: baseline.health,
        evidence: "NONE",
        message: "No production adapter exists; a live integration test cannot be run.",
        testedAt: now(),
        latencyMs: Date.now() - startedAt,
        checks: [configurationCheck, {
          name: "production_adapter",
          status: "FAIL",
          message: "Demo/catalogue presence is not an operational adapter.",
        }],
      };
    }

    if (!baseline.configured || !baseline.enabled) {
      const health: ProviderRuntimeEvidence["health"] = baseline.enabled
        ? "MISCONFIGURED"
        : "DISABLED";
      return {
        providerId,
        supported: true,
        success: false,
        health,
        evidence: baseline.healthEvidence,
        message: baseline.message,
        testedAt: now(),
        latencyMs: Date.now() - startedAt,
        checks: [configurationCheck],
      };
    }

    if (providerId === "stripe") {
      return this.testStripe(startedAt, configurationCheck);
    }

    if (definition.healthCheckKind === "INTERNAL_PROBE") {
      const testedAt = now();
      const result: ProviderDiagnosticResult = {
        providerId,
        supported: true,
        success: true,
        health: "HEALTHY",
        evidence: "RUNTIME_SIGNAL",
        message: "Internal service probe passed in the current process.",
        testedAt,
        latencyMs: Date.now() - startedAt,
        checks: [configurationCheck, {
          name: "internal_service",
          status: "PASS",
          message: "Service is loaded and callable.",
        }],
      };
      this.rememberDiagnostic(result);
      return result;
    }

    return {
      providerId,
      supported: false,
      success: false,
      health: "UNKNOWN",
      evidence: baseline.healthEvidence,
      message: "Configuration can be validated, but no safe live health probe is implemented for this provider.",
      testedAt: now(),
      latencyMs: Date.now() - startedAt,
      checks: [configurationCheck, {
        name: "live_probe",
        status: "SKIP",
        message: "No non-destructive provider-specific probe is registered.",
      }],
    };
  }

  private async testStripe(
    startedAt: number,
    configurationCheck: ProviderDiagnosticResult["checks"][number],
  ): Promise<ProviderDiagnosticResult> {
    const testedAt = now();
    try {
      const response = await fetch("https://api.stripe.com/v1/balance", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.stripeSecretKey}`,
          "Stripe-Version": "2026-02-25.clover",
        },
        signal: AbortSignal.timeout(5_000),
      });
      const success = response.ok;
      const result: ProviderDiagnosticResult = {
        providerId: "stripe",
        supported: true,
        success,
        health: success ? "HEALTHY" : response.status >= 500 ? "OUTAGE" : "MISCONFIGURED",
        evidence: "LIVE_PROBE",
        message: success
          ? "Stripe authenticated balance read succeeded; no funds were moved."
          : `Stripe diagnostic returned HTTP ${response.status}.`,
        testedAt,
        latencyMs: Date.now() - startedAt,
        checks: [configurationCheck, {
          name: "authenticated_balance_read",
          status: success ? "PASS" : "FAIL",
          message: success
            ? "Authenticated read completed."
            : `Provider returned HTTP ${response.status}.`,
        }],
      };
      this.rememberDiagnostic(result);
      return result;
    } catch (error) {
      const result: ProviderDiagnosticResult = {
        providerId: "stripe",
        supported: true,
        success: false,
        health: "OUTAGE",
        evidence: "LIVE_PROBE",
        message: error instanceof Error ? error.message : "Stripe probe failed.",
        testedAt,
        latencyMs: Date.now() - startedAt,
        checks: [configurationCheck, {
          name: "authenticated_balance_read",
          status: "FAIL",
          message: "The safe authenticated read failed or timed out.",
        }],
      };
      this.rememberDiagnostic(result);
      return result;
    }
  }

  private rememberDiagnostic(result: ProviderDiagnosticResult): void {
    this.lastDiagnostics.set(result.providerId, {
      configured: true,
      enabled: true,
      environment: runtimeEnvironment(),
      health: result.health,
      healthEvidence: result.evidence,
      lastCheckedAt: result.testedAt,
      lastSuccessfulAt: result.success ? result.testedAt : undefined,
      lastFailureAt: result.success ? undefined : result.testedAt,
      latencyMs: result.latencyMs,
      message: result.message,
    });
  }
}

export const providerControlPlaneService = new ProviderControlPlaneService();
