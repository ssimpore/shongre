import { autoService } from "../../modules/auto/auto.service.js";
import { realEstateService } from "../../modules/real-estate/real-estate.service.js";
import { businessRulesService } from "../../modules/business-rules/business-rules.service.js";
import { ordersService } from "../../modules/orders/orders.service.js";
import { complianceService } from "../../modules/compliance/compliance.service.js";

export class StripeWebhookDispatcher {
  async dispatch(event: any, rawBody: string) {
    const auto = await autoService.handleProviderWebhook(
      "stripe",
      event,
      rawBody,
    );
    const realEstate = await realEstateService.handleProviderWebhook(
      "stripe",
      event,
      rawBody,
    );
    const monetization = await businessRulesService.handleStripeWebhook(
      event,
      rawBody,
    );
    const orders = await ordersService.handleStripeWebhook(event, rawBody);
    const identityCompliance = String(event?.type || "").startsWith(
      "identity.verification_session.",
    )
      ? await complianceService.handleProviderWebhook({
          provider: "identity",
          payload: event,
          rawBody,
        })
      : null;
    const paymentCompliance =
      event?.type === "account.updated"
        ? await complianceService.handleProviderWebhook({
            provider: "payment",
            payload: event,
            rawBody,
          })
        : null;
    return {
      auto,
      realEstate,
      monetization,
      orders,
      identityCompliance,
      paymentCompliance,
    };
  }
}

export const stripeWebhookDispatcher = new StripeWebhookDispatcher();
