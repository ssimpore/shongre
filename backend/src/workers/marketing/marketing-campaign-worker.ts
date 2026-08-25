import { createHash, randomBytes, randomUUID } from "node:crypto";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { capabilityGateways } from "../../integrations/providers/gateways/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { providerConnectionService } from "../../modules/providers/provider-connection.service.js";
import { enqueueMarketingWebhookEvent } from "../../modules/marketing/marketing-webhook-events.js";
import { PostgresMarketingOperationsRepository } from "../../infrastructure/database/repositories/marketing-operations.repository.js";

interface MarketingJobRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  attempt_count: number;
  max_attempts: number;
}

function renderPlainText(content: any): string {
  if (typeof content?.plainText === "string" && content.plainText.trim()) return content.plainText;
  return (content?.blocks ?? []).map((block: any) => {
    if (block.type === "HEADING" || block.type === "PARAGRAPH" || block.type === "FOOTER") return block.text ?? "";
    if (block.type === "BUTTON") return `${block.label}: ${block.href}`;
    if (block.type === "UNSUBSCRIBE") return block.text ?? "Se désabonner : {{ unsubscribe_url }}";
    if (block.type === "PREFERENCE_CENTER") return block.text ?? "Gérer mes préférences : {{ preferences_url }}";
    return "";
  }).filter(Boolean).join("\n\n");
}

function personalize(value: string, profile: any, links: { unsubscribeUrl: string; preferencesUrl: string }): string {
  const variables: Record<string, string> = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    locale: profile.locale,
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function renderHtml(content: any, profile: any, links: { unsubscribeUrl: string; preferencesUrl: string }, buttonUrls: Map<string, string>, openPixelUrl?: string) {
  const blocks = (content?.blocks ?? []).map((block: any) => {
    if (block.type === "HEADING") return `<h2>${escapeHtml(personalize(String(block.text || ""), profile, links))}</h2>`;
    if (block.type === "PARAGRAPH") return `<p>${escapeHtml(personalize(String(block.text || ""), profile, links)).replace(/\n/g, "<br>")}</p>`;
    if (block.type === "BUTTON") return `<p><a href="${escapeHtml(buttonUrls.get(block.id) || block.href)}">${escapeHtml(block.label)}</a></p>`;
    if (block.type === "IMAGE") return `<p><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || "")}" style="max-width:100%;height:auto"></p>`;
    if (block.type === "DIVIDER") return "<hr>";
    if (block.type === "SPACER") return "<div aria-hidden=\"true\" style=\"height:24px\"></div>";
    if (block.type === "UNSUBSCRIBE") return `<p><a href="${escapeHtml(links.unsubscribeUrl)}">${escapeHtml(block.text || "Se désabonner")}</a></p>`;
    if (block.type === "PREFERENCE_CENTER") return `<p><a href="${escapeHtml(links.preferencesUrl)}">${escapeHtml(block.text || "Gérer mes préférences")}</a></p>`;
    if (block.type === "FOOTER") return `<footer>${escapeHtml(block.text || "")}</footer>`;
    return "";
  }).join("\n");
  return `<!doctype html><html lang="${escapeHtml(profile.locale || "fr")}"><body>${blocks}${openPixelUrl ? `<img src="${escapeHtml(openPixelUrl)}" alt="" width="1" height="1" style="display:none">` : ""}</body></html>`;
}

export class MarketingCampaignWorker {
  private get client(): any { return getSupabaseAdminClient() as any; }
  private readonly operations = new PostgresMarketingOperationsRepository();

  async run(): Promise<{ processed: number; accepted: number }> {
    if (config.dataMode === "demo") return { processed: 0, accepted: 0 };
    const { data, error } = await this.client.rpc("claim_marketing_job");
    if (error) throw error;
    const job = (data?.[0] ?? null) as MarketingJobRow | null;
    if (!job) return { processed: 0, accepted: 0 };
    try {
      const result = await this.process(job);
      return result;
    } catch (error: any) {
      const terminal = job.attempt_count >= job.max_attempts;
      const delaySeconds = Math.min(3600, 2 ** Math.max(1, job.attempt_count) * 15);
      await this.client.from("marketing_jobs").update({
        status: terminal ? "DEAD_LETTER" : "FAILED",
        available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
        safe_error_code: "DELIVERY_BATCH_FAILED",
        completed_at: terminal ? new Date().toISOString() : null,
      }).eq("id", job.id);
      if (terminal) {
        await this.client.from("marketing_campaigns").update({ status: "FAILED", completed_at: new Date().toISOString() }).eq("tenant_id", job.tenant_id).eq("id", job.campaign_id);
      }
      logger.error("marketing_campaign_batch_failed", { jobId: job.id, campaignId: job.campaign_id, attemptCount: job.attempt_count, terminal, error: String(error?.message || error).slice(0, 500) });
      return { processed: 0, accepted: 0 };
    }
  }

  private async process(job: MarketingJobRow) {
    const { data: campaign, error: campaignError } = await this.client.from("marketing_campaigns").select("*").eq("tenant_id", job.tenant_id).eq("id", job.campaign_id).single();
    if (campaignError) throw campaignError;
    if (["PAUSED", "CANCELLED", "COMPLETED"].includes(campaign.status)) {
      await this.client.from("marketing_jobs").update({ status: "CANCELLED", completed_at: new Date().toISOString() }).eq("id", job.id);
      return { processed: 0, accepted: 0 };
    }
    const [{ data: version, error: versionError }, { data: sender, error: senderError }, { data: workspace, error: workspaceError }] = await Promise.all([
      this.client.from("marketing_campaign_versions").select("*").eq("tenant_id", job.tenant_id).eq("campaign_id", campaign.id).eq("version", campaign.current_version).single(),
      this.client.from("marketing_sender_identities").select("*").eq("tenant_id", job.tenant_id).eq("id", campaign.sender_identity_id).single(),
      this.client.from("marketing_workspaces").select("*").eq("tenant_id", job.tenant_id).eq("id", campaign.workspace_id).single(),
    ]);
    if (versionError) throw versionError;
    if (senderError) throw senderError;
    if (workspaceError) throw workspaceError;
    if (sender.status !== "VERIFIED") throw new Error("MARKETING_SENDER_NOT_VERIFIED");
    const usage = await this.operations.usage(job.tenant_id, workspace.market_code);
    if (!usage.entitlements.enabled) throw new Error("MARKETING_NOT_ENTITLED");
    const connection = await providerConnectionService.resolve(
      { tenantId: job.tenant_id, userId: campaign.created_by, marketCode: workspace.market_code },
      { capability: "email.marketing", explicitConnectionId: campaign.provider_connection_id ?? workspace.default_provider_connection_id, feature: "marketing.campaign_send" },
    );
    if (connection.ownerType === "PLATFORM" && !usage.entitlements.platformEmail) throw new Error("MARKETING_PLATFORM_EMAIL_NOT_ENTITLED");
    if (connection.ownerType !== "PLATFORM" && !usage.entitlements.byoEmail) throw new Error("MARKETING_BYO_EMAIL_NOT_ENTITLED");
    const { error: quotaError } = await this.client.rpc("reserve_marketing_campaign_quota", {
      p_tenant_id: job.tenant_id,
      p_campaign_id: campaign.id,
      p_market_code: workspace.market_code,
      p_limit: usage.entitlements.maxMonthlySends,
    });
    if (quotaError) throw quotaError;
    const capabilities = await capabilityGateways.emailDelivery.getCapabilities({ tenantId: job.tenant_id, userId: campaign.created_by, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.campaign_send", correlationId: randomUUID(), marketCode: workspace.market_code, locale: campaign.locale });
    const batchSize = Math.min(Math.max(capabilities.maxBatchSize, 1), 200);
    const rateLimitPerSecond = Math.min(100, Math.max(1, Number(connection.configuration.rateLimitPerSecond || 10)));
    const minimumSendIntervalMs = Math.ceil(1_000 / rateLimitPerSecond);
    const { data: recipients, error: recipientsError } = await this.client.from("marketing_campaign_recipients").select("id,profile_id,idempotency_key,variant_id").eq("tenant_id", job.tenant_id).eq("campaign_id", campaign.id).eq("eligibility_status", "ELIGIBLE").eq("send_status", "QUEUED").order("created_at").limit(batchSize);
    if (recipientsError) throw recipientsError;
    if (!recipients.length) {
      if (version.experiment?.enabled && version.experiment.winnerMode === "AUTOMATIC" && !campaign.winning_variant_id) {
        const winnerAt = new Date(new Date(campaign.started_at ?? campaign.created_at).getTime() + Number(version.experiment.durationMinutes || 240) * 60_000);
        if (winnerAt.getTime() > Date.now()) {
          await this.client.from("marketing_jobs").update({ status: "QUEUED", available_at: winnerAt.toISOString(), started_at: null }).eq("id", job.id);
          return { processed: 0, accepted: 0 };
        }
        const analytics = await this.operations.analytics(job.tenant_id, campaign.id);
        const score = (variant: typeof analytics.variants[number]) => version.experiment.winnerMetric === "CONVERSION_RATE" ? variant.conversionRate : version.experiment.winnerMetric === "OPEN_RATE" ? (variant.delivered ? variant.uniqueOpens / variant.delivered : 0) : variant.clickThroughRate;
        const winner = [...analytics.variants].sort((left, right) => score(right) - score(left) || right.delivered - left.delivered)[0]?.variantId ?? version.experiment.variants[0]?.id;
        if (winner) await this.client.from("marketing_campaigns").update({ winning_variant_id: winner }).eq("tenant_id", job.tenant_id).eq("id", campaign.id).is("winning_variant_id", null);
      }
      const now = new Date().toISOString();
      await Promise.all([
        this.client.from("marketing_jobs").update({ status: "COMPLETED", completed_at: now }).eq("id", job.id),
        this.client.from("marketing_campaigns").update({ status: "COMPLETED", completed_at: now }).eq("tenant_id", job.tenant_id).eq("id", campaign.id),
      ]);
      return { processed: 0, accepted: 0 };
    }
    await this.client.from("marketing_campaigns").update({ status: "SENDING", started_at: campaign.started_at ?? new Date().toISOString() }).eq("tenant_id", job.tenant_id).eq("id", campaign.id);
    const profileIds = recipients.map((recipient: any) => recipient.profile_id);
    const { data: profiles, error: profilesError } = await this.client.from("marketing_profiles").select("*").eq("tenant_id", job.tenant_id).in("id", profileIds);
    if (profilesError) throw profilesError;
    const profilesById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const weekStart = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const dayStart = new Date(Date.now() - 86_400_000).toISOString();
    const [recentWeekResult, recentDayResult, suppressionsResult] = await Promise.all([
      this.client.from("marketing_campaign_recipients").select("profile_id").eq("tenant_id", job.tenant_id).neq("campaign_id", campaign.id).gte("created_at", weekStart).in("send_status", ["QUEUED", "ACCEPTED", "DELIVERED"]),
      this.client.from("marketing_campaign_recipients").select("profile_id").eq("tenant_id", job.tenant_id).neq("campaign_id", campaign.id).gte("created_at", dayStart).in("send_status", ["QUEUED", "ACCEPTED", "DELIVERED"]),
      this.client.from("marketing_suppressions").select("normalized_email").eq("tenant_id", job.tenant_id).is("released_at", null),
    ]);
    if (recentWeekResult.error) throw recentWeekResult.error;
    if (recentDayResult.error) throw recentDayResult.error;
    if (suppressionsResult.error) throw suppressionsResult.error;
    const countByProfile = (rows: any[] = []) => rows.reduce((counts, row) => counts.set(row.profile_id, (counts.get(row.profile_id) ?? 0) + 1), new Map<string, number>());
    const weekCounts = countByProfile(recentWeekResult.data);
    const dayCounts = countByProfile(recentDayResult.data);
    const suppressedEmails = new Set((suppressionsResult.data ?? []).map((row: any) => row.normalized_email));
    let accepted = 0;
    for (const recipient of recipients) {
      const profile: any = profilesById.get(recipient.profile_id);
      if (!profile) throw new Error("MARKETING_PROFILE_NOT_FOUND");
      const capped = (dayCounts.get(profile.id) ?? 0) >= Number(workspace.frequency_cap_day || 3) || (weekCounts.get(profile.id) ?? 0) >= Number(workspace.frequency_cap_week || 7);
      if (profile.status !== "SUBSCRIBED" || suppressedEmails.has(profile.normalized_email) || profile.custom_values?.doNotContact === true || capped) {
        await this.client.from("marketing_campaign_recipients").update({ eligibility_status: "EXCLUDED", exclusion_reason: capped ? "FREQUENCY_CAP" : "COMPLIANCE_STATE_CHANGED", send_status: "CANCELLED" }).eq("tenant_id", job.tenant_id).eq("id", recipient.id).eq("send_status", "QUEUED");
        continue;
      }
      const unsubscribeToken = randomBytes(32).toString("base64url");
      const preferencesToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 180 * 86_400_000).toISOString();
      const { error: tokenError } = await this.client.from("marketing_action_tokens").insert([
        { tenant_id: job.tenant_id, profile_id: profile.id, purpose: "UNSUBSCRIBE", token_hash: createHash("sha256").update(unsubscribeToken).digest("hex"), expires_at: expiresAt },
        { tenant_id: job.tenant_id, profile_id: profile.id, purpose: "PREFERENCES", token_hash: createHash("sha256").update(preferencesToken).digest("hex"), expires_at: expiresAt },
      ]);
      if (tokenError) throw tokenError;
      const frontendUrl = config.frontendUrl.replace(/\/$/, "");
      const publicApiUrl = config.publicApiUrl.replace(/\/$/, "");
      const links = {
        unsubscribeUrl: `${frontendUrl}/newsletter/desabonnement?token=${encodeURIComponent(unsubscribeToken)}`,
        preferencesUrl: `${frontendUrl}/newsletter/preferences?token=${encodeURIComponent(preferencesToken)}`,
      };
      const variant = version.experiment?.enabled ? version.experiment.variants?.find((item: any) => item.id === recipient.variant_id) : undefined;
      const content = variant?.content ?? version.content;
      const subject = variant?.subject ?? version.subject;
      const buttonUrls = new Map<string, string>();
      const trackingRows: any[] = [];
      if (workspace.settings?.clickTrackingEnabled === true) for (const block of content.blocks ?? []) if (block.type === "BUTTON" && String(block.href).startsWith("https://")) { const token = randomBytes(32).toString("base64url"); trackingRows.push({ tenant_id: job.tenant_id, recipient_id: recipient.id, token_hash: createHash("sha256").update(token).digest("hex"), kind: "CLICK", target_url: block.href, expires_at: expiresAt }); buttonUrls.set(block.id, `${publicApiUrl}/api/v1/marketing/track/click?token=${encodeURIComponent(token)}`); }
      let openPixelUrl: string | undefined;
      if (workspace.settings?.openTrackingEnabled === true) { const token = randomBytes(32).toString("base64url"); trackingRows.push({ tenant_id: job.tenant_id, recipient_id: recipient.id, token_hash: createHash("sha256").update(token).digest("hex"), kind: "OPEN", target_url: null, expires_at: expiresAt }); openPixelUrl = `${publicApiUrl}/api/v1/marketing/track/open?token=${encodeURIComponent(token)}`; }
      if (trackingRows.length) { const { error: trackingError } = await this.client.from("marketing_tracking_tokens").insert(trackingRows); if (trackingError) throw trackingError; }
      const correlationId = randomUUID();
      const started = Date.now();
      let result: { externalMessageId: string; acceptedAt: string };
      try {
        result = await capabilityGateways.emailDelivery.send(
          { tenantId: job.tenant_id, userId: campaign.created_by, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.campaign_send", correlationId, marketCode: workspace.market_code, locale: campaign.locale },
          { to: [profile.email], from: { email: sender.email, name: sender.display_name }, replyTo: sender.reply_to ?? undefined, subject: personalize(subject, profile, links), textBody: personalize(renderPlainText(content), profile, links), htmlBody: renderHtml(content, profile, links, buttonUrls, openPixelUrl), purpose: "MARKETING", headers: { "List-Unsubscribe": `<${links.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, idempotencyKey: recipient.idempotency_key },
        );
        await providerConnectionService.recordUsage({ tenantId: job.tenant_id, userId: campaign.created_by, connection, capability: "email.marketing", feature: "marketing.campaign_send", correlationId, status: "SUCCEEDED", outputUnits: 1, latencyMs: Date.now() - started });
      } catch (error) {
        await providerConnectionService.recordUsage({ tenantId: job.tenant_id, userId: campaign.created_by, connection, capability: "email.marketing", feature: "marketing.campaign_send", correlationId, status: "FAILED", latencyMs: Date.now() - started });
        if (trackingRows.length) {
          await this.client
            .from("marketing_tracking_tokens")
            .delete()
            .eq("tenant_id", job.tenant_id)
            .in("token_hash", trackingRows.map((row) => row.token_hash));
        }
        throw error;
      }
      await Promise.all([
        this.client.from("marketing_campaign_recipients").update({ send_status: "ACCEPTED", provider_connection_id: connection.id, provider_message_id: result.externalMessageId, accepted_at: result.acceptedAt }).eq("tenant_id", job.tenant_id).eq("id", recipient.id).eq("send_status", "QUEUED"),
        this.client.from("marketing_delivery_events").upsert({ tenant_id: job.tenant_id, recipient_id: recipient.id, provider_connection_id: connection.id, provider_event_id: `accepted:${result.externalMessageId}`, provider_message_id: result.externalMessageId, event_type: "ACCEPTED", occurred_at: result.acceptedAt }, { onConflict: "provider_connection_id,provider_event_id", ignoreDuplicates: true }),
      ]);
      await enqueueMarketingWebhookEvent(job.tenant_id, "email.accepted", `accepted:${connection.id}:${result.externalMessageId}`, {
        recipientId: recipient.id,
        profileId: profile.id,
        campaignId: campaign.id,
        eventType: "ACCEPTED",
        occurredAt: result.acceptedAt,
      });
      accepted += 1;
      if (minimumSendIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, minimumSendIntervalMs));
    }
    await this.client.from("marketing_jobs").update({ status: "QUEUED", available_at: new Date().toISOString(), started_at: null }).eq("id", job.id);
    return { processed: recipients.length, accepted };
  }
}

export const marketingCampaignWorker = new MarketingCampaignWorker();
