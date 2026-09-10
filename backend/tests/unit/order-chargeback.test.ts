import { describe, expect, it } from "vitest";
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

const PAYMENT_INTENT = "pi_test_chargeback";

function completedOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const at = new Date("2026-09-01T10:00:00.000Z").toISOString();
  return {
    id: "order-chargeback",
    orderNumber: "CMD-CB",
    transactionType: "DIRECT_PURCHASE",
    listingId: "list_1",
    buyerId: "user_thomas",
    sellerId: "user_camille",
    status: "completed",
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
    paymentIntentId: PAYMENT_INTENT,
    destinationAccountId: "acct_seller",
    sellerTransferId: "tr_released",
    sellerTransferAmountMinor: 24_000,
    sellerTransferStatus: "completed",
    handoverPinAttempts: 0,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

interface Harness {
  service: OrdersService;
  orderRepo: DemoOrderRepository;
  reversals: Array<{ transferId: string; idempotencyKey: string }>;
  refunds: number;
}

function harness(order: OrderRecord): Harness {
  const orderRepo = new DemoOrderRepository({ [order.id]: order });
  const listingRepo = new DemoListingRepository({
    list_1: { ...CANONICAL_DEMO_LISTINGS.list_1, status: "sold" },
  });
  const reversals: Array<{ transferId: string; idempotencyKey: string }> = [];
  const state = { refunds: 0 };
  const gateway = {
    async reverseSellerTransfer(input: {
      transferId: string;
      idempotencyKey: string;
    }) {
      reversals.push({
        transferId: input.transferId,
        idempotencyKey: input.idempotencyKey,
      });
      return { reversalId: `trr_${reversals.length}` };
    },
    async refund() {
      state.refunds += 1;
      return { id: "re_should_not_happen", status: "succeeded" };
    },
  } as unknown as OrderPaymentGateway;
  const service = new OrdersService(
    orderRepo,
    listingRepo,
    commissionService as CommissionService,
    repositories.markets,
    repositories.compliance,
    gateway,
  );
  return {
    service,
    orderRepo,
    reversals,
    get refunds() {
      return state.refunds;
    },
  } as Harness;
}

function disputeEvent(
  type: string,
  overrides: Record<string, unknown> = {},
  eventId = `evt_${type}_${Math.random().toString(36).slice(2, 10)}`,
) {
  return {
    id: eventId,
    type,
    created: 1_788_000_000,
    data: {
      object: {
        id: "dp_test_1",
        payment_intent: PAYMENT_INTENT,
        amount: 26_070,
        currency: "eur",
        reason: "fraudulent",
        status: "needs_response",
        ...overrides,
      },
    },
  };
}

describe("order chargebacks", () => {
  it("records an opened dispute and disputes the order without refunding", async () => {
    const { service, orderRepo, reversals, ...rest } =
      harness(completedOrder());
    const event = disputeEvent("charge.dispute.created");

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({
      processed: true,
      state: "disputed",
      chargebackStatus: "open",
    });

    const stored = await orderRepo.findById("order-chargeback");
    expect(stored).toMatchObject({
      status: "disputed",
      chargebackProviderId: "dp_test_1",
      chargebackStatus: "open",
      chargebackReason: "fraudulent",
      chargebackAmountMinor: 26_070,
      // Still funded: an open dispute may be won.
      sellerTransferStatus: "completed",
    });
    expect(stored?.chargebackOpenedAt).toBe("2026-08-29T10:40:00.000Z");
    expect(reversals).toHaveLength(0);
    expect((rest as { refunds: number }).refunds).toBe(0);
  });

  it("recovers the seller transfer once the funds are withdrawn", async () => {
    const { service, orderRepo, reversals, ...rest } =
      harness(completedOrder());
    const event = disputeEvent("charge.dispute.funds_withdrawn", {
      status: "under_review",
    });

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({ processed: true, state: "disputed" });

    expect(reversals).toEqual([
      {
        transferId: "tr_released",
        idempotencyKey: "chargeback:dp_test_1:transfer-reversal",
      },
    ]);
    await expect(orderRepo.findById("order-chargeback")).resolves.toMatchObject(
      { sellerTransferStatus: "reversed", status: "disputed" },
    );
    // The network already took the money; refunding would pay the buyer twice.
    expect((rest as { refunds: number }).refunds).toBe(0);
  });

  it("never reverses a transfer that was never released", async () => {
    const { service, reversals } = harness(
      completedOrder({
        sellerTransferId: undefined,
        sellerTransferStatus: undefined,
        sellerTransferAmountMinor: undefined,
      }),
    );
    const event = disputeEvent("charge.dispute.closed", { status: "lost" });

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({ processed: true, chargebackStatus: "lost" });
    expect(reversals).toHaveLength(0);
  });

  it("closes a won dispute without silently re-paying the seller", async () => {
    const { service, orderRepo, reversals } = harness(
      completedOrder({
        chargebackProviderId: "dp_test_1",
        chargebackStatus: "under_review",
        chargebackOpenedAt: "2026-08-20T09:00:00.000Z",
        sellerTransferStatus: "reversed",
      }),
    );
    const event = disputeEvent("charge.dispute.closed", { status: "won" });

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({ processed: true, chargebackStatus: "won" });

    const stored = await orderRepo.findById("order-chargeback");
    expect(stored).toMatchObject({
      chargebackStatus: "won",
      chargebackClosedAt: "2026-08-29T10:40:00.000Z",
      // Unchanged: settling the seller again is an operator decision.
      sellerTransferStatus: "reversed",
    });
    expect(stored?.chargebackOpenedAt).toBe("2026-08-20T09:00:00.000Z");
    expect(reversals).toHaveLength(0);
  });

  it("treats an early fraud warning as a warning, not a loss", async () => {
    const { service, orderRepo, reversals } = harness(completedOrder());
    const event = {
      id: "evt_efw_1",
      type: "radar.early_fraud_warning.created",
      created: 1_788_000_000,
      data: {
        object: {
          id: "issfr_test_1",
          payment_intent: PAYMENT_INTENT,
          fraud_type: "made_with_stolen_card",
          charge: "ch_test_1",
        },
      },
    };

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({ processed: true, chargebackStatus: "warning" });

    await expect(orderRepo.findById("order-chargeback")).resolves.toMatchObject(
      {
        chargebackStatus: "warning",
        chargebackReason: "made_with_stolen_card",
        sellerTransferStatus: "completed",
      },
    );
    expect(reversals).toHaveLength(0);
  });

  it("ignores a dispute for a payment that is not a marketplace order", async () => {
    const { service, reversals } = harness(
      completedOrder({ paymentIntentId: "pi_other" }),
    );
    const event = disputeEvent("charge.dispute.created");

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).resolves.toMatchObject({
      processed: false,
      reason: "not_marketplace_order",
    });
    expect(reversals).toHaveLength(0);
  });

  it("refuses a second dispute identifier on the same order", async () => {
    const { service } = harness(
      completedOrder({ chargebackProviderId: "dp_existing" }),
    );
    const event = disputeEvent("charge.dispute.created");

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).rejects.toThrow(/litige est déjà enregistré/);
  });

  it("rejects a dispute payload with no payment intent", async () => {
    const { service } = harness(completedOrder());
    const event = disputeEvent("charge.dispute.created", {
      payment_intent: undefined,
    });

    await expect(
      service.handleStripeWebhook(event, JSON.stringify(event)),
    ).rejects.toThrow(/incomplet/);
  });
});
