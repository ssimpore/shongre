import { afterEach, describe, expect, it } from "vitest";
import { config } from "../../src/app/config/index.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import {
  DemoOrderRepository,
  type OrderRecord,
} from "../../src/infrastructure/database/repositories/order.repository.js";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";
import type { OrderPaymentGateway } from "../../src/infrastructure/payments/order-payment-gateway.js";
import {
  CommissionService,
  commissionService,
} from "../../src/modules/commission/commission.service.js";
import { OrdersService } from "../../src/modules/orders/orders.service.js";

const originalPaymentProvider = config.paymentProvider;

afterEach(() => {
  config.paymentProvider = originalPaymentProvider;
});

describe("order checkout reconciliation", () => {
  it("releases a listing only after Stripe confirms the stale checkout expired", async () => {
    config.paymentProvider = "stripe";
    const createdAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const order: OrderRecord = {
      id: "order-stale-expired",
      orderNumber: "CMD-STALE",
      transactionType: "DIRECT_PURCHASE",
      listingId: "list_1",
      buyerId: "user_thomas",
      sellerId: "user_camille",
      status: "initiated",
      itemAmount: 250,
      itemAmountMinor: 25_000,
      protectionFee: 10.7,
      protectionFeeMinor: 1_070,
      shippingFee: 0,
      shippingFeeMinor: 0,
      totalCharged: 260.7,
      totalChargedMinor: 26_070,
      escrowSecuredAmount: 250,
      escrowSecuredAmountMinor: 25_000,
      currency: "EUR",
      deliveryMethod: "hand_delivery",
      paymentMethod: "stripe_checkout",
      checkoutSessionId: "cs_test_expired",
      handoverPinAttempts: 0,
      createdAt,
      updatedAt: createdAt,
    };
    const orderRepo = new DemoOrderRepository({ [order.id]: order });
    const listingRepo = new DemoListingRepository({
      list_1: { ...CANONICAL_DEMO_LISTINGS.list_1, status: "reserved" },
    });
    let retrievals = 0;
    const gateway = {
      async retrieveCheckout(checkoutSessionId: string) {
        retrievals += 1;
        return {
          id: checkoutSessionId,
          status: "expired",
          paymentStatus: "unpaid",
          orderId: order.id,
        };
      },
    } as OrderPaymentGateway;
    const service = new OrdersService(
      orderRepo,
      listingRepo,
      commissionService as CommissionService,
      repositories.markets,
      repositories.compliance,
      gateway,
    );

    await expect(service.reconcileStaleCheckouts()).resolves.toMatchObject({
      inspected: 1,
      cancelled: 1,
      errors: 0,
    });
    expect(retrievals).toBe(1);
    await expect(orderRepo.findById(order.id)).resolves.toMatchObject({
      status: "cancelled",
    });
    await expect(listingRepo.findById("list_1")).resolves.toMatchObject({
      status: "published",
    });
  });
});
