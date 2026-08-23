import { describe, expect, it } from "vitest";
import { DemoPaymentsService } from "./demo-payments.service";

describe("DemoPaymentsService", () => {
  it("returns deterministic intent and payout references", async () => {
    const service = new DemoPaymentsService();
    const firstIntent = await service.createPaymentIntent(299, "EUR", {
      listingId: "listing-1",
    });
    const secondIntent = await service.createPaymentIntent(299, "EUR", {
      listingId: "listing-1",
    });
    const firstPayout = await service.requestSellerPayout(
      "seller-1",
      250,
      "FR7612345678901234567890185",
    );
    const secondPayout = await service.requestSellerPayout(
      "seller-1",
      250,
      "FR7612345678901234567890185",
    );

    expect(secondIntent.clientSecret).toBe(firstIntent.clientSecret);
    expect(secondPayout.payoutId).toBe(firstPayout.payoutId);
  });
});
