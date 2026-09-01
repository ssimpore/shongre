import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { storageService } from "../../infrastructure/storage/storage-service.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";
import type { Database } from "../../generated/database.types.js";

type OutboxRow =
  Database["public"]["Tables"]["digital_fulfillment_outbox"]["Row"];

interface EntitlementRecipient {
  buyer_id: string;
  seller_id: string;
  market_code: string;
}

export class DigitalFulfillmentWorker {
  constructor(
    private readonly workerId = `digital-fulfillment-${process.pid}-${randomUUID()}`,
  ) {}

  async run(limit = 50): Promise<{
    claimed: number;
    completed: number;
    retried: number;
  }> {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.rpc(
      "claim_digital_fulfillment_outbox",
      {
        p_worker_id: this.workerId,
        p_limit: Math.max(1, Math.min(200, Math.trunc(limit))),
        p_lease_seconds: 120,
      },
    );
    if (error)
      throw new Error(`DIGITAL_OUTBOX_CLAIM_FAILED:${error.code ?? "UNKNOWN"}`);

    const events = data ?? [];
    const result = { claimed: events.length, completed: 0, retried: 0 };
    for (const event of events) {
      try {
        await this.process(event);
        await this.complete(event.id, true);
        result.completed += 1;
      } catch (cause) {
        const code = this.safeErrorCode(cause);
        const retryAt = new Date(
          Date.now() +
            Math.min(
              6 * 60 * 60 * 1_000,
              30_000 * 2 ** Math.min(event.attempt_count, 9),
            ),
        ).toISOString();
        await this.complete(event.id, false, code, retryAt);
        result.retried += 1;
        logger.error("digital_fulfillment_event_failed", {
          eventId: event.id,
          eventType: event.event_type,
          marketCode: event.market_code,
          errorCode: code,
        });
      }
    }
    if (events.length)
      logger.info("digital_fulfillment_batch_completed", result);
    return result;
  }

  async refreshLifecycle(limit = 200): Promise<Record<string, number>> {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "refresh_digital_fulfillment_lifecycle",
      { p_limit: Math.max(1, Math.min(1000, Math.trunc(limit))) },
    );
    if (error)
      throw new Error(
        `DIGITAL_LIFECYCLE_REFRESH_FAILED:${error.code ?? "UNKNOWN"}`,
      );
    const value =
      data && typeof data === "object" && !Array.isArray(data) ? data : {};
    return {
      remindersCreated: Number(value.remindersCreated ?? 0),
      provisioningEscalations: Number(value.provisioningEscalations ?? 0),
      entitlementsExpired: Number(value.entitlementsExpired ?? 0),
    };
  }

  private async process(event: OutboxRow): Promise<void> {
    if (event.event_type === "DIGITAL_POLICY_ACTIVATED") return;
    if (
      event.aggregate_type === "digital_asset" &&
      event.event_type === "DIGITAL_ASSET_SCAN_REQUESTED"
    ) {
      await storageService.processDigitalProductAsset(
        event.aggregate_id,
        event.market_code,
      );
      return;
    }
    if (event.aggregate_type !== "digital_entitlement") {
      throw new Error("DIGITAL_EVENT_AGGREGATE_UNSUPPORTED");
    }
    const recipient = await this.getRecipient(
      event.aggregate_id,
      event.market_code,
    );

    switch (event.event_type) {
      case "DIGITAL_ACCESS_READY":
        await this.notifyBuyer(
          recipient,
          "digital_access_ready",
          "Votre accès numérique est prêt",
          "Votre achat numérique est disponible dans votre espace Shongre.",
        );
        return;
      case "DIGITAL_PROVISIONING_REQUESTED":
        await this.notifySeller(
          recipient,
          "digital_provisioning_requested",
          "Un accès numérique est à préparer",
          "Une commande payée attend votre préparation dans votre espace vendeur Shongre.",
        );
        return;
      case "DIGITAL_PROVISIONING_DEADLINE_REMINDER":
        await this.notifySeller(
          recipient,
          "digital_provisioning_reminder",
          "Échéance de remise numérique proche",
          "Une commande numérique payée approche de son échéance de préparation.",
        );
        return;
      case "DIGITAL_PROVISIONING_ESCALATED":
        await Promise.all([
          this.notifyBuyer(
            recipient,
            "digital_provisioning_escalated",
            "Votre accès numérique nécessite une intervention",
            "La préparation de votre achat a dépassé son échéance. Le support peut maintenant intervenir.",
          ),
          this.notifySeller(
            recipient,
            "digital_provisioning_escalated",
            "Préparation numérique en retard",
            "Une préparation a dépassé son échéance et a été transmise au support.",
          ),
        ]);
        return;
      case "DIGITAL_ENTITLEMENT_EXPIRED":
        await this.notifyBuyer(
          recipient,
          "digital_entitlement_expired",
          "Votre accès numérique a expiré",
          "La durée d’accès prévue pour cet achat numérique est terminée.",
        );
        return;
      default:
        throw new Error("DIGITAL_EVENT_TYPE_UNSUPPORTED");
    }
  }

  private async getRecipient(
    entitlementId: string,
    marketCode: string,
  ): Promise<EntitlementRecipient> {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_entitlements")
      .select("buyer_id,seller_id,market_code")
      .eq("id", entitlementId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error || !data)
      throw new Error("DIGITAL_ENTITLEMENT_RECIPIENT_NOT_FOUND");
    return data;
  }

  private notifyBuyer(
    recipient: EntitlementRecipient,
    type: string,
    title: string,
    body: string,
  ) {
    return notificationsService.dispatchNotification(
      recipient.buyer_id,
      type,
      title,
      body,
      "/compte/achats-numeriques",
      "delivery",
      recipient.market_code,
    );
  }

  private notifySeller(
    recipient: EntitlementRecipient,
    type: string,
    title: string,
    body: string,
  ) {
    return notificationsService.dispatchNotification(
      recipient.seller_id,
      type,
      title,
      body,
      "/compte/produits-numeriques",
      "delivery",
      recipient.market_code,
    );
  }

  private async complete(
    eventId: string,
    success: boolean,
    errorCode?: string,
    retryAt?: string,
  ): Promise<void> {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "complete_digital_fulfillment_outbox",
      {
        p_event_id: eventId,
        p_worker_id: this.workerId,
        p_success: success,
        p_error_code: errorCode ?? null,
        p_retry_at: retryAt ?? null,
      },
    );
    if (error || !data) throw new Error("DIGITAL_OUTBOX_COMPLETION_FAILED");
  }

  private safeErrorCode(cause: unknown): string {
    const message =
      cause instanceof Error ? cause.message : "DIGITAL_FULFILLMENT_FAILED";
    return /^[A-Z0-9_:.-]{3,120}$/.test(message)
      ? message.slice(0, 120)
      : "DIGITAL_FULFILLMENT_FAILED";
  }
}

export const digitalFulfillmentWorker = new DigitalFulfillmentWorker();
