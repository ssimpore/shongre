import {
  evaluateProviderReadiness,
  SHONGRE_CAPABILITY_REQUIREMENTS,
  SHONGRE_PROVIDER_REGISTRY,
  type ProviderCapabilityState,
  type ProviderControlPlaneSnapshot,
  type ProviderDiagnosticResult,
  type ProviderRuntimeEvidence,
} from "@shongre/contracts/provider-platform";
import type { ProviderControlPlaneServiceContract } from "../../contracts/provider-control-plane.contract";
import type {
  ProviderConnection,
  ProviderConnectionInput,
  ProviderCredentialRotation,
} from "@shongre/contracts/provider-connections";

const demoEvidence = (
  adapterStatus: string,
  kind: string,
): ProviderRuntimeEvidence => {
  const internal = kind === "INTERNAL" && adapterStatus === "IMPLEMENTED";
  return {
    configured: internal,
    enabled: internal,
    environment: "demo",
    health: internal ? "HEALTHY" : "UNKNOWN",
    healthEvidence: internal ? "RUNTIME_SIGNAL" : "NONE",
    lastCheckedAt: internal ? new Date().toISOString() : undefined,
    lastSuccessfulAt: internal ? new Date().toISOString() : undefined,
    message: internal
      ? "Service interne chargé dans le runtime de démonstration."
      : "Mode démo : aucune configuration ou santé de production n'est affirmée.",
  };
};

export class DemoProviderControlPlaneService implements ProviderControlPlaneServiceContract {
  private connections: ProviderConnection[] = [
    {
      id: "70000000-0000-4000-8000-000000000001",
      tenantId: "10000000-0000-4000-8000-000000000001",
      ownerType: "TENANT",
      providerId: "demo_ai",
      providerFamily: "AI",
      displayName: "IA déterministe de démonstration",
      status: "ACTIVE",
      configuration: { environment: "demo", externalCalls: false },
      capabilities: ["ai.crm_drafting", "ai.prospect_research"],
      isDefault: true,
      credentialConfigured: false,
      createdAt: "2026-08-25T08:00:00.000Z",
      updatedAt: "2026-08-25T08:00:00.000Z",
      version: 1,
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      tenantId: "10000000-0000-4000-8000-000000000001",
      ownerType: "USER",
      ownerId: "10000000-0000-4000-8000-000000000004",
      providerId: "demo_mailbox",
      providerFamily: "MAILBOX",
      displayName: "Messagerie personnelle de démonstration",
      status: "ACTIVE",
      configuration: { environment: "demo", externalCalls: false },
      capabilities: ["mailbox.send", "mailbox.sync"],
      isDefault: true,
      credentialConfigured: false,
      createdAt: "2026-08-25T08:00:00.000Z",
      updatedAt: "2026-08-25T08:00:00.000Z",
      version: 1,
    },
  ];

  async listConnections(): Promise<ProviderConnection[]> {
    return structuredClone(this.connections);
  }

  async createConnection(
    input: ProviderConnectionInput,
  ): Promise<ProviderConnection> {
    const now = new Date().toISOString();
    const connection: ProviderConnection = {
      id: crypto.randomUUID(),
      tenantId: "10000000-0000-4000-8000-000000000001",
      ownerType: input.ownerType,
      ownerId:
        input.ownerType === "USER"
          ? "10000000-0000-4000-8000-000000000004"
          : undefined,
      providerId: input.providerId,
      providerFamily: input.providerFamily,
      displayName: input.displayName,
      status: "DRAFT",
      configuration: input.configuration,
      capabilities: input.capabilities,
      isDefault: input.isDefault,
      credentialConfigured: Boolean(input.credential),
      credentialHint: input.credential
        ? `••••${input.credential.slice(-4).toUpperCase()}`
        : undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.connections.push(connection);
    return structuredClone(connection);
  }

  async rotateCredential(
    connectionId: string,
    input: ProviderCredentialRotation,
  ): Promise<ProviderConnection> {
    const connection = this.connections.find(
      (item) => item.id === connectionId,
    );
    if (!connection) throw new Error("Connexion fournisseur introuvable.");
    if (connection.version !== input.expectedVersion) {
      throw new Error(
        "Cette connexion a été modifiée. Rechargez-la avant de réessayer.",
      );
    }
    Object.assign(connection, {
      credentialConfigured: true,
      credentialHint: `••••${input.credential.slice(-4).toUpperCase()}`,
      status: "DRAFT",
      version: connection.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(connection);
  }

  async getSnapshot(): Promise<ProviderControlPlaneSnapshot> {
    const providers = SHONGRE_PROVIDER_REGISTRY.map((definition) => {
      const runtime = demoEvidence(definition.adapterStatus, definition.kind);
      return {
        definition,
        runtime,
        readiness: evaluateProviderReadiness(definition, runtime),
      };
    });
    const byId = new Map(
      providers.map((entry) => [entry.definition.id, entry]),
    );
    const capabilities = SHONGRE_CAPABILITY_REQUIREMENTS.map((requirement) => {
      const primary = byId.get(requirement.primaryProviderId);
      const implemented = Boolean(
        primary?.definition.implementedCapabilities.includes(
          requirement.capability,
        ),
      );
      const demoOnly = Boolean(
        primary?.definition.demoOnlyCapabilities?.includes(
          requirement.capability,
        ),
      );
      const primaryState: ProviderCapabilityState =
        implemented && primary?.runtime.health === "HEALTHY"
          ? "OPERATIONAL"
          : implemented || demoOnly
            ? "UNKNOWN"
            : "UNAVAILABLE";
      return {
        ...requirement,
        primaryState,
        fallbackReady: false,
        blockers: primary?.readiness.blockers || ["No provider owner."],
      };
    });
    const critical = capabilities.filter(({ criticality }) =>
      ["P0", "P1"].includes(criticality),
    );
    const verified = critical.filter(
      ({ primaryState }) => primaryState === "OPERATIONAL",
    );

    return {
      generatedAt: new Date().toISOString(),
      environment: "demo",
      providers,
      capabilities,
      summary: {
        discovered: providers.length,
        implemented: providers.filter(
          ({ definition }) => definition.adapterStatus === "IMPLEMENTED",
        ).length,
        active: 0,
        productionReady: 0,
        missingCriticalCapabilities: critical.filter(({ primaryState }) =>
          ["UNAVAILABLE", "UNCONFIGURED"].includes(primaryState),
        ).length,
        verifiedHealthScore:
          verified.length > 0 && verified.length === critical.length
            ? 100
            : null,
        verifiedCriticalCapabilities: verified.length,
      },
    };
  }

  async testProvider(providerId: string): Promise<ProviderDiagnosticResult> {
    const definition = SHONGRE_PROVIDER_REGISTRY.find(
      ({ id }) => id === providerId,
    );
    return {
      providerId,
      supported: false,
      success: false,
      health: "UNKNOWN",
      evidence: "NONE",
      message:
        "Mode démo : aucun endpoint externe n'a été contacté. Passez en mode API pour exécuter un probe backend sûr.",
      testedAt: new Date().toISOString(),
      latencyMs: 0,
      checks: [
        {
          name: "production_adapter",
          status: definition?.adapterStatus === "IMPLEMENTED" ? "PASS" : "FAIL",
          message: definition
            ? `État du code : ${definition.adapterStatus}.`
            : "Fournisseur absent du registre.",
        },
        {
          name: "live_probe",
          status: "SKIP",
          message:
            "Les probes externes sont interdits dans l'adaptateur de démo.",
        },
      ],
    };
  }
}

export const demoProviderControlPlaneService =
  new DemoProviderControlPlaneService();
