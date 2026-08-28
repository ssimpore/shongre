import { providerWebhookInbox } from "../../infrastructure/queue/provider-webhook-inbox.js";
import { stripeWebhookDispatcher } from "../../integrations/stripe/stripe-webhook-dispatcher.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { complianceService } from "../../modules/compliance/compliance.service.js";

export class ProviderWebhookWorker {
  async run(): Promise<{ processed: number; failed: number }> {
    const receipts = await providerWebhookInbox.claim();
    let processed = 0;
    let failed = 0;
    for (const receipt of receipts) {
      try {
        if (receipt.provider === "stripe") {
          await stripeWebhookDispatcher.dispatch(
            receipt.payload,
            receipt.rawBody,
          );
        } else if (receipt.provider === "stripe_connect_v2") {
          if (receipt.eventType.startsWith("v2.core.account")) {
            await complianceService.handleProviderWebhook({
              provider: "payment",
              payload: receipt.payload,
              rawBody: receipt.rawBody,
            });
          }
        } else if (
          receipt.provider === "compliance_identity" ||
          receipt.provider === "compliance_payment"
        ) {
          await complianceService.handleProviderWebhook({
            provider:
              receipt.provider === "compliance_identity"
                ? "identity"
                : "payment",
            payload: receipt.payload,
            rawBody: receipt.rawBody,
          });
        } else {
          throw new Error(`Unsupported webhook provider: ${receipt.provider}`);
        }
        await providerWebhookInbox.complete(receipt);
        processed += 1;
      } catch (error) {
        await providerWebhookInbox.complete(receipt, error);
        failed += 1;
        logger.error("provider_webhook_processing_failed", {
          provider: receipt.provider,
          eventId: receipt.providerEventId,
          eventType: receipt.eventType,
          attemptCount: receipt.attemptCount,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { processed, failed };
  }

  async purge(): Promise<number> {
    return providerWebhookInbox.purgeProcessed();
  }
}

export const providerWebhookWorker = new ProviderWebhookWorker();
