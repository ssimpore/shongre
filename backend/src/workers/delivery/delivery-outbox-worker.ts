import { randomUUID } from "node:crypto";
import { getCountryConfig } from "@shongre/contracts";
import { DELIVERY_FEATURE_FLAG_KEY } from "@shongre/contracts/delivery";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { config } from "../../app/config/index.js";
import type {
  DeliveryApplicationRecord,
  DeliveryRepository,
  DeliveryRequestRecord,
} from "../../infrastructure/database/repositories/delivery.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  analyticsService,
  type AnalyticsService,
} from "../../modules/analytics/analytics.service.js";
import {
  featureFlagService,
  type FeatureFlagService,
} from "../../modules/feature-flags/feature-flag.service.js";
import {
  notificationsService,
  type NotificationsService,
} from "../../modules/notifications/notifications.service.js";
import { GUEST_PRINCIPAL } from "../../shared/auth/principal.js";

export interface DeliveryOutboxEvent {
  id: string;
  request_id: string;
  market_code: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface DeliveryOutboxStore {
  claim(workerId: string, limit: number): Promise<DeliveryOutboxEvent[]>;
  complete(
    eventId: string,
    workerId: string,
    success: boolean,
    errorCode?: string,
    retryAt?: string,
  ): Promise<void>;
}

interface RpcClient {
  rpc(
    name: string,
    parameters: Record<string, unknown>,
  ): Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
}

class PostgresDeliveryOutboxStore implements DeliveryOutboxStore {
  private client(): RpcClient {
    return getSupabaseAdminClient() as unknown as RpcClient;
  }

  async claim(workerId: string, limit: number) {
    const { data, error } = await this.client().rpc(
      "claim_delivery_domain_outbox",
      {
        p_worker_id: workerId,
        p_limit: Math.max(1, Math.min(200, Math.trunc(limit))),
        p_lease_seconds: 120,
      },
    );
    if (error || !Array.isArray(data)) {
      throw new Error(
        `DELIVERY_OUTBOX_CLAIM_FAILED:${error?.code ?? "UNKNOWN"}`,
      );
    }
    return data as DeliveryOutboxEvent[];
  }

  async complete(
    eventId: string,
    workerId: string,
    success: boolean,
    errorCode?: string,
    retryAt?: string,
  ) {
    const { data, error } = await this.client().rpc(
      "complete_delivery_domain_outbox",
      {
        p_event_id: eventId,
        p_worker_id: workerId,
        p_success: success,
        p_error_code: errorCode ?? null,
        p_retry_at: retryAt ?? null,
      },
    );
    if (error || data !== true) {
      throw new Error("DELIVERY_OUTBOX_COMPLETION_FAILED");
    }
  }
}

export class DeliveryOutboxWorker {
  constructor(
    private readonly store: DeliveryOutboxStore = new PostgresDeliveryOutboxStore(),
    private readonly repository: DeliveryRepository = repositories.delivery,
    private readonly notifications: NotificationsService = notificationsService,
    private readonly flags: FeatureFlagService = featureFlagService,
    private readonly analytics: AnalyticsService = analyticsService,
    private readonly workerId = `delivery-${process.pid}-${randomUUID()}`,
    private readonly enabled = () => config.dataMode === "database",
  ) {}

  async run(limit = 50): Promise<{
    claimed: number;
    completed: number;
    retried: number;
  }> {
    if (!this.enabled()) {
      return { claimed: 0, completed: 0, retried: 0 };
    }
    const events = await this.store.claim(this.workerId, limit);
    const result = { claimed: events.length, completed: 0, retried: 0 };
    for (const event of events) {
      try {
        await this.process(event);
        await this.store.complete(event.id, this.workerId, true);
        result.completed += 1;
      } catch (cause) {
        const errorCode = this.safeErrorCode(cause);
        const retryAt = new Date(
          Date.now() +
            Math.min(
              6 * 60 * 60 * 1_000,
              30_000 * 2 ** Math.min(event.attempts, 9),
            ),
        ).toISOString();
        await this.store.complete(
          event.id,
          this.workerId,
          false,
          errorCode,
          retryAt,
        );
        result.retried += 1;
        logger.error("delivery_outbox_event_failed", {
          eventId: event.id,
          eventType: event.event_type,
          marketCode: event.market_code,
          errorCode,
        });
      }
    }
    if (events.length) logger.info("delivery_outbox_batch_completed", result);
    return result;
  }

  private async process(event: DeliveryOutboxEvent): Promise<void> {
    const request = await this.repository.getRequest(event.request_id);
    if (!request || request.marketCode !== event.market_code) {
      throw new Error("DELIVERY_OUTBOX_REQUEST_NOT_FOUND");
    }
    switch (event.event_type) {
      case "delivery.request.opened":
        await this.notifyMatches(request);
        return;
      case "delivery.application.submitted":
        await this.notifyApplicationSubmitted(request, event);
        return;
      case "delivery.application.withdrawn":
        await this.notifyApplicationWithdrawn(request, event);
        return;
      case "delivery.assignment.created":
        await this.notifyAssignmentCreated(request);
        return;
      default:
        if (event.event_type.startsWith("delivery.request.")) {
          await this.notifyLifecycle(request, event.event_type);
        }
    }
  }

  private async notifyMatches(request: DeliveryRequestRecord) {
    const country = getCountryConfig(request.marketCode);
    const flag = await this.flags.evaluatePublic(
      GUEST_PRINCIPAL,
      DELIVERY_FEATURE_FLAG_KEY,
      { marketCode: request.marketCode },
    );
    if (
      request.status !== "open" ||
      !flag.enabled ||
      !country?.enabled ||
      !["active", "beta"].includes(country.launchStatus) ||
      !country.marketplace.enabled ||
      !country.capabilities.delivery ||
      !country.readiness.operations ||
      !country.readiness.legal ||
      !country.readiness.compliance
    ) {
      return;
    }
    const matches = await this.repository.listEligibleCouriers(request);
    let notified = 0;
    for (const match of matches) {
      if (
        match.userId === request.requesterId ||
        (await this.repository.areUsersBlocked(
          request.requesterId,
          match.userId,
        ))
      ) {
        continue;
      }
      await this.notifications.dispatchNotification(
        match.userId,
        "delivery.request.matched",
        "Nouvelle opportunité de livraison",
        `${request.pickupLocality.city} → ${request.dropoffLocality.city}`,
        `/livraison/demande/${request.id}`,
        "delivery_opportunities",
        request.marketCode,
        ["inApp", "email", "push"],
        deterministicUuid(
          "delivery-opportunity-notification",
          `${request.id}:${match.profileId}:${request.version}`,
        ),
      );
      await this.repository.reserveMatchNotification(
        request.id,
        match.profileId,
        request.version,
      );
      notified += 1;
      await this.capture("delivery_opportunity_notified", request);
    }
    await this.capture("delivery_match_completed", request, {
      eligibleCourierCount: matches.length,
      notifiedCourierCount: notified,
    });
  }

  private async notifyApplicationSubmitted(
    request: DeliveryRequestRecord,
    event: DeliveryOutboxEvent,
  ) {
    const applicationId = String(event.payload.applicationId || "");
    if (!request.applications.some((item) => item.id === applicationId)) {
      throw new Error("DELIVERY_OUTBOX_APPLICATION_NOT_FOUND");
    }
    await this.notifications.dispatchNotification(
      request.requesterId,
      "delivery.application.submitted",
      "Nouvelle candidature de coursier",
      "Un coursier a répondu à votre demande de livraison.",
      `/compte/livraison/${request.id}`,
      "delivery",
      request.marketCode,
      ["inApp", "email", "push"],
      deterministicUuid("delivery-application-submitted", applicationId),
    );
  }

  private async notifyAssignmentCreated(request: DeliveryRequestRecord) {
    const accepted = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    ) as DeliveryApplicationRecord | undefined;
    if (!accepted) throw new Error("DELIVERY_OUTBOX_ASSIGNMENT_NOT_FOUND");
    await this.notifications.dispatchNotification(
      accepted.courierUserId,
      "delivery.application.accepted",
      "Candidature acceptée",
      "Le demandeur vous a confié cette livraison.",
      "/compte/livraison/coursier",
      "delivery",
      request.marketCode,
      ["inApp", "email", "push"],
      deterministicUuid("delivery-application-accepted", accepted.id),
    );
    for (const rejected of request.applications.filter(
      (application) => application.status === "rejected",
    ) as DeliveryApplicationRecord[]) {
      await this.notifications.dispatchNotification(
        rejected.courierUserId,
        "delivery.application.rejected",
        "Une autre candidature a été retenue",
        "Le demandeur a choisi un autre coursier pour cette livraison.",
        "/compte/livraison/coursier",
        "delivery",
        request.marketCode,
        ["inApp", "email", "push"],
        deterministicUuid("delivery-application-rejected", rejected.id),
      );
    }
  }

  private async notifyApplicationWithdrawn(
    request: DeliveryRequestRecord,
    event: DeliveryOutboxEvent,
  ) {
    const applicationId = String(event.payload.applicationId || "");
    if (!request.applications.some((item) => item.id === applicationId)) {
      throw new Error("DELIVERY_OUTBOX_APPLICATION_NOT_FOUND");
    }
    await this.notifications.dispatchNotification(
      request.requesterId,
      "delivery.application.withdrawn",
      "Candidature retirée",
      "Un coursier a retiré sa candidature de votre demande.",
      `/compte/livraison/${request.id}`,
      "delivery",
      request.marketCode,
      ["inApp", "email", "push"],
      deterministicUuid("delivery-application-withdrawn", applicationId),
    );
  }

  private async notifyLifecycle(
    request: DeliveryRequestRecord,
    eventType: string,
  ) {
    const accepted = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    ) as DeliveryApplicationRecord | undefined;
    const recipients = new Set([request.requesterId]);
    if (accepted) recipients.add(accepted.courierUserId);
    const status = eventType.replace("delivery.request.", "");
    const notificationType =
      status === "cancelled"
        ? "delivery.request.cancelled"
        : [
              "picked_up",
              "in_transit",
              "delivered",
              "completed",
              "disputed",
            ].includes(status)
          ? `delivery.${status}`
          : "delivery.assignment.updated";
    const label = status.replaceAll("_", " ");
    for (const userId of recipients) {
      await this.notifications.dispatchNotification(
        userId,
        notificationType,
        "Mise à jour de la livraison",
        `Le statut de la livraison est maintenant : ${label}.`,
        "/compte/livraison",
        "delivery",
        request.marketCode,
        ["inApp", "email", "push"],
        deterministicUuid(
          "delivery-lifecycle-notification",
          `${request.id}:${request.version}:${userId}`,
        ),
      );
    }
  }

  private capture(
    name: "delivery_match_completed" | "delivery_opportunity_notified",
    request: DeliveryRequestRecord,
    properties: {
      eligibleCourierCount?: number;
      notifiedCourierCount?: number;
    } = {},
  ) {
    return this.analytics.captureAuthoritative({
      name,
      marketCode: request.marketCode,
      eventId: deterministicUuid(
        "delivery-worker-analytics",
        `${name}:${request.id}:${request.version}`,
      ),
      properties: {
        originType: request.origin,
        vehicleClass: request.package.requiredVehicleType,
        lifecycleState: request.status,
        applicationCount: request.applicationCount,
        ...properties,
      },
    });
  }

  private safeErrorCode(cause: unknown): string {
    const message =
      cause instanceof Error ? cause.message : "DELIVERY_OUTBOX_FAILED";
    return /^[A-Z0-9_:.-]{3,120}$/.test(message)
      ? message.slice(0, 120)
      : "DELIVERY_OUTBOX_FAILED";
  }
}

export const deliveryOutboxWorker = new DeliveryOutboxWorker();
