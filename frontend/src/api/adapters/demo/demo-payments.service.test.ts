import { beforeEach, describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { DemoPaymentsService } from "./demo-payments.service";
import { demoBusinessRulesService } from "./demo-business-rules.service";
import { storageService } from "../../../services/storage.service";

const france = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});

describe("DemoPaymentsService", () => {
  beforeEach(() => storageService.setCurrentUserKey("seller_camille"));

  it("returns deterministic intent and payout references", async () => {
    const service = new DemoPaymentsService();
    const quote = await demoBusinessRulesService.createQuote(france, {
      productIds: ["premium.urgent"],
      marketCode: "FR",
      idempotencyKey: "payment-service-quote-1",
    });
    const firstIntent = await service.createCheckout(
      france,
      quote.id,
      "checkout-key-1",
    );
    const secondIntent = await service.createCheckout(
      france,
      quote.id,
      "checkout-key-1",
    );
    const payoutInput = {
      amountMinor: 250,
      currency: "EUR",
      idempotencyKey: "payout-key-1",
    };
    const firstPayout = await service.requestSellerPayout(france, payoutInput);
    const secondPayout = await service.requestSellerPayout(france, payoutInput);

    expect(secondIntent.id).toBe(firstIntent.id);
    expect(secondPayout.payoutId).toBe(firstPayout.payoutId);
  });
});
