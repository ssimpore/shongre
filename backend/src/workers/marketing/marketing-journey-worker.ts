import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { MarketingJourneyDefinition, MarketingJourneyNode } from "@shongre/contracts/marketing";
import type { AiGenerationRequest } from "@shongre/contracts/provider-gateways";
import { config } from "../../app/config/index.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { capabilityGateways } from "../../integrations/providers/gateways/index.js";
import { enqueueMarketingWebhookEvent } from "../../modules/marketing/marketing-webhook-events.js";
import { providerConnectionService } from "../../modules/providers/provider-connection.service.js";
import { PostgresMarketingOperationsRepository } from "../../infrastructure/database/repositories/marketing-operations.repository.js";

interface ExecutionRow {
  id: string;
  tenant_id: string;
  definition_id: string;
  definition_version: number;
  subject_id: string | null;
  status: string;
  current_node_id: string | null;
  depth: number;
  attempt_count: number;
  max_attempts: number;
  safe_context: Record<string, unknown>;
}

interface ExecutionResult {
  nextNodeId?: string;
  waitUntil?: string;
  completed?: boolean;
  safeResult?: Record<string, unknown>;
}

function text(value: unknown, maximum = 5_000): string {
  return String(value ?? "").slice(0, maximum);
}

function configurationNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function interpolate(value: string, profile: any, links: { unsubscribeUrl: string; preferencesUrl: string }) {
  const variables: Record<string, string> = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    unsubscribe_url: links.unsubscribeUrl,
    preferences_url: links.preferencesUrl,
    account_name: String(profile.custom_values?.accountName ?? ""),
    company_name: String(profile.custom_values?.companyName ?? ""),
  };
  for (const [key, customValue] of Object.entries(profile.custom_values ?? {})) {
    if (/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(key) && ["string", "number", "boolean"].includes(typeof customValue)) variables[key] = String(customValue);
  }
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_match, key, fallback) => variables[key] || fallback?.trim() || "");
}

function templateText(content: any) {
  return (content?.plainText || (content?.blocks ?? []).map((block: any) => {
    if (["HEADING", "PARAGRAPH", "FOOTER"].includes(block.type)) return block.text ?? "";
    if (block.type === "BUTTON") return `${block.label}: ${block.href}`;
    if (block.type === "UNSUBSCRIBE") return block.text ?? "Se désabonner : {{ unsubscribe_url }}";
    if (block.type === "PREFERENCE_CENTER") return block.text ?? "Gérer mes préférences : {{ preferences_url }}";
    return "";
  }).filter(Boolean).join("\n\n"));
}

function resolveConditionValue(field: string, profile: any, safeContext: Record<string, unknown>) {
  if (field.startsWith("context.")) return safeContext[field.slice(8)];
  if (field.startsWith("customValues.")) return profile?.custom_values?.[field.slice(13)];
  const allowed: Record<string, string> = {
    status: "status", locale: "locale", country: "country", source: "source",
    topics: "topics", lastEngagedAt: "last_engaged_at",
  };
  return allowed[field] ? profile?.[allowed[field]] : undefined;
}

function conditionMatches(node: MarketingJourneyNode, profile: any, safeContext: Record<string, unknown>) {
  const actual = resolveConditionValue(text(node.configuration.field, 120), profile, safeContext);
  const expected = node.configuration.value;
  switch (text(node.configuration.operator, 40).toUpperCase()) {
    case "EQUALS": return actual === expected;
    case "NOT_EQUALS": return actual !== expected;
    case "CONTAINS": return Array.isArray(actual) ? actual.includes(expected) : text(actual).includes(text(expected));
    case "IN": return Array.isArray(expected) && expected.includes(actual);
    case "EXISTS": return actual !== undefined && actual !== null && actual !== "";
    case "GREATER_THAN": return Number(actual) > Number(expected);
    case "LESS_THAN": return Number(actual) < Number(expected);
    case "BEFORE": return new Date(text(actual)).getTime() < new Date(text(expected)).getTime();
    case "AFTER": return new Date(text(actual)).getTime() > new Date(text(expected)).getTime();
    default: return false;
  }
}

export class MarketingJourneyWorker {
  private get client(): any { return getSupabaseAdminClient() as any; }
  private readonly operations = new PostgresMarketingOperationsRepository();

  async run(): Promise<{ processed: number; completed: number }> {
    if (config.dataMode === "demo") return { processed: 0, completed: 0 };
    const { data, error } = await this.client.rpc("claim_automation_execution");
    if (error) throw error;
    const execution = (data?.[0] ?? null) as ExecutionRow | null;
    if (!execution) return { processed: 0, completed: 0 };
    try {
      const completed = await this.process(execution);
      return { processed: 1, completed: completed ? 1 : 0 };
    } catch (error: any) {
      const terminal = execution.attempt_count >= execution.max_attempts;
      const delaySeconds = Math.min(3_600, 15 * 2 ** Math.max(0, execution.attempt_count - 1));
      await this.client.from("automation_executions").update({
        status: "FAILED",
        available_at: new Date(Date.now() + delaySeconds * 1_000).toISOString(),
        last_error_code: text(error?.code || error?.message || "AUTOMATION_STEP_FAILED", 120),
        completed_at: terminal ? new Date().toISOString() : null,
      }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
      logger.warn("marketing_journey_execution_failed", {
        executionId: execution.id,
        nodeId: execution.current_node_id,
        attemptCount: execution.attempt_count,
        terminal,
        error: text(error?.message || error, 300),
      });
      return { processed: 1, completed: 0 };
    }
  }

  private async process(execution: ExecutionRow): Promise<boolean> {
    const { data: entitlementWorkspace, error: entitlementWorkspaceError } = await this.client.from("marketing_workspaces").select("market_code").eq("tenant_id", execution.tenant_id).order("created_at").limit(1).single();
    if (entitlementWorkspaceError) throw entitlementWorkspaceError;
    const usage = await this.operations.usage(execution.tenant_id, entitlementWorkspace.market_code);
    if (!usage.entitlements.enabled || !usage.entitlements.automation) {
      await this.client.from("automation_executions").update({ status: "STOPPED", last_error_code: "MARKETING_AUTOMATION_NOT_ENTITLED", completed_at: new Date().toISOString() }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
      return false;
    }
    const { data: version, error } = await this.client
      .from("automation_definition_versions")
      .select("definition")
      .eq("tenant_id", execution.tenant_id)
      .eq("definition_id", execution.definition_id)
      .eq("version", execution.definition_version)
      .single();
    if (error) throw error;
    const definition = version.definition as MarketingJourneyDefinition;
    let nodeId = execution.current_node_id ?? definition.entryNodeId;
    let depth = execution.depth;

    // Process short straight-line runs in one claim; waits and external calls
    // still yield through persisted state so restarts remain harmless.
    for (let localSteps = 0; localSteps < 20; localSteps += 1) {
      if (depth >= definition.maxExecutionDepth) throw new Error("AUTOMATION_MAX_DEPTH_REACHED");
      const node = definition.nodes.find((item) => item.id === nodeId);
      if (!node) throw new Error("AUTOMATION_NODE_NOT_FOUND");
      await this.step(execution, node, "STARTED", {});
      try {
        const result = await this.executeNode(execution, node);
        const nextDepth = depth + 1;
        if (result.completed || node.type === "END") {
          await this.step(execution, node, "COMPLETED", result.safeResult ?? {});
          const { error: completeError } = await this.client.from("automation_executions").update({
            status: "COMPLETED", current_node_id: null, depth: nextDepth,
            completed_at: new Date().toISOString(), last_error_code: null,
          }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
          if (completeError) throw completeError;
          return true;
        }
        if (!result.nextNodeId) throw new Error("AUTOMATION_NEXT_NODE_REQUIRED");
        if (result.waitUntil) {
          await this.step(execution, node, "WAITING", result.safeResult ?? {});
          const { error: waitError } = await this.client.from("automation_executions").update({
            status: "WAITING", current_node_id: result.nextNodeId, depth: nextDepth,
            available_at: result.waitUntil, last_error_code: null,
          }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
          if (waitError) throw waitError;
          return false;
        }
        await this.step(execution, node, "COMPLETED", result.safeResult ?? {});
        const { error: updateError } = await this.client.from("automation_executions").update({
          status: "RUNNING", current_node_id: result.nextNodeId, depth: nextDepth,
          last_error_code: null,
        }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
        if (updateError) throw updateError;
        nodeId = result.nextNodeId;
        depth = nextDepth;
      } catch (error: any) {
        await this.step(execution, node, "FAILED", {}, text(error?.code || error?.message || "AUTOMATION_STEP_FAILED", 120));
        throw error;
      }
    }
    await this.client.from("automation_executions").update({
      status: "QUEUED", current_node_id: nodeId, depth, available_at: new Date().toISOString(),
    }).eq("tenant_id", execution.tenant_id).eq("id", execution.id);
    return false;
  }

  private async executeNode(execution: ExecutionRow, node: MarketingJourneyNode): Promise<ExecutionResult> {
    const profile = execution.subject_id ? await this.profile(execution.tenant_id, execution.subject_id) : null;
    switch (node.type) {
      case "END": return { completed: true };
      case "WAIT": {
        const minutes = configurationNumber(node.configuration.durationMinutes, 60, 1, 525_600);
        return { nextNodeId: node.nextNodeId, waitUntil: new Date(Date.now() + minutes * 60_000).toISOString(), safeResult: { durationMinutes: minutes } };
      }
      case "CONDITION":
      case "BRANCH": {
        const matched = conditionMatches(node, profile, execution.safe_context);
        return { nextNodeId: matched ? node.nextNodeId : node.alternateNodeId, safeResult: { matched } };
      }
      case "SEND_EMAIL": return this.sendEmail(execution, node, profile);
      case "ADD_TO_LIST": {
        this.requireProfile(profile);
        const listId = text(node.configuration.listId, 80);
        const { error } = await this.client.from("marketing_list_memberships").upsert({ tenant_id: execution.tenant_id, list_id: listId, profile_id: profile.id, source: "AUTOMATION" }, { onConflict: "list_id,profile_id", ignoreDuplicates: true });
        if (error) throw error;
        return { nextNodeId: node.nextNodeId, safeResult: { listId } };
      }
      case "REMOVE_FROM_LIST": {
        this.requireProfile(profile);
        const listId = text(node.configuration.listId, 80);
        const { error } = await this.client.from("marketing_list_memberships").delete().eq("tenant_id", execution.tenant_id).eq("list_id", listId).eq("profile_id", profile.id);
        if (error) throw error;
        return { nextNodeId: node.nextNodeId, safeResult: { listId } };
      }
      case "ADD_TAG":
      case "REMOVE_TAG": {
        this.requireProfile(profile);
        const tag = text(node.configuration.tag, 80).trim();
        if (!tag) throw new Error("AUTOMATION_TAG_REQUIRED");
        const topics = new Set<string>(profile.topics ?? []);
        node.type === "ADD_TAG" ? topics.add(tag) : topics.delete(tag);
        const { error } = await this.client.from("marketing_profiles").update({ topics: [...topics] }).eq("tenant_id", execution.tenant_id).eq("id", profile.id);
        if (error) throw error;
        return { nextNodeId: node.nextNodeId, safeResult: { tag } };
      }
      case "UPDATE_FIELD": {
        this.requireProfile(profile);
        const field = text(node.configuration.field, 120);
        if (!field.startsWith("customValues.")) throw new Error("AUTOMATION_FIELD_NOT_ALLOWED");
        const key = field.slice(13);
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(key)) throw new Error("AUTOMATION_FIELD_NOT_ALLOWED");
        const customValues = { ...(profile.custom_values ?? {}), [key]: node.configuration.value };
        const { error } = await this.client.from("marketing_profiles").update({ custom_values: customValues }).eq("tenant_id", execution.tenant_id).eq("id", profile.id);
        if (error) throw error;
        return { nextNodeId: node.nextNodeId, safeResult: { field } };
      }
      case "CREATE_CRM_TASK": return this.createCrmTask(execution, node, profile);
      case "RECORD_CRM_ACTIVITY": return this.recordCrmActivity(execution, node, profile);
      case "CALL_WEBHOOK": {
        const eventType = text(node.configuration.eventType || "journey.action", 120);
        if (!/^[a-z][a-z0-9_.-]{1,119}$/.test(eventType)) throw new Error("AUTOMATION_WEBHOOK_EVENT_INVALID");
        await enqueueMarketingWebhookEvent(execution.tenant_id, eventType, `journey:${execution.id}:${node.id}`, {
          executionId: execution.id, journeyId: execution.definition_id, profileId: execution.subject_id,
          nodeId: node.id,
        });
        return { nextNodeId: node.nextNodeId, safeResult: { eventType } };
      }
      case "RUN_AI": return this.runAi(execution, node);
    }
  }

  private async sendEmail(execution: ExecutionRow, node: MarketingJourneyNode, profile: any): Promise<ExecutionResult> {
    this.requireProfile(profile);
    if (profile.status !== "SUBSCRIBED" || profile.custom_values?.doNotContact === true) throw new Error("AUTOMATION_PROFILE_NOT_ELIGIBLE");
    const [{ data: suppression, error: suppressionError }, { data: workspace, error: workspaceError }] = await Promise.all([
      this.client.from("marketing_suppressions").select("id").eq("tenant_id", execution.tenant_id).eq("normalized_email", profile.normalized_email).is("released_at", null).limit(1).maybeSingle(),
      this.client.from("marketing_workspaces").select("*").eq("tenant_id", execution.tenant_id).eq("id", profile.workspace_id).single(),
    ]);
    if (suppressionError) throw suppressionError;
    if (workspaceError) throw workspaceError;
    if (suppression) throw new Error("AUTOMATION_PROFILE_SUPPRESSED");
    const sinceDay = new Date(Date.now() - 86_400_000).toISOString();
    const sinceWeek = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [campaignDay, campaignWeek, automationDay, automationWeek] = await Promise.all([
      this.countCampaignSends(execution.tenant_id, profile.id, sinceDay),
      this.countCampaignSends(execution.tenant_id, profile.id, sinceWeek),
      this.countAutomationSends(execution.tenant_id, profile.id, sinceDay),
      this.countAutomationSends(execution.tenant_id, profile.id, sinceWeek),
    ]);
    if (campaignDay + automationDay >= Number(workspace.frequency_cap_day || 3) || campaignWeek + automationWeek >= Number(workspace.frequency_cap_week || 7)) throw new Error("AUTOMATION_FREQUENCY_CAP");
    const templateId = text(node.configuration.templateId, 80);
    const senderId = text(node.configuration.senderIdentityId, 80);
    const [{ data: template, error: templateError }, senderResult] = await Promise.all([
      this.client.from("marketing_templates").select("id,current_version,status").eq("tenant_id", execution.tenant_id).eq("id", templateId).maybeSingle(),
      senderId
        ? this.client.from("marketing_sender_identities").select("*").eq("tenant_id", execution.tenant_id).eq("id", senderId).maybeSingle()
        : this.client.from("marketing_sender_identities").select("*").eq("tenant_id", execution.tenant_id).eq("status", "VERIFIED").order("created_at").limit(1).maybeSingle(),
    ]);
    if (templateError) throw templateError;
    if (senderResult.error) throw senderResult.error;
    if (!template || template.status !== "ACTIVE") throw new Error("AUTOMATION_TEMPLATE_NOT_AVAILABLE");
    if (!senderResult.data || senderResult.data.status !== "VERIFIED") throw new Error("AUTOMATION_SENDER_NOT_VERIFIED");
    const { data: templateVersion, error: templateVersionError } = await this.client.from("marketing_template_versions").select("subject,content").eq("tenant_id", execution.tenant_id).eq("template_id", template.id).eq("version", template.current_version).single();
    if (templateVersionError) throw templateVersionError;
    const idempotencyKey = createHash("sha256").update(`${execution.id}:${node.id}:${execution.definition_version}`).digest("hex");
    const { data: existing, error: existingError } = await this.client.from("marketing_automation_messages").select("id").eq("tenant_id", execution.tenant_id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { nextNodeId: node.nextNodeId, safeResult: { alreadyDelivered: true } };
    const unsubscribeToken = randomBytes(32).toString("base64url");
    const preferencesToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 180 * 86_400_000).toISOString();
    const { error: tokenError } = await this.client.from("marketing_action_tokens").insert([
      { tenant_id: execution.tenant_id, profile_id: profile.id, purpose: "UNSUBSCRIBE", token_hash: createHash("sha256").update(unsubscribeToken).digest("hex"), expires_at: expiresAt },
      { tenant_id: execution.tenant_id, profile_id: profile.id, purpose: "PREFERENCES", token_hash: createHash("sha256").update(preferencesToken).digest("hex"), expires_at: expiresAt },
    ]);
    if (tokenError) throw tokenError;
    const frontendUrl = config.frontendUrl.replace(/\/$/, "");
    const links = {
      unsubscribeUrl: `${frontendUrl}/newsletter/desabonnement?token=${encodeURIComponent(unsubscribeToken)}`,
      preferencesUrl: `${frontendUrl}/newsletter/preferences?token=${encodeURIComponent(preferencesToken)}`,
    };
    const connection = await providerConnectionService.resolve({ tenantId: execution.tenant_id, marketCode: workspace.market_code }, { capability: "email.marketing", explicitConnectionId: senderResult.data.provider_connection_id, feature: "marketing.journey_send" });
    const correlationId = randomUUID();
    const started = Date.now();
    try {
      const body = `${interpolate(templateText(templateVersion.content), profile, links)}\n\nSe désabonner : ${links.unsubscribeUrl}\nGérer mes préférences : ${links.preferencesUrl}`;
      const result = await capabilityGateways.emailDelivery.send({ tenantId: execution.tenant_id, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.journey_send", correlationId, marketCode: workspace.market_code, locale: profile.locale }, { to: [profile.email], from: { email: senderResult.data.email, name: senderResult.data.display_name }, replyTo: senderResult.data.reply_to ?? undefined, subject: interpolate(templateVersion.subject, profile, links), textBody: body, purpose: "MARKETING", headers: { "List-Unsubscribe": `<${links.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, idempotencyKey });
      await providerConnectionService.recordUsage({ tenantId: execution.tenant_id, connection, capability: "email.marketing", feature: "marketing.journey_send", correlationId, status: "SUCCEEDED", outputUnits: 1, latencyMs: Date.now() - started });
      const { error: messageError } = await this.client.from("marketing_automation_messages").insert({ tenant_id: execution.tenant_id, execution_id: execution.id, profile_id: profile.id, provider_connection_id: connection.id, provider_message_id: result.externalMessageId, idempotency_key: idempotencyKey, status: "ACCEPTED", accepted_at: result.acceptedAt });
      if (messageError) throw messageError;
      await enqueueMarketingWebhookEvent(execution.tenant_id, "email.accepted", `journey-accepted:${connection.id}:${result.externalMessageId}`, { executionId: execution.id, profileId: profile.id, eventType: "ACCEPTED", occurredAt: result.acceptedAt });
      return { nextNodeId: node.nextNodeId, safeResult: { providerConnectionId: connection.id, acceptedAt: result.acceptedAt } };
    } catch (error) {
      await providerConnectionService.recordUsage({ tenantId: execution.tenant_id, connection, capability: "email.marketing", feature: "marketing.journey_send", correlationId, status: "FAILED", latencyMs: Date.now() - started });
      throw error;
    }
  }

  private async createCrmTask(execution: ExecutionRow, node: MarketingJourneyNode, profile: any): Promise<ExecutionResult> {
    this.requireProfile(profile);
    if (!profile.crm_contact_id) throw new Error("AUTOMATION_CRM_CONTACT_REQUIRED");
    const context = await repositories.crm.getTenantContext(execution.tenant_id);
    if (!context) throw new Error("AUTOMATION_CRM_WORKSPACE_REQUIRED");
    const dueMinutes = configurationNumber(node.configuration.dueInMinutes, 1_440, 1, 525_600);
    const task = await repositories.crm.createTask(context, {
      ownerId: typeof node.configuration.ownerId === "string" ? node.configuration.ownerId : undefined,
      contactId: profile.crm_contact_id,
      type: text(node.configuration.taskType || "follow_up", 80),
      title: text(node.configuration.title || "Suivi marketing", 255),
      description: text(node.configuration.description, 5_000) || undefined,
      priority: ["low", "medium", "high", "urgent"].includes(text(node.configuration.priority)) ? node.configuration.priority as any : "medium",
      dueAt: new Date(Date.now() + dueMinutes * 60_000).toISOString(),
    });
    return { nextNodeId: node.nextNodeId, safeResult: { taskId: task.id } };
  }

  private async recordCrmActivity(execution: ExecutionRow, node: MarketingJourneyNode, profile: any): Promise<ExecutionResult> {
    this.requireProfile(profile);
    if (!profile.crm_contact_id) throw new Error("AUTOMATION_CRM_CONTACT_REQUIRED");
    const context = await repositories.crm.getTenantContext(execution.tenant_id);
    if (!context) throw new Error("AUTOMATION_CRM_WORKSPACE_REQUIRED");
    const activity = await repositories.crm.addActivity(context, {
      actorName: "Automatisation Marketing",
      entityType: "contact", entityId: profile.crm_contact_id,
      activityType: "EXTERNAL_EVENT",
      title: text(node.configuration.title || "Activité du parcours marketing", 255),
      description: text(node.configuration.description, 10_000) || undefined,
      occurredAt: new Date().toISOString(),
      externalMessageId: `marketing-journey:${execution.id}:${node.id}`,
      isAiGenerated: false,
    });
    return { nextNodeId: node.nextNodeId, safeResult: { activityId: activity.id } };
  }

  private async runAi(execution: ExecutionRow, node: MarketingJourneyNode): Promise<ExecutionResult> {
    const { data: definition, error } = await this.client.from("automation_definitions").select("created_by").eq("tenant_id", execution.tenant_id).eq("id", execution.definition_id).single();
    if (error) throw error;
    const { data: workspace, error: workspaceError } = await this.client.from("marketing_workspaces").select("market_code,default_locale").eq("tenant_id", execution.tenant_id).order("created_at").limit(1).single();
    if (workspaceError) throw workspaceError;
    const usage = await this.operations.usage(execution.tenant_id, workspace.market_code);
    if (!usage.entitlements.ai) throw new Error("MARKETING_AI_NOT_ENTITLED");
    const requestedTask = text(node.configuration.task, 120);
    const allowedTasks: AiGenerationRequest["task"][] = [
      "marketing.campaign_draft", "marketing.subject_generation", "marketing.preview_generation",
      "marketing.content_rewrite", "marketing.ab_generation", "marketing.translation",
      "marketing.performance_analysis", "marketing.segment_suggestion",
    ];
    const task: AiGenerationRequest["task"] = allowedTasks.includes(requestedTask as AiGenerationRequest["task"])
      ? requestedTask as AiGenerationRequest["task"]
      : "marketing.content_rewrite";
    const connection = await providerConnectionService.resolve({ tenantId: execution.tenant_id, userId: definition.created_by, marketCode: workspace.market_code }, { capability: "ai.marketing_drafting", feature: task });
    const correlationId = randomUUID();
    const started = Date.now();
    try {
      const result = await capabilityGateways.ai.generate({ tenantId: execution.tenant_id, userId: definition.created_by, connectionId: connection.id, providerId: connection.providerId, capability: "ai.marketing_drafting", feature: task, correlationId, marketCode: workspace.market_code, locale: workspace.default_locale }, { task, instructions: text(node.configuration.instructions || "Produce a concise advisory recommendation.", 5_000), safeContext: execution.safe_context, outputSchema: { type: "object", additionalProperties: true }, maxOutputTokens: configurationNumber(node.configuration.maxOutputTokens, 1_000, 100, 2_000) });
      await providerConnectionService.recordUsage({ tenantId: execution.tenant_id, userId: definition.created_by, connection, capability: "ai.marketing_drafting", feature: task, correlationId, status: "SUCCEEDED", inputUnits: result.inputUnits, outputUnits: result.outputUnits, latencyMs: Date.now() - started });
      return { nextNodeId: node.nextNodeId, safeResult: { model: result.model, providerRequestId: result.providerRequestId, draftOnly: true } };
    } catch (error) {
      await providerConnectionService.recordUsage({ tenantId: execution.tenant_id, userId: definition.created_by, connection, capability: "ai.marketing_drafting", feature: task, correlationId, status: "FAILED", latencyMs: Date.now() - started });
      throw error;
    }
  }

  private async profile(tenantId: string, profileId: string) {
    const { data, error } = await this.client.from("marketing_profiles").select("*").eq("tenant_id", tenantId).eq("id", profileId).maybeSingle();
    if (error) throw error;
    return data;
  }

  private requireProfile(profile: any): asserts profile {
    if (!profile) throw new Error("AUTOMATION_PROFILE_REQUIRED");
  }

  private async countCampaignSends(tenantId: string, profileId: string, since: string) {
    const { count, error } = await this.client.from("marketing_campaign_recipients").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("profile_id", profileId).gte("created_at", since).in("send_status", ["ACCEPTED", "DELIVERED"]);
    if (error) throw error;
    return count ?? 0;
  }

  private async countAutomationSends(tenantId: string, profileId: string, since: string) {
    const { count, error } = await this.client.from("marketing_automation_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("profile_id", profileId).gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
  }

  private async step(execution: ExecutionRow, node: MarketingJourneyNode, status: "STARTED" | "COMPLETED" | "WAITING" | "FAILED", safeResult: Record<string, unknown>, errorCode?: string) {
    const { error } = await this.client.from("automation_execution_steps").upsert({
      tenant_id: execution.tenant_id, execution_id: execution.id, node_id: node.id,
      node_type: node.type, status, attempt: execution.attempt_count,
      safe_result: safeResult, error_code: errorCode ?? null,
    }, { onConflict: "execution_id,node_id,attempt,status", ignoreDuplicates: true });
    if (error) throw error;
  }
}

export const marketingJourneyWorker = new MarketingJourneyWorker();
