import { randomBytes, randomUUID } from "node:crypto";
import {
  marketingAiAssistInputSchema,
  marketingConversionInputSchema,
  marketingJourneyEventSchema,
  marketingJourneyInputSchema,
  marketingWebhookSubscriptionInputSchema,
  type MarketingJourney,
} from "@shongre/contracts/marketing";
import { config } from "../../app/config/index.js";
import {
  DemoMarketingOperationsRepository,
  PostgresMarketingOperationsRepository,
  type IMarketingOperationsRepository,
  type IMarketingRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { encryptProviderCredential } from "../../integrations/providers/credential-envelope.js";
import { capabilityGateways } from "../../integrations/providers/gateways/index.js";
import { assertSafeProviderUrl } from "../../integrations/providers/safe-provider-url.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requirePermission } from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import { assertAutomationGraph } from "../automation/automation-runtime.js";
import { providerConnectionService } from "../providers/provider-connection.service.js";
import { enqueueMarketingWebhookEvent } from "./marketing-webhook-events.js";

function notFound(message: string): never {
  throw new AppError({ code: "NOT_FOUND", message });
}

function entitlementError(entitlement: string): never {
  throw new AppError({ code: "FORBIDDEN", message: "Cette fonctionnalité n’est pas incluse dans les droits Marketing actifs.", details: { entitlement } });
}

function safeAiContext(input: Record<string, unknown>) {
  const forbidden = /(email|recipient|subscriber|contact|phone|address|secret|credential|token)/i;
  const visit = (value: unknown, depth: number): unknown => {
    if (depth > 4) return undefined;
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => visit(item, depth + 1));
    if (!value || typeof value !== "object") return typeof value === "string" ? value.slice(0, 5_000) : value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !forbidden.test(key)).slice(0, 100).map(([key, nested]) => [key, visit(nested, depth + 1)]));
  };
  return visit(input, 0) as Record<string, unknown>;
}

export class MarketingOperationsService {
  constructor(
    private readonly marketingRepository: IMarketingRepository = repositories.marketing,
    private readonly repository: IMarketingOperationsRepository = config.dataMode === "database" ? new PostgresMarketingOperationsRepository() : new DemoMarketingOperationsRepository(),
  ) {}

  private async context(principal: Principal) {
    const existing = await this.marketingRepository.resolveTenantContext(principal.userId);
    if (existing) return existing;
    const tenantId = await this.marketingRepository.resolveTenantId(principal.userId);
    if (!tenantId) throw new AppError({ code: "FORBIDDEN", message: "Aucun tenant actif n’est associé à ce compte." });
    return this.marketingRepository.provisionTenant(tenantId, principal.userId);
  }

  private async requireEntitlement(principal: Principal, key: "automation" | "advancedAnalytics" | "webhooks" | "ai") {
    const context = await this.context(principal);
    const usage = await this.repository.usage(context.tenantId, context.marketCode);
    if (!usage.entitlements.enabled || !usage.entitlements[key]) entitlementError(`marketing.${key}`);
    return { context, usage };
  }

  async listJourneys(principal: Principal) {
    requirePermission(principal, "marketing.automation.read");
    const { context } = await this.requireEntitlement(principal, "automation");
    return { items: await this.repository.listJourneys(context.tenantId) };
  }

  async createJourney(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.automation.manage");
    const { context } = await this.requireEntitlement(principal, "automation");
    const parsed = marketingJourneyInputSchema.parse(input);
    try { assertAutomationGraph(parsed.definition); } catch (error: any) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "Le parcours contient une boucle ou une référence invalide.", details: { issues: error?.issues ?? [] } });
    }
    const journey = await this.repository.createJourney(context, parsed, principal.userId);
    await this.marketingRepository.addAudit(context.tenantId, principal.userId, "marketing.journey.created", "automation_definition", journey.id, ["name", "definition"]);
    return journey;
  }

  async setJourneyStatus(principal: Principal, id: string, status: MarketingJourney["status"]) {
    requirePermission(principal, "marketing.automation.manage");
    const { context } = await this.requireEntitlement(principal, "automation");
    const journey = (await this.repository.getJourney(context.tenantId, id)) ?? notFound("Parcours marketing introuvable.");
    if (status === "ACTIVE") {
      try { assertAutomationGraph(journey.definition); } catch (error: any) {
        throw new AppError({ code: "VALIDATION_ERROR", message: "Le parcours ne peut pas être activé.", details: { issues: error?.issues ?? [] } });
      }
    }
    const updated = await this.repository.setJourneyStatus(context.tenantId, id, status);
    await this.marketingRepository.addAudit(context.tenantId, principal.userId, `marketing.journey.${status.toLowerCase()}`, "automation_definition", id, ["status"]);
    return updated;
  }

  async emitJourneyEvent(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.automation.manage");
    const { context, usage } = await this.requireEntitlement(principal, "automation");
    const parsed = marketingJourneyEventSchema.parse(input);
    if (usage.automationExecutions >= usage.entitlements.maxMonthlySends * 10) entitlementError("marketing.automation_execution_limit");
    const executions = await this.repository.enqueueJourneyEvent(context.tenantId, {
      ...parsed,
      safeContext: safeAiContext(parsed.safeContext),
    });
    return { accepted: true, executionIds: executions.map((item) => item.id) };
  }

  async listJourneyExecutions(principal: Principal, journeyId?: string) {
    requirePermission(principal, "marketing.automation.read");
    const { context } = await this.requireEntitlement(principal, "automation");
    return { items: await this.repository.listJourneyExecutions(context.tenantId, journeyId) };
  }

  async analytics(principal: Principal, campaignId?: string) {
    requirePermission(principal, "marketing.analytics.read");
    const { context } = await this.requireEntitlement(principal, "advancedAnalytics");
    return this.repository.analytics(context.tenantId, campaignId);
  }

  async recordConversion(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.campaigns.update");
    const { context, usage } = await this.requireEntitlement(principal, "advancedAnalytics");
    if (!usage.entitlements.api) entitlementError("marketing.api");
    const parsed = marketingConversionInputSchema.parse(input);
    const result = await this.repository.recordConversion(context.tenantId, {
      ...parsed,
      safeMetadata: safeAiContext(parsed.safeMetadata),
    });
    if (config.dataMode === "database") {
      await enqueueMarketingWebhookEvent(context.tenantId, "conversion.recorded", `conversion:${parsed.idempotencyKey}`, {
        conversionType: parsed.conversionType,
        campaignRecipientId: parsed.campaignRecipientId,
        profileId: parsed.profileId,
        occurredAt: parsed.occurredAt,
      });
    }
    await this.marketingRepository.addAudit(context.tenantId, principal.userId, "marketing.conversion.recorded", "conversion", undefined, ["conversionType", "occurredAt"]);
    return result;
  }

  async usage(principal: Principal) {
    requirePermission(principal, "marketing.dashboard.read");
    const context = await this.context(principal);
    return this.repository.usage(context.tenantId, context.marketCode);
  }

  async listWebhookSubscriptions(principal: Principal) {
    requirePermission(principal, "marketing.settings.manage");
    const { context } = await this.requireEntitlement(principal, "webhooks");
    return { items: await this.repository.listWebhookSubscriptions(context.tenantId) };
  }

  async createWebhookSubscription(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.settings.manage");
    const { context } = await this.requireEntitlement(principal, "webhooks");
    const parsed = marketingWebhookSubscriptionInputSchema.parse(input);
    await assertSafeProviderUrl(parsed.url);
    const signingSecret = randomBytes(32).toString("base64url");
    const key = Buffer.from(config.providerCredentialEncryptionKeyBase64, "base64");
    if (config.dataMode === "database" && key.length !== 32) throw new AppError({ code: "NETWORK_ERROR", statusCode: 503, message: "Le coffre de secrets webhook est mal configuré." });
    const envelope = config.dataMode === "database" ? encryptProviderCredential(signingSecret, key, config.providerCredentialKeyVersion) : { encryptedSecret: Buffer.alloc(32), iv: Buffer.alloc(12), authTag: Buffer.alloc(16), keyVersion: "demo-v1", credentialHint: `••••${signingSecret.slice(-4)}` };
    const subscription = await this.repository.createWebhookSubscription(context, parsed, { ...envelope, hint: envelope.credentialHint });
    await this.marketingRepository.addAudit(context.tenantId, principal.userId, "marketing.webhook.created", "webhook_subscription", subscription.id, ["url", "eventTypes"]);
    return { subscription, signingSecret };
  }

  async aiAssist(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.campaigns.create");
    const { context } = await this.requireEntitlement(principal, "ai");
    const parsed = marketingAiAssistInputSchema.parse(input);
    const feature = parsed.task.replace("marketing.", "marketing.");
    const connection = await providerConnectionService.resolve({ tenantId: context.tenantId, userId: principal.userId, marketCode: context.marketCode }, { capability: "ai.marketing_drafting", feature });
    const correlationId = randomUUID();
    const started = Date.now();
    try {
      const result = await capabilityGateways.ai.generate({ tenantId: context.tenantId, userId: principal.userId, connectionId: connection.id, providerId: connection.providerId, capability: "ai.marketing_drafting", feature, correlationId, marketCode: context.marketCode, locale: parsed.locale }, { task: parsed.task, instructions: parsed.instructions, safeContext: safeAiContext(parsed.safeContext), outputSchema: { type: "object", additionalProperties: true }, maxOutputTokens: 2_000 });
      await providerConnectionService.recordUsage({ tenantId: context.tenantId, userId: principal.userId, connection, capability: "ai.marketing_drafting", feature, correlationId, status: "SUCCEEDED", inputUnits: result.inputUnits, outputUnits: result.outputUnits, latencyMs: Date.now() - started });
      return { ...result, draftOnly: true as const };
    } catch (error) {
      await providerConnectionService.recordUsage({ tenantId: context.tenantId, userId: principal.userId, connection, capability: "ai.marketing_drafting", feature, correlationId, status: "FAILED", latencyMs: Date.now() - started });
      throw error;
    }
  }
}

export const marketingOperationsService = new MarketingOperationsService();
