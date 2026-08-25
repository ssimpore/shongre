import { randomUUID } from "node:crypto";
import type {
  MarketingAnalytics,
  MarketingEntitlements,
  MarketingJourney,
  MarketingJourneyDefinition,
  MarketingJourneyEvent,
  MarketingJourneyExecution,
  MarketingJourneyInput,
  MarketingUsage,
  MarketingConversionInput,
  MarketingWebhookSubscription,
  MarketingWebhookSubscriptionInput,
} from "@shongre/contracts/marketing";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import type { MarketingTenantContext } from "./marketing.repository.js";

export interface MarketingWebhookSecretEnvelope {
  encryptedSecret: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
  hint: string;
}

export interface IMarketingOperationsRepository {
  listJourneys(tenantId: string): Promise<MarketingJourney[]>;
  getJourney(tenantId: string, id: string): Promise<MarketingJourney | null>;
  createJourney(context: MarketingTenantContext, input: MarketingJourneyInput, actorId: string): Promise<MarketingJourney>;
  setJourneyStatus(tenantId: string, id: string, status: MarketingJourney["status"]): Promise<MarketingJourney>;
  enqueueJourneyEvent(tenantId: string, event: MarketingJourneyEvent): Promise<MarketingJourneyExecution[]>;
  listJourneyExecutions(tenantId: string, journeyId?: string): Promise<MarketingJourneyExecution[]>;
  analytics(tenantId: string, campaignId?: string): Promise<MarketingAnalytics>;
  usage(tenantId: string, marketCode: string): Promise<MarketingUsage>;
  listWebhookSubscriptions(tenantId: string): Promise<MarketingWebhookSubscription[]>;
  createWebhookSubscription(context: MarketingTenantContext, input: MarketingWebhookSubscriptionInput, envelope: MarketingWebhookSecretEnvelope): Promise<MarketingWebhookSubscription>;
  recordConversion(tenantId: string, input: MarketingConversionInput): Promise<{ accepted: true; duplicate: boolean }>;
}

const DEMO_NOW = "2026-08-25T12:00:00.000Z";
const DEMO_ENTITLEMENTS: MarketingEntitlements = {
  enabled: true,
  maxContacts: 100_000,
  maxMonthlySends: 1_000_000,
  maxLists: 1_000,
  maxSegments: 1_000,
  maxUsers: 100,
  templates: true,
  automation: true,
  abTesting: true,
  advancedAnalytics: true,
  byoEmail: true,
  platformEmail: false,
  customDomain: true,
  api: true,
  webhooks: true,
  ai: true,
};

const demoDefinition: MarketingJourneyDefinition = {
  trigger: { type: "SUBSCRIBER_CONFIRMED", configuration: {} },
  entryNodeId: "welcome",
  nodes: [
    { id: "welcome", type: "SEND_EMAIL", nextNodeId: "wait", configuration: { templateId: "welcome" } },
    { id: "wait", type: "WAIT", nextNodeId: "end", configuration: { durationMinutes: 1440 } },
    { id: "end", type: "END", configuration: {} },
  ],
  maxExecutionDepth: 50,
};

export class DemoMarketingOperationsRepository implements IMarketingOperationsRepository {
  private journeys: MarketingJourney[] = [{
    id: "18000000-0000-4000-8000-000000000001",
    tenantId: "10000000-0000-4000-8000-000000000001",
    workspaceId: "10000000-0000-4000-8000-000000000101",
    name: "Bienvenue après confirmation",
    description: "Parcours de bienvenue versionné et idempotent.",
    status: "ACTIVE",
    currentVersion: 1,
    definition: demoDefinition,
    createdBy: "10000000-0000-4000-8000-000000000301",
    createdAt: DEMO_NOW,
    updatedAt: DEMO_NOW,
  }];
  private executions: MarketingJourneyExecution[] = [];
  private webhooks: MarketingWebhookSubscription[] = [];

  async listJourneys() { return structuredClone(this.journeys); }
  async getJourney(_tenantId: string, id: string) { return structuredClone(this.journeys.find((item) => item.id === id) ?? null); }
  async createJourney(context: MarketingTenantContext, input: MarketingJourneyInput, actorId: string) {
    const value: MarketingJourney = { id: randomUUID(), tenantId: context.tenantId, workspaceId: context.workspaceId, ...input, status: "DRAFT", currentVersion: 1, createdBy: actorId, createdAt: DEMO_NOW, updatedAt: DEMO_NOW };
    this.journeys.unshift(value);
    return structuredClone(value);
  }
  async setJourneyStatus(_tenantId: string, id: string, status: MarketingJourney["status"]) { const value = this.journeys.find((item) => item.id === id); if (!value) throw new Error("MARKETING_JOURNEY_NOT_FOUND"); value.status = status; value.updatedAt = DEMO_NOW; return structuredClone(value); }
  async enqueueJourneyEvent(tenantId: string, event: MarketingJourneyEvent) {
    const values = this.journeys.filter((journey) => journey.status === "ACTIVE" && journey.definition.trigger.type === event.type).map((journey): MarketingJourneyExecution => ({
      id: randomUUID(), tenantId, workspaceId: journey.workspaceId, journeyId: journey.id, journeyVersion: journey.currentVersion,
      profileId: event.profileId, eventId: event.eventId, status: "QUEUED", currentNodeId: journey.definition.entryNodeId,
      depth: 0, availableAt: DEMO_NOW, createdAt: DEMO_NOW, updatedAt: DEMO_NOW,
    }));
    for (const value of values) if (!this.executions.some((item) => item.journeyId === value.journeyId && item.eventId === value.eventId)) this.executions.unshift(value);
    return structuredClone(values);
  }
  async listJourneyExecutions(_tenantId: string, journeyId?: string) { return structuredClone(this.executions.filter((item) => !journeyId || item.journeyId === journeyId)); }
  async analytics(): Promise<MarketingAnalytics> { return { audienceSize: 4_680, eligibleRecipients: 4_653, attempted: 4_653, accepted: 4_612, delivered: 4_531, deliveryRate: 0.982, softBounces: 42, hardBounces: 8, complaints: 1, unsubscribes: 4, uniqueOpens: 2_104, uniqueClicks: 642, clickThroughRate: 0.142, conversions: 89, conversionRate: 0.0196, openMetricCaveat: "Les ouvertures sont indicatives et peuvent être amplifiées par les protections de confidentialité.", variants: [], calculatedAt: DEMO_NOW }; }
  async usage(): Promise<MarketingUsage> { return { period: "2026-08", activeProfiles: 4_680, attemptedSends: 12_840, campaignCount: 8, automationExecutions: 327, apiRequests: 0, entitlements: structuredClone(DEMO_ENTITLEMENTS) }; }
  async listWebhookSubscriptions() { return structuredClone(this.webhooks); }
  async createWebhookSubscription(context: MarketingTenantContext, input: MarketingWebhookSubscriptionInput, envelope: MarketingWebhookSecretEnvelope) { const value: MarketingWebhookSubscription = { id: randomUUID(), tenantId: context.tenantId, workspaceId: context.workspaceId, url: input.url, eventTypes: input.eventTypes, status: "ACTIVE", signingSecretHint: envelope.hint, createdAt: DEMO_NOW, updatedAt: DEMO_NOW }; this.webhooks.unshift(value); return structuredClone(value); }
  async recordConversion() { return { accepted: true as const, duplicate: false }; }
}

function mapJourney(row: any, definition: MarketingJourneyDefinition): MarketingJourney {
  return { id: row.id, tenantId: row.tenant_id, workspaceId: row.workspace_id ?? undefined, name: row.name, description: row.description ?? undefined, status: row.status, currentVersion: row.current_version, definition, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapExecution(row: any): MarketingJourneyExecution {
  return { id: row.id, tenantId: row.tenant_id, journeyId: row.definition_id, journeyVersion: row.definition_version, profileId: row.subject_type === "MARKETING_PROFILE" ? row.subject_id ?? undefined : undefined, eventId: row.event_id, status: row.status, currentNodeId: row.current_node_id ?? undefined, depth: row.depth, availableAt: row.available_at, lastErrorCode: row.last_error_code ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

function entitlementValue(rows: any[], key: string, fallback: boolean | number) {
  const row = rows.find((item) => item.entitlement_key === key);
  return row ? row.entitlement_value : fallback;
}

export class PostgresMarketingOperationsRepository implements IMarketingOperationsRepository {
  private get client(): any { return getSupabaseAdminClient() as any; }
  private async query<T>(operation: string, request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> { const { data, error } = await request; if (error) return databaseFailure(operation, error); return data as T; }
  private async currentVersion(row: any) { const versions: any[] = await this.query("marketingOperations.version", this.client.from("automation_definition_versions").select("definition").eq("tenant_id", row.tenant_id).eq("definition_id", row.id).eq("version", row.current_version).limit(1)); return versions[0]?.definition as MarketingJourneyDefinition; }
  async listJourneys(tenantId: string) { const rows: any[] = await this.query("marketingOperations.listJourneys", this.client.from("automation_definitions").select("*").eq("tenant_id", tenantId).eq("domain", "MARKETING").order("updated_at", { ascending: false })); return Promise.all(rows.map(async (row) => mapJourney(row, await this.currentVersion(row)))); }
  async getJourney(tenantId: string, id: string) { const rows: any[] = await this.query("marketingOperations.getJourney", this.client.from("automation_definitions").select("*").eq("tenant_id", tenantId).eq("domain", "MARKETING").eq("id", id).limit(1)); return rows[0] ? mapJourney(rows[0], await this.currentVersion(rows[0])) : null; }
  async createJourney(context: MarketingTenantContext, input: MarketingJourneyInput, actorId: string) { const row: any = await this.query("marketingOperations.createJourney", this.client.from("automation_definitions").insert({ tenant_id: context.tenantId, workspace_id: context.workspaceId, domain: "MARKETING", name: input.name, description: input.description ?? null, status: "DRAFT", created_by: actorId }).select("*").single()); await this.query("marketingOperations.createJourneyVersion", this.client.from("automation_definition_versions").insert({ tenant_id: context.tenantId, definition_id: row.id, version: 1, definition: input.definition, created_by: actorId })); return mapJourney(row, input.definition); }
  async setJourneyStatus(tenantId: string, id: string, status: MarketingJourney["status"]) { const row: any = await this.query("marketingOperations.setJourneyStatus", this.client.from("automation_definitions").update({ status }).eq("tenant_id", tenantId).eq("domain", "MARKETING").eq("id", id).select("*").single()); return mapJourney(row, await this.currentVersion(row)); }
  async enqueueJourneyEvent(tenantId: string, event: MarketingJourneyEvent) { const journeys = (await this.listJourneys(tenantId)).filter((item) => item.status === "ACTIVE" && item.definition.trigger.type === event.type); const results: MarketingJourneyExecution[] = []; for (const journey of journeys) { const idempotencyKey = `${journey.id}:${journey.currentVersion}:${event.eventId}`; const row: any = await this.query("marketingOperations.enqueueJourney", this.client.from("automation_executions").upsert({ tenant_id: tenantId, definition_id: journey.id, definition_version: journey.currentVersion, subject_type: event.profileId ? "MARKETING_PROFILE" : "EXTERNAL", subject_id: event.profileId ?? null, event_id: event.eventId, status: "QUEUED", current_node_id: journey.definition.entryNodeId, idempotency_key: idempotencyKey, safe_context: event.safeContext }, { onConflict: "tenant_id,idempotency_key", ignoreDuplicates: false }).select("*").single()); results.push(mapExecution(row)); } return results; }
  async listJourneyExecutions(tenantId: string, journeyId?: string) { let query = this.client.from("automation_executions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100); if (journeyId) query = query.eq("definition_id", journeyId); const rows: any[] = await this.query("marketingOperations.listExecutions", query); return rows.map(mapExecution); }
  async analytics(tenantId: string, campaignId?: string): Promise<MarketingAnalytics> { let recipientsQuery = this.client.from("marketing_campaign_recipients").select("id,variant_id,eligibility_status,send_status").eq("tenant_id", tenantId); if (campaignId) recipientsQuery = recipientsQuery.eq("campaign_id", campaignId); const recipients: any[] = await this.query("marketingOperations.analyticsRecipients", recipientsQuery); const ids = recipients.map((row) => row.id); const events: any[] = ids.length ? await this.query("marketingOperations.analyticsEvents", this.client.from("marketing_delivery_events").select("recipient_id,event_type").eq("tenant_id", tenantId).in("recipient_id", ids)) : []; const conversions: any[] = ids.length ? await this.query("marketingOperations.analyticsConversions", this.client.from("marketing_conversions").select("recipient_id").eq("tenant_id", tenantId).in("recipient_id", ids)) : []; const eventIds = (type: string) => new Set(events.filter((row) => row.event_type === type).map((row) => row.recipient_id)); const eligible = recipients.filter((row) => row.eligibility_status === "ELIGIBLE").length; const attempted = recipients.filter((row) => row.send_status !== "PENDING" && row.send_status !== "CANCELLED").length; const accepted = new Set([...eventIds("ACCEPTED"), ...eventIds("DELIVERED")]).size; const delivered = eventIds("DELIVERED").size; const uniqueOpens = eventIds("OPENED").size; const uniqueClicks = eventIds("CLICKED").size; const conversionIds = new Set(conversions.map((row) => row.recipient_id)); const variants = [...new Set(recipients.map((row) => String(row.variant_id)))].map((variantId) => { const variantRecipientIds = new Set(recipients.filter((row) => row.variant_id === variantId).map((row) => row.id)); const count = (set: Set<string>) => [...set].filter((id) => variantRecipientIds.has(id)).length; const variantAttempted = recipients.filter((row) => row.variant_id === variantId && !["PENDING", "CANCELLED"].includes(row.send_status)).length; const variantDelivered = count(eventIds("DELIVERED")); const clicks = count(eventIds("CLICKED")); const converted = count(conversionIds); return { variantId, attempted: variantAttempted, accepted: count(new Set([...eventIds("ACCEPTED"), ...eventIds("DELIVERED")])), delivered: variantDelivered, uniqueOpens: count(eventIds("OPENED")), uniqueClicks: clicks, conversions: converted, clickThroughRate: variantDelivered ? clicks / variantDelivered : 0, conversionRate: variantDelivered ? converted / variantDelivered : 0 }; }); return { audienceSize: recipients.length, eligibleRecipients: eligible, attempted, accepted, delivered, deliveryRate: accepted ? delivered / accepted : 0, softBounces: eventIds("BOUNCED_SOFT").size, hardBounces: eventIds("BOUNCED_HARD").size, complaints: eventIds("COMPLAINT").size, unsubscribes: eventIds("UNSUBSCRIBED").size, uniqueOpens, uniqueClicks, clickThroughRate: delivered ? uniqueClicks / delivered : 0, conversions: conversionIds.size, conversionRate: delivered ? conversionIds.size / delivered : 0, openMetricCaveat: "Les ouvertures sont indicatives et peuvent être amplifiées par les protections de confidentialité.", variants, calculatedAt: new Date().toISOString() }; }
  async usage(tenantId: string, marketCode: string): Promise<MarketingUsage> { const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); const [orgRows, profiles, recipients, campaigns, executions] = await Promise.all([this.query<any[]>("marketingOperations.orgOwner", this.client.from("organizations").select("owner_id").eq("id", tenantId).limit(1)), this.query<any[]>("marketingOperations.usageProfiles", this.client.from("marketing_profiles").select("id").eq("tenant_id", tenantId).eq("status", "SUBSCRIBED")), this.query<any[]>("marketingOperations.usageRecipients", this.client.from("marketing_campaign_recipients").select("id").eq("tenant_id", tenantId).gte("created_at", start.toISOString()).neq("send_status", "PENDING")), this.query<any[]>("marketingOperations.usageCampaigns", this.client.from("marketing_campaigns").select("id").eq("tenant_id", tenantId).gte("created_at", start.toISOString())), this.query<any[]>("marketingOperations.usageAutomations", this.client.from("automation_executions").select("id").eq("tenant_id", tenantId).gte("created_at", start.toISOString()))]); const ownerId = orgRows[0]?.owner_id; const entitlements: any[] = ownerId ? await this.query("marketingOperations.entitlements", this.client.from("monetization_entitlements").select("entitlement_key,entitlement_value").eq("account_id", ownerId).eq("status", "active").like("entitlement_key", "marketing.%")) : []; const resolved: MarketingEntitlements = { enabled: Boolean(entitlementValue(entitlements, "marketing.enabled", true)), maxContacts: Number(entitlementValue(entitlements, "marketing.max_contacts", 100_000)), maxMonthlySends: Number(entitlementValue(entitlements, "marketing.max_monthly_sends", 1_000_000)), maxLists: Number(entitlementValue(entitlements, "marketing.max_lists", 1_000)), maxSegments: Number(entitlementValue(entitlements, "marketing.max_segments", 1_000)), maxUsers: Number(entitlementValue(entitlements, "marketing.max_users", 100)), templates: Boolean(entitlementValue(entitlements, "marketing.templates", true)), automation: Boolean(entitlementValue(entitlements, "marketing.automation", true)), abTesting: Boolean(entitlementValue(entitlements, "marketing.ab_testing", true)), advancedAnalytics: Boolean(entitlementValue(entitlements, "marketing.advanced_analytics", true)), byoEmail: Boolean(entitlementValue(entitlements, "marketing.byop_email", true)), platformEmail: Boolean(entitlementValue(entitlements, "marketing.platform_email", false)), customDomain: Boolean(entitlementValue(entitlements, "marketing.custom_domain", true)), api: Boolean(entitlementValue(entitlements, "marketing.api", true)), webhooks: Boolean(entitlementValue(entitlements, "marketing.webhooks", true)), ai: Boolean(entitlementValue(entitlements, "marketing.ai", true)) }; return { period: start.toISOString().slice(0, 7), activeProfiles: profiles.length, attemptedSends: recipients.length, campaignCount: campaigns.length, automationExecutions: executions.length, apiRequests: 0, entitlements: resolved }; }
  async listWebhookSubscriptions(tenantId: string) { const rows: any[] = await this.query("marketingOperations.listWebhooks", this.client.from("marketing_webhook_subscriptions").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false })); return rows.map((row) => ({ id: row.id, tenantId: row.tenant_id, workspaceId: row.workspace_id, url: row.url, eventTypes: row.event_types, status: row.status, signingSecretHint: row.signing_secret_hint, lastDeliveredAt: row.last_delivered_at ?? undefined, lastFailureAt: row.last_failure_at ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at })); }
  async createWebhookSubscription(context: MarketingTenantContext, input: MarketingWebhookSubscriptionInput, envelope: MarketingWebhookSecretEnvelope) { const row: any = await this.query("marketingOperations.createWebhook", this.client.from("marketing_webhook_subscriptions").insert({ tenant_id: context.tenantId, workspace_id: context.workspaceId, url: input.url, event_types: input.eventTypes, signing_secret_ciphertext: `\\x${envelope.encryptedSecret.toString("hex")}`, signing_secret_iv: `\\x${envelope.iv.toString("hex")}`, signing_secret_tag: `\\x${envelope.authTag.toString("hex")}`, signing_secret_hint: envelope.hint, key_version: envelope.keyVersion }).select("*").single()); return { id: row.id, tenantId: row.tenant_id, workspaceId: row.workspace_id, url: row.url, eventTypes: row.event_types, status: row.status, signingSecretHint: row.signing_secret_hint, createdAt: row.created_at, updatedAt: row.updated_at }; }
  async recordConversion(tenantId: string, input: MarketingConversionInput) { const rows: any[] = await this.query("marketingOperations.recordConversion", this.client.from("marketing_conversions").upsert({ tenant_id: tenantId, recipient_id: input.campaignRecipientId ?? null, profile_id: input.profileId ?? null, conversion_type: input.conversionType, external_subject_id: input.externalSubjectId ?? null, amount_minor: input.amountMinor ?? null, currency: input.currency ?? null, idempotency_key: input.idempotencyKey, safe_metadata: input.safeMetadata, occurred_at: input.occurredAt }, { onConflict: "tenant_id,idempotency_key", ignoreDuplicates: true }).select("id")); return { accepted: true as const, duplicate: rows.length === 0 }; }
}
