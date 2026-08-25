import { createHash } from "node:crypto";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { enqueueMarketingWebhookEvent } from "./marketing-webhook-events.js";
import { emitMarketingJourneyEvent } from "./marketing-journey-events.js";
import { logger } from "../../infrastructure/logging/logger.js";

export class MarketingTrackingService {
  private get client(): any { return getSupabaseAdminClient() as any; }

  async record(token: string, kind: "OPEN" | "CLICK") {
    if (config.dataMode === "demo") throw new AppError({ code: "NOT_FOUND", message: "Lien de suivi introuvable." });
    if (!/^[A-Za-z0-9_-]{32,512}$/.test(token)) throw new AppError({ code: "NOT_FOUND", message: "Lien de suivi introuvable." });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: tracking, error } = await this.client.from("marketing_tracking_tokens").select("*").eq("token_hash", tokenHash).eq("kind", kind).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error) throw error;
    if (!tracking) throw new AppError({ code: "NOT_FOUND", message: "Lien de suivi introuvable." });
    const { data: recipient, error: recipientError } = await this.client.from("marketing_campaign_recipients").select("id,tenant_id,profile_id,campaign_id,provider_connection_id,provider_message_id").eq("id", tracking.recipient_id).eq("tenant_id", tracking.tenant_id).maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient?.provider_connection_id || !recipient.provider_message_id) throw new AppError({ code: "NOT_FOUND", message: "Lien de suivi introuvable." });
    const occurredAt = new Date().toISOString();
    const eventType = kind === "OPEN" ? "OPENED" : "CLICKED";
    const { error: eventError } = await this.client.from("marketing_delivery_events").upsert({ tenant_id: recipient.tenant_id, recipient_id: recipient.id, provider_connection_id: recipient.provider_connection_id, provider_event_id: `tracking:${eventType}:${tokenHash}`, provider_message_id: recipient.provider_message_id, event_type: eventType, occurred_at: occurredAt, safe_metadata: { source: "FIRST_PARTY_TRACKING" } }, { onConflict: "provider_connection_id,provider_event_id", ignoreDuplicates: true });
    if (eventError) throw eventError;
    await this.client.from("marketing_profiles").update({ last_engaged_at: occurredAt }).eq("tenant_id", recipient.tenant_id).eq("id", recipient.profile_id);
    await enqueueMarketingWebhookEvent(recipient.tenant_id, `email.${eventType.toLowerCase()}`, `tracking:${eventType}:${tokenHash}`, {
      recipientId: recipient.id,
      profileId: recipient.profile_id,
      eventType,
      occurredAt,
    });
    if (kind === "CLICK") {
      try {
        await emitMarketingJourneyEvent(recipient.tenant_id, { type: "CAMPAIGN_CLICKED", eventId: `campaign.clicked:${tokenHash}`, profileId: recipient.profile_id, safeContext: { campaignId: recipient.campaign_id } });
      } catch (error) {
        logger.error("marketing_click_journey_event_failed", { recipientId: recipient.id, error: String(error instanceof Error ? error.message : error).slice(0, 300) });
      }
    }
    return { targetUrl: tracking.target_url as string | null };
  }
}

export const marketingTrackingService = new MarketingTrackingService();
