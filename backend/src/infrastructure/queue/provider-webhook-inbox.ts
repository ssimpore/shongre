import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "../supabase/supabase-client.js";
import { databaseFailure } from "../database/repositories/repository-error.js";

export interface ProviderWebhookReceipt {
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  rawBody: string;
  attemptCount: number;
}

export class ProviderWebhookInbox {
  readonly ownerId = `provider-webhook-${process.pid}-${randomUUID()}`;

  async enqueue(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    rawBody: string;
  }): Promise<string> {
    const payloadHash = createHash("sha256")
      .update(input.rawBody)
      .digest("hex");
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "enqueue_provider_webhook",
      {
        p_provider: input.provider,
        p_provider_event_id: input.eventId,
        p_event_type: input.eventType,
        p_payload: input.payload,
        p_raw_body: input.rawBody,
        p_payload_hash: payloadHash,
      },
    );
    if (error) databaseFailure("providerWebhookInbox.enqueue", error);
    return String(data || "received");
  }

  async claim(limit = 25): Promise<ProviderWebhookReceipt[]> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "claim_provider_webhooks",
      { p_owner: this.ownerId, p_limit: limit, p_lease_seconds: 120 },
    );
    if (error) databaseFailure("providerWebhookInbox.claim", error);
    return ((data || []) as any[]).map((row) => ({
      provider: String(row.provider),
      providerEventId: String(row.provider_event_id),
      eventType: String(row.event_type),
      payload: row.payload as Record<string, unknown>,
      rawBody: String(row.raw_body),
      attemptCount: Number(row.attempt_count || 1),
    }));
  }

  async complete(
    receipt: ProviderWebhookReceipt,
    error?: unknown,
  ): Promise<void> {
    const retrySeconds = Math.min(
      3_600,
      15 * 2 ** Math.min(receipt.attemptCount, 7),
    );
    const { data, error: databaseError } = await (
      getSupabaseAdminClient() as any
    ).rpc("complete_provider_webhook", {
      p_provider: receipt.provider,
      p_provider_event_id: receipt.providerEventId,
      p_owner: this.ownerId,
      p_succeeded: error === undefined,
      p_error:
        error === undefined ? null : String((error as any)?.message || error),
      p_retry_seconds: retrySeconds,
    });
    if (databaseError || data !== true)
      databaseFailure("providerWebhookInbox.complete", databaseError);
  }

  async purgeProcessed(retentionDays = 30): Promise<number> {
    const before = new Date(
      Date.now() - retentionDays * 86_400_000,
    ).toISOString();
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "purge_processed_provider_webhooks",
      { p_before: before, p_limit: 1_000 },
    );
    if (error) databaseFailure("providerWebhookInbox.purge", error);
    return Number(data || 0);
  }
}

export const providerWebhookInbox = new ProviderWebhookInbox();
