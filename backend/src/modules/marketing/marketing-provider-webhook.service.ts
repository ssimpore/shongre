import { createHash, randomUUID } from "node:crypto";
import { capabilityGateways } from "../../integrations/providers/gateways/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { enqueueMarketingWebhookEvent } from "./marketing-webhook-events.js";
import { emitMarketingJourneyEvent } from "./marketing-journey-events.js";

const eventStatus: Record<string, string | undefined> = {
  ACCEPTED: "ACCEPTED",
  DELIVERED: "DELIVERED",
  DEFERRED: "DEFERRED",
  BOUNCED_SOFT: "DEFERRED",
  BOUNCED_HARD: "BOUNCED",
  COMPLAINT: "COMPLAINED",
};

export class MarketingProviderWebhookService {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  async receive(
    connectionId: string,
    body: unknown,
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ) {
    if (Buffer.byteLength(rawBody, "utf8") > 512_000)
      throw new AppError({
        code: "BAD_REQUEST",
        statusCode: 413,
        message: "Webhook trop volumineux.",
      });
    const { data: connection, error } = await this.client
      .from("provider_connections")
      .select("id,tenant_id,provider_id,status")
      .eq("id", connectionId)
      .eq("provider_family", "EMAIL_DELIVERY")
      .maybeSingle();
    if (
      error ||
      !connection ||
      connection.status !== "ACTIVE" ||
      !connection.tenant_id
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Webhook fournisseur introuvable.",
      });
    const { data: workspace, error: workspaceError } = await this.client
      .from("marketing_workspaces")
      .select("market_code,default_locale,settings")
      .eq("tenant_id", connection.tenant_id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (workspaceError || !workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Webhook fournisseur introuvable.",
      });
    const context = {
      tenantId: connection.tenant_id,
      connectionId,
      providerId: connection.provider_id,
      capability: "email.marketing",
      feature: "marketing.provider_webhook",
      correlationId: randomUUID(),
      marketCode: workspace.market_code,
      locale: workspace.default_locale,
    };
    if (!capabilityGateways.emailDelivery.normalizeWebhook)
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message:
          "Ce fournisseur ne prend pas en charge les webhooks normalisés.",
      });
    const events = await capabilityGateways.emailDelivery.normalizeWebhook(
      context,
      { body, rawBody },
      headers,
    );
    const requestId = String(
      headers["x-request-id"] ||
        headers["x-webhook-id"] ||
        createHash("sha256").update(rawBody).digest("hex"),
    );
    const { data: existing } = await this.client
      .from("marketing_provider_webhook_receipts")
      .select("id")
      .eq("provider_connection_id", connectionId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (existing) return { accepted: true, duplicate: true, eventCount: 0 };

    let processed = 0;
    for (const event of events.slice(0, 1_000)) {
      const { data: recipient, error: recipientError } = await this.client
        .from("marketing_campaign_recipients")
        .select("id,tenant_id,profile_id,campaign_id")
        .eq("tenant_id", connection.tenant_id)
        .eq("provider_connection_id", connectionId)
        .eq("provider_message_id", event.externalMessageId)
        .maybeSingle();
      if (recipientError) throw recipientError;
      const { data: automationMessage, error: automationMessageError } =
        recipient
          ? { data: null, error: null }
          : await this.client
              .from("marketing_automation_messages")
              .select("id,tenant_id,profile_id,execution_id")
              .eq("tenant_id", connection.tenant_id)
              .eq("provider_connection_id", connectionId)
              .eq("provider_message_id", event.externalMessageId)
              .maybeSingle();
      if (automationMessageError) throw automationMessageError;
      if (!recipient && !automationMessage) continue;
      const profileId = recipient?.profile_id ?? automationMessage.profile_id;
      if (recipient) {
        const { error: eventError } = await this.client
          .from("marketing_delivery_events")
          .upsert(
            {
              tenant_id: connection.tenant_id,
              recipient_id: recipient.id,
              provider_connection_id: connectionId,
              provider_event_id: event.providerEventId,
              provider_message_id: event.externalMessageId,
              event_type: event.type,
              occurred_at: event.occurredAt,
              safe_reason: event.reason?.slice(0, 500),
              safe_metadata: {},
            },
            {
              onConflict: "provider_connection_id,provider_event_id",
              ignoreDuplicates: true,
            },
          );
        if (eventError) throw eventError;
        if (eventStatus[event.type])
          await this.client
            .from("marketing_campaign_recipients")
            .update({
              send_status: eventStatus[event.type],
              ...(event.type === "DELIVERED"
                ? { delivered_at: event.occurredAt }
                : {}),
            })
            .eq("tenant_id", connection.tenant_id)
            .eq("id", recipient.id);
      } else if (eventStatus[event.type]) {
        const { error: messageError } = await this.client
          .from("marketing_automation_messages")
          .update({
            status: eventStatus[event.type],
            ...(event.type === "DELIVERED"
              ? { delivered_at: event.occurredAt }
              : {}),
          })
          .eq("tenant_id", connection.tenant_id)
          .eq("id", automationMessage.id);
        if (messageError) throw messageError;
      }
      const suppressionReason =
        event.type === "BOUNCED_HARD"
          ? "HARD_BOUNCE"
          : event.type === "COMPLAINT"
            ? "COMPLAINT"
            : event.type === "UNSUBSCRIBED"
              ? "UNSUBSCRIBED"
              : null;
      if (suppressionReason) {
        const { data: profile } = await this.client
          .from("marketing_profiles")
          .select("id,normalized_email,crm_contact_id")
          .eq("tenant_id", connection.tenant_id)
          .eq("id", profileId)
          .maybeSingle();
        if (profile) {
          const profileStatus =
            event.type === "BOUNCED_HARD"
              ? "BOUNCED"
              : event.type === "COMPLAINT"
                ? "COMPLAINED"
                : "UNSUBSCRIBED";
          await this.client
            .from("marketing_profiles")
            .update({
              status: profileStatus,
              ...(profileStatus === "UNSUBSCRIBED"
                ? { unsubscribed_at: event.occurredAt }
                : {}),
            })
            .eq("tenant_id", connection.tenant_id)
            .eq("id", profile.id);
          await this.ensureSuppression(
            connection.tenant_id,
            profile,
            suppressionReason,
            "PROVIDER_WEBHOOK",
            connectionId,
            event.occurredAt,
          );
          await this.recordCrmActivity(
            connection.tenant_id,
            profile.crm_contact_id,
            event.type,
            event.occurredAt,
            connectionId,
            event.externalMessageId,
          );
        }
      } else if (event.type === "BOUNCED_SOFT") {
        const { data: profile } = await this.client
          .from("marketing_profiles")
          .select("id,normalized_email,soft_bounce_count")
          .eq("tenant_id", connection.tenant_id)
          .eq("id", profileId)
          .maybeSingle();
        if (profile) {
          const nextCount = Number(profile.soft_bounce_count || 0) + 1;
          await this.client
            .from("marketing_profiles")
            .update({
              soft_bounce_count: nextCount,
              last_soft_bounce_at: event.occurredAt,
              ...(nextCount >=
              Number(workspace.settings?.softBounceThreshold || 3)
                ? { status: "BOUNCED" }
                : {}),
            })
            .eq("tenant_id", connection.tenant_id)
            .eq("id", profile.id);
          if (nextCount >= Number(workspace.settings?.softBounceThreshold || 3))
            await this.ensureSuppression(
              connection.tenant_id,
              profile,
              "HARD_BOUNCE",
              "SOFT_BOUNCE_THRESHOLD",
              connectionId,
              event.occurredAt,
            );
        }
      } else if (["CLICKED", "OPENED"].includes(event.type)) {
        await this.client
          .from("marketing_profiles")
          .update({ last_engaged_at: event.occurredAt })
          .eq("tenant_id", connection.tenant_id)
          .eq("id", profileId);
        if (event.type === "CLICKED") {
          const { data: profile } = await this.client
            .from("marketing_profiles")
            .select("crm_contact_id")
            .eq("tenant_id", connection.tenant_id)
            .eq("id", profileId)
            .maybeSingle();
          await this.recordCrmActivity(
            connection.tenant_id,
            profile?.crm_contact_id,
            event.type,
            event.occurredAt,
            connectionId,
            event.externalMessageId,
          );
        }
      }
      await enqueueMarketingWebhookEvent(
        connection.tenant_id,
        `email.${event.type.toLowerCase()}`,
        `provider:${connectionId}:${event.providerEventId}`,
        {
          recipientId: recipient?.id,
          executionId: automationMessage?.execution_id,
          profileId,
          campaignId: recipient?.campaign_id,
          eventType: event.type,
          occurredAt: event.occurredAt,
        },
      );
      if (event.type === "CLICKED")
        await emitMarketingJourneyEvent(connection.tenant_id, {
          type: "CAMPAIGN_CLICKED",
          eventId: `provider-click:${connectionId}:${event.providerEventId}`,
          profileId,
          safeContext: { campaignId: recipient?.campaign_id },
        });
      processed += 1;
    }
    const { error: receiptError } = await this.client
      .from("marketing_provider_webhook_receipts")
      .insert({
        tenant_id: connection.tenant_id,
        provider_connection_id: connectionId,
        request_id: requestId,
        payload_sha256: createHash("sha256").update(rawBody).digest("hex"),
        signature_verified: true,
        event_count: processed,
      });
    if (receiptError) throw receiptError;
    return { accepted: true, duplicate: false, eventCount: processed };
  }

  private async ensureSuppression(
    tenantId: string,
    profile: { id: string; normalized_email: string },
    reason: string,
    source: string,
    connectionId: string,
    occurredAt: string,
  ) {
    const { data: existing, error: lookupError } = await this.client
      .from("marketing_suppressions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("normalized_email", profile.normalized_email)
      .eq("reason", reason)
      .is("released_at", null)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return;
    const { error } = await this.client.from("marketing_suppressions").insert({
      tenant_id: tenantId,
      normalized_email: profile.normalized_email,
      profile_id: profile.id,
      reason,
      source,
      provider_connection_id: connectionId,
      occurred_at: occurredAt,
    });
    if (error && !String(error.code || "").includes("23505")) throw error;
  }

  private async recordCrmActivity(
    tenantId: string,
    crmContactId: string | null | undefined,
    type: string,
    occurredAt: string,
    connectionId: string,
    messageId: string,
  ) {
    if (
      !crmContactId ||
      !["CLICKED", "COMPLAINT", "UNSUBSCRIBED", "BOUNCED_HARD"].includes(type)
    )
      return;
    const context = await repositories.crm.getTenantContext(tenantId);
    if (!context) return;
    await repositories.crm.addActivity(context, {
      actorUserId: undefined,
      actorName: "Marketing Shongre",
      entityType: "contact",
      entityId: crmContactId,
      activityType: "EXTERNAL_EVENT",
      title:
        type === "CLICKED"
          ? "Interaction marketing à forte intention"
          : `Événement marketing : ${type}`,
      description: `Événement agrégé Marketing : ${type}.`,
      occurredAt,
      providerConnectionId: connectionId,
      externalMessageId: `marketing:${type}:${messageId}`,
      isAiGenerated: false,
    });
  }
}

export const marketingProviderWebhookService =
  new MarketingProviderWebhookService();
