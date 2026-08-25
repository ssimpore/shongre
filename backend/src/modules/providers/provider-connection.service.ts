import { randomUUID } from "node:crypto";
import {
  providerConnectionInputSchema,
  providerCredentialRotationSchema,
  providerResolutionRequestSchema,
  type ProviderConnection,
  type ProviderConnectionInput,
  type ProviderCredentialRotation,
  type ProviderResolutionRequest,
} from "@shongre/contracts/provider-connections";
import { SHONGRE_PROVIDER_REGISTRY } from "@shongre/contracts/provider-platform";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import {
  decryptProviderCredential,
  encryptProviderCredential,
} from "../../integrations/providers/credential-envelope.js";
import { assertSafeProviderUrl } from "../../integrations/providers/safe-provider-url.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requireAuthenticated } from "../../shared/auth/principal.js";

const DEMO_CONNECTION_ID = "70000000-0000-4000-8000-000000000001";

interface ProviderResolutionContext {
  tenantId: string;
  userId?: string;
  marketCode: string;
}

interface TenantProviderPolicy {
  allowPersonalConnections: boolean;
  allowPlatformFallback: boolean;
  allowedProviderIds: string[];
  allowedCapabilities: string[];
  aiEnabled: boolean;
  aiFeatureAllowList: string[];
  allowCustomEndpoints: boolean;
}

function mapConnection(row: any, credential?: any): ProviderConnection {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    ownerType: row.owner_type,
    ownerId: row.owner_id ?? undefined,
    providerId: row.provider_id,
    providerFamily: row.provider_family,
    displayName: row.display_name,
    status: row.status,
    configuration: row.configuration ?? {},
    capabilities: row.capabilities ?? [],
    isDefault: Boolean(row.is_default),
    credentialConfigured: Boolean(credential),
    credentialHint: credential?.credential_hint ?? undefined,
    lastValidatedAt: row.last_validated_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

function databaseBytes(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string" && value.startsWith("\\x")) {
    return Buffer.from(value.slice(2), "hex");
  }
  if (typeof value === "string") return Buffer.from(value, "base64");
  throw new Error("Invalid encrypted provider credential representation.");
}

function unavailable(details: Record<string, unknown>): never {
  throw new AppError({
    code: "FORBIDDEN",
    message: "Aucune connexion fournisseur autorisée n’est disponible.",
    details: { reason: "provider_resolution_failed", ...details },
  });
}

export function isConnectionVisibleToPrincipal(
  row: { owner_type: string; owner_id?: string | null },
  userId?: string,
): boolean {
  return (
    row.owner_type !== "USER" || (Boolean(userId) && row.owner_id === userId)
  );
}

export class ProviderConnectionService {
  private demoConnections: ProviderConnection[] = [];

  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  async resolve(
    context: ProviderResolutionContext,
    rawRequest: ProviderResolutionRequest,
  ): Promise<ProviderConnection> {
    const request = providerResolutionRequestSchema.parse(rawRequest);
    if (config.dataMode === "demo") {
      if (
        request.explicitConnectionId &&
        request.explicitConnectionId !== DEMO_CONNECTION_ID
      ) {
        return unavailable({ capability: request.capability });
      }
      return {
        id: DEMO_CONNECTION_ID,
        tenantId: context.tenantId,
        ownerType: "TENANT",
        providerId: request.capability.startsWith("ai.")
          ? "demo_ai"
          : "demo_provider",
        providerFamily: request.capability.startsWith("ai.")
          ? "AI"
          : request.capability.startsWith("mailbox.")
            ? "MAILBOX"
            : "EMAIL_DELIVERY",
        displayName: "Fournisseur déterministe de démonstration",
        status: "ACTIVE",
        configuration: { environment: "demo", externalCalls: false },
        capabilities: [request.capability],
        isDefault: true,
        credentialConfigured: false,
        createdAt: "2026-08-25T08:00:00.000Z",
        updatedAt: "2026-08-25T08:00:00.000Z",
        version: 1,
      };
    }

    const policy = await this.policy(context.tenantId);
    this.assertPolicy(policy, request);
    const [tenantRows, platformRows] = await Promise.all([
      this.rows(
        this.client
          .from("provider_connections")
          .select("*")
          .eq("tenant_id", context.tenantId)
          .eq("status", "ACTIVE")
          .contains("capabilities", [request.capability]),
      ),
      policy.allowPlatformFallback
        ? this.rows(
            this.client
              .from("provider_connections")
              .select("*")
              .eq("owner_type", "PLATFORM")
              .eq("status", "ACTIVE")
              .contains("capabilities", [request.capability]),
          )
        : Promise.resolve([]),
    ]);
    const candidates = [...tenantRows, ...platformRows].filter((row) => {
      if (
        policy.allowedProviderIds.length &&
        !policy.allowedProviderIds.includes(row.provider_id)
      )
        return false;
      if (row.owner_type === "USER") {
        return (
          policy.allowPersonalConnections &&
          Boolean(context.userId) &&
          row.owner_id === context.userId
        );
      }
      if (row.owner_type === "TENANT")
        return row.tenant_id === context.tenantId;
      return policy.allowPlatformFallback;
    });
    const selected = request.explicitConnectionId
      ? candidates.find((row) => row.id === request.explicitConnectionId)
      : candidates.sort((left, right) => {
          const priority = (row: any) =>
            row.owner_type === "USER" ? 0 : row.owner_type === "TENANT" ? 1 : 2;
          return (
            priority(left) - priority(right) ||
            Number(right.is_default) - Number(left.is_default)
          );
        })[0];
    if (!selected) {
      return unavailable({
        tenantId: context.tenantId,
        capability: request.capability,
        explicitConnection: Boolean(request.explicitConnectionId),
      });
    }
    const credential = await this.activeCredential(selected.id);
    if (!credential) {
      return unavailable({
        capability: request.capability,
        connectionId: selected.id,
        reason: "credential_missing",
      });
    }
    return mapConnection(selected, credential);
  }

  async listForTenant(
    tenantId: string,
    userId?: string,
  ): Promise<ProviderConnection[]> {
    if (config.dataMode === "demo") {
      if (!this.demoConnections.length) {
        this.demoConnections = [
          {
            id: DEMO_CONNECTION_ID,
            tenantId,
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
            tenantId,
            ownerType: "USER",
            ownerId: userId,
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
      }
      return structuredClone(
        this.demoConnections.filter(
          (connection) =>
            connection.tenantId === tenantId &&
            (connection.ownerType !== "USER" || connection.ownerId === userId),
        ),
      );
    }
    const rows = await this.rows(
      this.client
        .from("provider_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    );
    const visible = rows.filter((row) =>
      isConnectionVisibleToPrincipal(row, userId),
    );
    const credentials = await Promise.all(
      visible.map((row) => this.activeCredential(row.id)),
    );
    return visible.map((row, index) => mapConnection(row, credentials[index]));
  }

  async listForPrincipal(
    principal: Principal,
  ): Promise<{ items: ProviderConnection[] }> {
    requireAuthenticated(principal);
    const tenantId = await this.tenantIdForUser(principal.userId);
    if (!tenantId)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Aucun tenant actif n’est associé à ce compte.",
      });
    return { items: await this.listForTenant(tenantId, principal.userId) };
  }

  async createForPrincipal(
    principal: Principal,
    rawInput: ProviderConnectionInput,
  ): Promise<ProviderConnection> {
    requireAuthenticated(principal);
    const input = providerConnectionInputSchema.parse(rawInput);
    if (input.ownerType === "PLATFORM") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Une connexion plateforme exige le workflow opérateur dédié.",
      });
    }
    const tenantId = await this.tenantIdForUser(principal.userId);
    if (!tenantId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Aucun tenant actif n’est associé à ce compte.",
      });
    }
    const definition = SHONGRE_PROVIDER_REGISTRY.find(
      (candidate) => candidate.id === input.providerId,
    );
    if (!definition) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Fournisseur absent du registre partagé.",
      });
    }
    const unsupported = input.capabilities.filter(
      (capability) => !definition.capabilities.includes(capability),
    );
    if (unsupported.length) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La connexion déclare une capacité non prise en charge par ce fournisseur.",
        details: { unsupportedCapabilities: unsupported },
      });
    }
    this.assertProviderFamilyMatchesRegistry(
      input.providerId,
      input.providerFamily,
    );
    this.assertSecretFreeConfiguration(input.configuration);
    const policy = await this.policy(tenantId);
    if (
      input.providerId === "openai_compatible" &&
      !policy.allowCustomEndpoints
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Les endpoints fournisseur personnalisés ne sont pas autorisés par ce tenant.",
      });
    }
    await this.validateConfiguredEndpoints(input.configuration);

    if (config.dataMode === "demo") {
      await this.listForTenant(tenantId, principal.userId);
      const now = new Date().toISOString();
      const value: ProviderConnection = {
        id: randomUUID(),
        tenantId,
        ownerType: input.ownerType,
        ownerId: input.ownerType === "USER" ? principal.userId : undefined,
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
      this.demoConnections.push(value);
      return structuredClone(value);
    }

    const { data, error } = await this.client
      .from("provider_connections")
      .insert({
        tenant_id: tenantId,
        owner_type: input.ownerType,
        owner_id: input.ownerType === "USER" ? principal.userId : null,
        provider_id: input.providerId,
        provider_family: input.providerFamily,
        display_name: input.displayName,
        status: "DRAFT",
        configuration: input.configuration,
        capabilities: input.capabilities,
        is_default: input.isDefault,
      })
      .select("*")
      .single();
    if (error) throw error;
    let connection = mapConnection(data);
    if (input.credential) {
      await providerCredentialVault.rotateEncryptedCredential(
        connection.id,
        connection.version,
        input.credential,
      );
      connection = await this.connectionForPrincipal(
        tenantId,
        principal.userId,
        connection.id,
      );
    }
    return connection;
  }

  async rotateCredentialForPrincipal(
    principal: Principal,
    connectionId: string,
    rawInput: ProviderCredentialRotation,
  ): Promise<ProviderConnection> {
    requireAuthenticated(principal);
    const input = providerCredentialRotationSchema.parse(rawInput);
    const tenantId = await this.tenantIdForUser(principal.userId);
    if (!tenantId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Aucun tenant actif n’est associé à ce compte.",
      });
    }
    if (config.dataMode === "demo") {
      await this.listForTenant(tenantId, principal.userId);
      const connection = this.demoConnections.find(
        (candidate) =>
          candidate.id === connectionId &&
          candidate.tenantId === tenantId &&
          (candidate.ownerType !== "USER" ||
            candidate.ownerId === principal.userId),
      );
      if (!connection)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Connexion fournisseur introuvable.",
        });
      if (connection.version !== input.expectedVersion) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette connexion a été modifiée. Rechargez-la avant de réessayer.",
        });
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
    await this.connectionForPrincipal(tenantId, principal.userId, connectionId);
    await providerCredentialVault.rotateEncryptedCredential(
      connectionId,
      input.expectedVersion,
      input.credential,
    );
    return this.connectionForPrincipal(
      tenantId,
      principal.userId,
      connectionId,
    );
  }

  async recordUsage(input: {
    tenantId: string;
    userId?: string;
    connection: ProviderConnection;
    capability: string;
    feature: string;
    correlationId: string;
    status: "SUCCEEDED" | "FAILED" | "REJECTED" | "CANCELLED";
    inputUnits?: number;
    outputUnits?: number;
    latencyMs?: number;
    estimatedCostMinor?: number;
    currency?: string;
  }): Promise<void> {
    if (config.dataMode === "demo") return;
    const { error } = await this.client.from("provider_usage_events").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      provider_connection_id: input.connection.id,
      provider_id: input.connection.providerId,
      capability: input.capability,
      feature: input.feature,
      correlation_id: input.correlationId || randomUUID(),
      status: input.status,
      input_units: input.inputUnits,
      output_units: input.outputUnits,
      latency_ms: input.latencyMs,
      estimated_cost_minor: input.estimatedCostMinor,
      currency: input.currency,
      safe_metadata: {},
    });
    if (error) throw error;
  }

  private async policy(tenantId: string): Promise<TenantProviderPolicy> {
    if (config.dataMode === "demo") {
      return {
        allowPersonalConnections: true,
        allowPlatformFallback: false,
        allowedProviderIds: [],
        allowedCapabilities: [],
        aiEnabled: true,
        aiFeatureAllowList: [],
        allowCustomEndpoints: true,
      };
    }
    const { data, error } = await this.client
      .from("provider_tenant_policies")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          allowPersonalConnections: Boolean(data.allow_personal_connections),
          allowPlatformFallback: Boolean(data.allow_platform_fallback),
          allowedProviderIds: data.allowed_provider_ids ?? [],
          allowedCapabilities: data.allowed_capabilities ?? [],
          aiEnabled: Boolean(data.ai_enabled),
          aiFeatureAllowList: data.ai_feature_allow_list ?? [],
          allowCustomEndpoints: Boolean(data.allow_custom_endpoints),
        }
      : {
          allowPersonalConnections: false,
          allowPlatformFallback: false,
          allowedProviderIds: [],
          allowedCapabilities: [],
          aiEnabled: false,
          aiFeatureAllowList: [],
          allowCustomEndpoints: false,
        };
  }

  private async tenantIdForUser(userId: string): Promise<string | null> {
    if (config.dataMode === "demo")
      return "10000000-0000-4000-8000-000000000001";
    const { data, error } = await this.client
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at")
      .limit(1);
    if (error) throw error;
    return data?.[0]?.organization_id ?? null;
  }

  private async connectionForPrincipal(
    tenantId: string,
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnection> {
    const { data, error } = await this.client
      .from("provider_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !isConnectionVisibleToPrincipal(data, userId)) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Connexion fournisseur introuvable.",
      });
    }
    return mapConnection(data, await this.activeCredential(connectionId));
  }

  private assertSecretFreeConfiguration(
    configuration: Record<string, unknown>,
  ) {
    const forbidden =
      /(api[_-]?key|secret|password|refresh[_-]?token|access[_-]?token|credential)/i;
    const visit = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.some(visit);
      if (!value || typeof value !== "object") return false;
      return Object.entries(value).some(
        ([key, nested]) => forbidden.test(key) || visit(nested),
      );
    };
    if (visit(configuration)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Les secrets doivent être transmis au coffre de credentials, jamais dans la configuration.",
      });
    }
  }

  private async validateConfiguredEndpoints(
    configuration: Record<string, unknown>,
  ) {
    const visit = async (value: unknown): Promise<void> => {
      if (Array.isArray(value)) {
        await Promise.all(value.map(visit));
        return;
      }
      if (!value || typeof value !== "object") return;
      await Promise.all(
        Object.entries(value).map(async ([key, nested]) => {
          if (typeof nested === "string" && /(url|endpoint)$/i.test(key)) {
            await assertSafeProviderUrl(nested);
          }
          await visit(nested);
        }),
      );
    };
    await visit(configuration);
  }

  private assertProviderFamilyMatchesRegistry(
    providerId: string,
    requestedFamily: ProviderConnection["providerFamily"],
  ) {
    const definition = SHONGRE_PROVIDER_REGISTRY.find(
      (candidate) => candidate.id === providerId,
    );
    if (!definition) return;
    const expectedFamilies = new Set<ProviderConnection["providerFamily"]>();
    if (definition.category === "AI") expectedFamilies.add("AI");
    if (definition.category === "MAILBOX") expectedFamilies.add("MAILBOX");
    if (definition.category === "EMAIL") expectedFamilies.add("EMAIL_DELIVERY");
    if (
      definition.capabilities.some((capability) =>
        capability.startsWith("calendar."),
      )
    ) {
      expectedFamilies.add("CALENDAR");
    }
    if (!expectedFamilies.size) expectedFamilies.add("OTHER");
    if (!expectedFamilies.has(requestedFamily)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La famille fournisseur ne correspond pas au registre partagé.",
      });
    }
  }

  private assertPolicy(
    policy: TenantProviderPolicy,
    request: ProviderResolutionRequest,
  ) {
    if (
      policy.allowedCapabilities.length &&
      !policy.allowedCapabilities.includes(request.capability)
    ) {
      return unavailable({
        capability: request.capability,
        reason: "capability_denied",
      });
    }
    if (request.capability.startsWith("ai.")) {
      if (!policy.aiEnabled)
        return unavailable({
          capability: request.capability,
          reason: "ai_disabled",
        });
      if (
        policy.aiFeatureAllowList.length &&
        !policy.aiFeatureAllowList.includes(request.feature)
      ) {
        return unavailable({
          capability: request.capability,
          feature: request.feature,
          reason: "ai_feature_denied",
        });
      }
    }
  }

  private async rows(
    request: PromiseLike<{ data: any[] | null; error: unknown }>,
  ): Promise<any[]> {
    const { data, error } = await request;
    if (error) throw error;
    return data ?? [];
  }

  private async activeCredential(connectionId: string): Promise<any | null> {
    const { data, error } = await this.client
      .from("provider_credentials")
      .select("id,credential_hint,last_validated_at")
      .eq("provider_connection_id", connectionId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

/** Server-only access to opaque secret-manager references. */
export class ProviderCredentialVault {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  private encryptionKey(): Buffer {
    const key = Buffer.from(
      config.providerCredentialEncryptionKeyBase64,
      "base64",
    );
    if (key.length !== 32) {
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message: "Le coffre de credentials fournisseur est mal configuré.",
      });
    }
    return key;
  }

  async rotateEncryptedCredential(
    connectionId: string,
    expectedVersion: number,
    secret: string,
  ): Promise<number> {
    if (config.dataMode === "demo") return expectedVersion + 1;
    const envelope = encryptProviderCredential(
      secret,
      this.encryptionKey(),
      config.providerCredentialKeyVersion,
    );
    const { data, error } = await this.client.rpc(
      "rotate_provider_credential",
      {
        p_connection_id: connectionId,
        p_expected_version: expectedVersion,
        p_encrypted_secret_base64: envelope.encryptedSecret.toString("base64"),
        p_encryption_iv_base64: envelope.iv.toString("base64"),
        p_encryption_tag_base64: envelope.authTag.toString("base64"),
        p_key_version: envelope.keyVersion,
        p_credential_hint: envelope.credentialHint,
      },
    );
    if (error) {
      const message = String(error.message ?? error);
      if (message.includes("PROVIDER_CONNECTION_CONFLICT")) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette connexion a été modifiée. Rechargez-la avant de réessayer.",
        });
      }
      if (message.includes("PROVIDER_CONNECTION_NOT_FOUND")) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Connexion fournisseur introuvable.",
        });
      }
      throw error;
    }
    return Number(data);
  }

  /** Decrypts only inside the server-side adapter boundary. Never log this value. */
  async getCredentialMaterial(
    tenantId: string,
    connectionId: string,
  ): Promise<{ kind: "reference" | "secret"; value: string }> {
    const { data: connection, error: connectionError } = await this.client
      .from("provider_connections")
      .select("tenant_id,owner_type")
      .eq("id", connectionId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (
      !connection ||
      (connection.owner_type !== "PLATFORM" &&
        connection.tenant_id !== tenantId)
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Connexion fournisseur introuvable.",
      });
    }
    const { data, error } = await this.client
      .from("provider_credentials")
      .select(
        "secret_reference,encrypted_secret,encryption_iv,encryption_tag,key_version",
      )
      .eq("provider_connection_id", connectionId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw error;
    if (data?.secret_reference) {
      return { kind: "reference", value: data.secret_reference };
    }
    if (
      !data?.encrypted_secret ||
      !data.encryption_iv ||
      !data.encryption_tag ||
      data.key_version !== config.providerCredentialKeyVersion
    ) {
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message:
          "Le credential fournisseur est indisponible ou nécessite une rotation de clé.",
      });
    }
    return {
      kind: "secret",
      value: decryptProviderCredential(
        {
          encryptedSecret: databaseBytes(data.encrypted_secret),
          iv: databaseBytes(data.encryption_iv),
          authTag: databaseBytes(data.encryption_tag),
        },
        this.encryptionKey(),
      ),
    };
  }

  async getSecretReference(
    tenantId: string,
    connectionId: string,
  ): Promise<string> {
    const { data: connection, error: connectionError } = await this.client
      .from("provider_connections")
      .select("tenant_id,owner_type")
      .eq("id", connectionId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (
      !connection ||
      (connection.owner_type !== "PLATFORM" &&
        connection.tenant_id !== tenantId)
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Connexion fournisseur introuvable.",
      });
    }
    const { data, error } = await this.client
      .from("provider_credentials")
      .select("secret_reference,encrypted_secret")
      .eq("provider_connection_id", connectionId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data?.secret_reference) {
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message:
          "Le coffre de secrets n’est pas configuré pour cette connexion.",
      });
    }
    return data.secret_reference;
  }
}

export const providerConnectionService = new ProviderConnectionService();
export const providerCredentialVault = new ProviderCredentialVault();
