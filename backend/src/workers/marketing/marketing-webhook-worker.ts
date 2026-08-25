import { createHmac } from "node:crypto";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { decryptProviderCredential } from "../../integrations/providers/credential-envelope.js";
import { safeProviderFetch } from "../../integrations/providers/safe-provider-url.js";
import { PostgresMarketingOperationsRepository } from "../../infrastructure/database/repositories/marketing-operations.repository.js";

interface WebhookDeliveryRow {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_type: string;
  event_id: string;
  safe_payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
}

function bytea(value: unknown): Buffer {
  const raw = String(value ?? "");
  return raw.startsWith("\\x")
    ? Buffer.from(raw.slice(2), "hex")
    : Buffer.from(raw, "base64");
}

export class MarketingWebhookWorker {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }
  private readonly operations = new PostgresMarketingOperationsRepository();

  async run(): Promise<{ processed: number; delivered: number }> {
    if (config.dataMode === "demo") return { processed: 0, delivered: 0 };
    const { data, error } = await this.client.rpc(
      "claim_marketing_webhook_delivery",
    );
    if (error) throw error;
    const delivery = (data?.[0] ?? null) as WebhookDeliveryRow | null;
    if (!delivery) return { processed: 0, delivered: 0 };
    try {
      const delivered = await this.deliver(delivery);
      return { processed: 1, delivered: delivered ? 1 : 0 };
    } catch (error: any) {
      const terminal = delivery.attempt_count >= delivery.max_attempts;
      const retrySeconds = Math.min(
        21_600,
        30 * 2 ** Math.max(0, delivery.attempt_count - 1),
      );
      await Promise.all([
        this.client
          .from("marketing_webhook_deliveries")
          .update({
            status: terminal ? "DEAD_LETTER" : "FAILED",
            available_at: new Date(
              Date.now() + retrySeconds * 1_000,
            ).toISOString(),
            last_error_code: "OUTGOING_WEBHOOK_FAILED",
          })
          .eq("id", delivery.id),
        this.client
          .from("marketing_webhook_subscriptions")
          .update({
            last_failure_at: new Date().toISOString(),
          })
          .eq("tenant_id", delivery.tenant_id)
          .eq("id", delivery.subscription_id),
      ]);
      logger.warn("marketing_outgoing_webhook_failed", {
        deliveryId: delivery.id,
        attemptCount: delivery.attempt_count,
        terminal,
        error: String(error?.message || error).slice(0, 300),
      });
      return { processed: 1, delivered: 0 };
    }
  }

  private async deliver(delivery: WebhookDeliveryRow) {
    const { data: subscription, error } = await this.client
      .from("marketing_webhook_subscriptions")
      .select(
        "url,status,signing_secret_ciphertext,signing_secret_iv,signing_secret_tag,key_version",
      )
      .eq("tenant_id", delivery.tenant_id)
      .eq("id", delivery.subscription_id)
      .maybeSingle();
    if (error) throw error;
    if (!subscription || subscription.status !== "ACTIVE") {
      await this.client
        .from("marketing_webhook_deliveries")
        .update({ status: "CANCELLED" })
        .eq("id", delivery.id);
      return false;
    }
    const { data: workspace, error: workspaceError } = await this.client
      .from("marketing_workspaces")
      .select("market_code")
      .eq("tenant_id", delivery.tenant_id)
      .order("created_at")
      .limit(1)
      .single();
    if (workspaceError) throw workspaceError;
    const usage = await this.operations.usage(
      delivery.tenant_id,
      workspace.market_code,
    );
    if (!usage.entitlements.enabled || !usage.entitlements.webhooks) {
      await this.client
        .from("marketing_webhook_deliveries")
        .update({
          status: "CANCELLED",
          last_error_code: "MARKETING_WEBHOOK_NOT_ENTITLED",
        })
        .eq("id", delivery.id);
      return false;
    }
    const key = Buffer.from(
      config.providerCredentialEncryptionKeyBase64,
      "base64",
    );
    const secret = decryptProviderCredential(
      {
        encryptedSecret: bytea(subscription.signing_secret_ciphertext),
        iv: bytea(subscription.signing_secret_iv),
        authTag: bytea(subscription.signing_secret_tag),
      },
      key,
    );
    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const body = JSON.stringify({
      id: delivery.event_id,
      type: delivery.event_type,
      occurredAt: new Date().toISOString(),
      data: delivery.safe_payload,
    });
    if (Buffer.byteLength(body, "utf8") > 256_000)
      throw new Error("OUTGOING_WEBHOOK_PAYLOAD_TOO_LARGE");
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    const response = await safeProviderFetch(subscription.url, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shongre-Marketing-Webhooks/1.0",
        "X-Shongre-Event-Id": delivery.event_id,
        "X-Shongre-Timestamp": timestamp,
        "X-Shongre-Signature": `sha256=${signature}`,
      },
      body,
    });
    await response.body?.cancel();
    if (response.status < 200 || response.status >= 300)
      throw new Error(`OUTGOING_WEBHOOK_HTTP_${response.status}`);
    const deliveredAt = new Date().toISOString();
    await Promise.all([
      this.client
        .from("marketing_webhook_deliveries")
        .update({
          status: "DELIVERED",
          response_status: response.status,
          delivered_at: deliveredAt,
          last_error_code: null,
        })
        .eq("id", delivery.id),
      this.client
        .from("marketing_webhook_subscriptions")
        .update({
          last_delivered_at: deliveredAt,
        })
        .eq("tenant_id", delivery.tenant_id)
        .eq("id", delivery.subscription_id),
    ]);
    return true;
  }
}

export const marketingWebhookWorker = new MarketingWebhookWorker();
