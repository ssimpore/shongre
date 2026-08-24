import { describe, expect, it } from "vitest";
import { DemoPaymentsService } from "./demo-payments.service";

describe("DemoPaymentsService", () => {
  it("returns deterministic intent and payout references", async () => {
    const service = new DemoPaymentsService();
    const firstIntent = await service.createCheckout(
      "quote-1",
      "checkout-key-1",
    );
    const secondIntent = await service.createCheckout(
      "quote-1",
      "checkout-key-1",
    );
    const payoutInput = {
      amountMinor: 250,
      currency: "EUR",
      idempotencyKey: "payout-key-1",
    };
    const firstPayout = await service.requestSellerPayout(payoutInput);
    const secondPayout = await service.requestSellerPayout(payoutInput);

    expect(secondIntent.id).toBe(firstIntent.id);
    expect(secondPayout.payoutId).toBe(firstPayout.payoutId);
  });
});
