import { type RouteRegistrar, PUBLIC } from "../../api/v1/route-contract.js";
import { config } from "../../app/config/index.js";
import { logger } from "../logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import { verifyStripeSignature } from "../../integrations/stripe/webhook-signature.js";
import { providerWebhookInbox } from "../queue/provider-webhook-inbox.js";
import { stripeWebhookDispatcher } from "../../integrations/stripe/stripe-webhook-dispatcher.js";
import { createHash } from "node:crypto";
import { complianceService } from "../../modules/compliance/compliance.service.js";
import { verifyComplianceWebhookSignature } from "../../integrations/providers/compliance-webhook-signature.js";

export function registerWebhooksRoutes(routes: RouteRegistrar): void {
  routes.addRoute("POST", "/webhooks/stripe", PUBLIC, async ({ req, body }) => {
    const signature = req.headers["stripe-signature"];
    const rawBody = (req as any).rawBody as string | undefined;

    if (!config.stripeWebhookSecret) {
      // Refuse rather than accept unverifiable events: a webhook that is
      // trusted without verification is an unauthenticated write endpoint
      // into payment state.
      logger.error(
        "Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured",
      );
      throw new AppError({
        code: "FORBIDDEN",
        message: "Webhook non configuré.",
      });
    }

    const verified = verifyStripeSignature({
      payload: rawBody ?? "",
      signatureHeader: Array.isArray(signature) ? signature[0] : signature,
      secret: config.stripeWebhookSecret,
    });

    if (!verified.ok) {
      logger.warn(`Stripe webhook rejected: ${verified.reason}`);
      throw new AppError({
        code: "FORBIDDEN",
        message: "Signature de webhook invalide.",
      });
    }

    const eventId = String(body?.id || "").trim();
    const eventType = String(body?.type || "").trim();
    if (!eventId || !eventType) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement Stripe incomplet.",
      });
    }
    if (config.dataMode === "database") {
      const status = await providerWebhookInbox.enqueue({
        provider: "stripe",
        eventId,
        eventType,
        payload: body,
        rawBody: rawBody ?? "",
      });
      logger.info("stripe_webhook_enqueued", { eventId, eventType, status });
      return { received: true, queued: true, status };
    }

    // Demo mode remains deterministic and self-contained: the API and worker
    // are separate processes, so a process-local queue would lose events.
    const result = await stripeWebhookDispatcher.dispatch(body, rawBody ?? "");
    logger.info(`Stripe webhook accepted: ${body?.type || "unknown event"}`);
    return {
      received: true,
      queued: false,
      ...result,
    };
  });
  routes.addRoute(
    "POST",
    "/webhooks/stripe-connect-v2",
    PUBLIC,
    async ({ req, body }) => {
      const rawBody = ((req as any).rawBody as string | undefined) ?? "";
      const signature = req.headers["stripe-signature"];
      const verified = verifyStripeSignature({
        payload: rawBody,
        signatureHeader: Array.isArray(signature) ? signature[0] : signature,
        secret: config.stripeConnectWebhookSecret || "",
      });
      if (!verified.ok) {
        logger.warn(`Stripe Connect v2 webhook rejected: ${verified.reason}`);
        throw new AppError({
          code: "FORBIDDEN",
          message: "Signature de webhook invalide.",
        });
      }
      if (!String(body?.type || "").startsWith("v2.core.account")) {
        return { received: true, ignored: true };
      }
      if (config.dataMode === "database") {
        const eventId =
          String(body?.id || "").trim() ||
          createHash("sha256").update(rawBody).digest("hex");
        const status = await providerWebhookInbox.enqueue({
          provider: "stripe_connect_v2",
          eventId,
          eventType: String(body.type),
          payload: body,
          rawBody,
        });
        return { received: true, queued: true, status };
      }
      const paymentCompliance = await complianceService.handleProviderWebhook({
        provider: "payment",
        payload: body,
        rawBody,
      });
      return { received: true, paymentCompliance };
    },
  );
  routes.addRoute(
    "POST",
    "/webhooks/compliance/:provider",
    PUBLIC,
    async ({ req, params, body }) => {
      if (params.provider !== "identity" && params.provider !== "payment")
        throw new AppError({
          code: "NOT_FOUND",
          message: "Provider inconnu.",
        });
      const rawBody = ((req as any).rawBody as string | undefined) ?? "";
      const signature = req.headers["x-shongre-signature"];
      const verified = verifyComplianceWebhookSignature({
        rawBody,
        signatureHeader: Array.isArray(signature) ? signature[0] : signature,
        secret: config.complianceWebhookSecret || "",
      });
      if (!verified.ok) {
        logger.warn(`Compliance webhook rejected: ${verified.reason}`);
        throw new AppError({
          code: "FORBIDDEN",
          message: "Signature de webhook invalide.",
        });
      }
      if (config.dataMode === "database") {
        const eventId =
          String(body?.id || body?.eventId || "").trim() ||
          createHash("sha256").update(rawBody).digest("hex");
        const eventType = String(body?.type || body?.eventType || "compliance");
        const status = await providerWebhookInbox.enqueue({
          provider: `compliance_${params.provider}`,
          eventId,
          eventType,
          payload: body,
          rawBody,
        });
        return { received: true, queued: true, status };
      }
      return complianceService.handleProviderWebhook({
        provider: params.provider,
        payload: body,
        rawBody,
      });
    },
  );
}
