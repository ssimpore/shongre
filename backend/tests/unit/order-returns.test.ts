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

const BUYER = "user_thomas";
const SELLER = "user_camille";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const at = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  return {
    id: "order-return",
    orderNumber: "CMD-RET",
    transactionType: "DIRECT_PURCHASE",
    listingId: "list_1",
    buyerId: BUYER,
    sellerId: SELLER,
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
    deliveryMethod: "relay_point",
    paymentMethod: "stripe_checkout",
    paymentIntentId: "pi_return_test",
    handoverPinAttempts: 0,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

/** `publisherType` decides whether the statutory withdrawal right applies. */
function harness(
  record: OrderRecord,
  publisherType: "private" | "professional" = "professional",
) {
  const orderRepo = new DemoOrderRepository({ [record.id]: record });
  const listingRepo = new DemoListingRepository({
    list_1: {
      ...CANONICAL_DEMO_LISTINGS.list_1,
      status: "sold",
      publisherType,
    },
  });
  const refunds: Array<{ amountMinor?: number; idempotencyKey: string }> = [];
  const gateway = {
    async refund(input: { amountMinor?: number; idempotencyKey: string }) {
      refunds.push({
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey,
      });
      return { id: `re_${refunds.length}`, status: "succeeded" };
    },
    async reverseSellerTransfer() {
      return { reversalId: "trr_1" };
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
  return { service, orderRepo, refunds };
}

describe("order returns", () => {
  it("walks a statutory withdrawal from request to refund", async () => {
    const { service, orderRepo, refunds } = harness(order());

    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "withdrawal",
      details: "Je me rétracte, l’article ne me convient pas.",
    });
    expect(requested).toMatchObject({
      status: "requested",
      isStatutoryWithdrawal: true,
      requestedBaseMinor: 25_000,
    });
    expect(Date.parse(requested.windowExpiresAt)).toBeGreaterThan(Date.now());

    const approved = await service.decideReturn(requested.id, SELLER, {
      approve: true,
    });
    expect(approved).toMatchObject({ status: "approved", decidedBy: SELLER });

    const shipped = await service.markReturnShipped(requested.id, BUYER, {
      carrierName: "Colissimo",
      trackingNumber: "6A123456789",
    });
    expect(shipped).toMatchObject({
      status: "shipped",
      carrierName: "Colissimo",
    });

    const received = await service.confirmReturnReceived(requested.id, SELLER);
    expect(received.refundIssued).toBe(true);
    expect(received.return.status).toBe("refunded");
    expect(refunds).toHaveLength(1);
    expect(refunds[0].idempotencyKey).toBe(`return:${requested.id}`);
    await expect(orderRepo.findById("order-return")).resolves.toMatchObject({
      status: "refunded",
      refundedBaseTotalMinor: 25_000,
    });
  });

  it("refuses to let a seller decline a statutory withdrawal", async () => {
    const { service } = harness(order());
    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "withdrawal",
      details: "Je souhaite exercer mon droit de rétractation.",
    });

    await expect(
      service.decideReturn(requested.id, SELLER, {
        approve: false,
        note: "Non merci",
      }),
    ).rejects.toThrow(/rétractation légale ne peut pas être refusée/);
  });

  it("does not offer withdrawal on a private sale", async () => {
    const { service } = harness(order(), "private");

    await expect(
      service.requestReturn("order-return", BUYER, {
        reason: "withdrawal",
        details: "Je souhaite exercer mon droit de rétractation.",
      }),
    ).rejects.toThrow(/vendeur professionnel/);
  });

  it("lets a private seller refuse a condition claim with a reason", async () => {
    const { service } = harness(order(), "private");
    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "not_as_described",
      details: "La couleur ne correspond pas à l’annonce.",
    });
    expect(requested.isStatutoryWithdrawal).toBe(false);

    await expect(
      service.decideReturn(requested.id, SELLER, { approve: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.decideReturn(requested.id, SELLER, {
        approve: false,
        note: "L’annonce indiquait bien cette teinte.",
      }),
    ).resolves.toMatchObject({ status: "rejected" });
  });

  it("allows only one open return per order", async () => {
    const { service } = harness(order());
    await service.requestReturn("order-return", BUYER, {
      reason: "damaged",
      details: "Le colis est arrivé écrasé.",
    });

    await expect(
      service.requestReturn("order-return", BUYER, {
        reason: "wrong_item",
        details: "En fait ce n’est pas le bon article.",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("keeps the seller out of the buyer's actions and vice versa", async () => {
    const { service } = harness(order());
    await expect(
      service.requestReturn("order-return", SELLER, {
        reason: "damaged",
        details: "Le colis est arrivé écrasé.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "damaged",
      details: "Le colis est arrivé écrasé.",
    });
    await expect(
      service.decideReturn(requested.id, BUYER, { approve: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a return once the window has closed", async () => {
    const stale = new Date(
      Date.now() - 400 * 24 * 60 * 60 * 1_000,
    ).toISOString();
    const { service } = harness(order({ createdAt: stale, updatedAt: stale }));

    await expect(
      service.requestReturn("order-return", BUYER, {
        reason: "withdrawal",
        details: "Je souhaite exercer mon droit de rétractation.",
      }),
    ).rejects.toThrow(/délai de retour/);
  });

  it("refuses a return on an order that is already fully refunded", async () => {
    const { service } = harness(
      order({ status: "refunded", refundedBaseTotalMinor: 25_000 }),
    );

    await expect(
      service.requestReturn("order-return", BUYER, {
        reason: "damaged",
        details: "Le colis est arrivé écrasé.",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("expires a request the seller never answered", async () => {
    const { service, orderRepo } = harness(order());
    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "damaged",
      details: "Le colis est arrivé écrasé.",
    });
    await orderRepo.updateReturn(requested.id, {
      windowExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    await expect(service.expireStaleReturns()).resolves.toEqual({ expired: 1 });
    await expect(orderRepo.findReturnById(requested.id)).resolves.toMatchObject(
      { status: "expired" },
    );
  });

  it("refunds only what is still refundable after a partial refund", async () => {
    const { service, orderRepo, refunds } = harness(order());
    await service.refundOrder("order-return", {
      refundBaseMinor: 5_000,
      idempotencyKey: "partial-before-return",
    });

    const requested = await service.requestReturn("order-return", BUYER, {
      reason: "withdrawal",
      details: "Je me rétracte pour le reste de la commande.",
    });
    expect(requested.requestedBaseMinor).toBe(20_000);

    await service.decideReturn(requested.id, SELLER, { approve: true });
    await service.confirmReturnReceived(requested.id, SELLER);

    expect(refunds.map((entry) => entry.amountMinor)).toEqual([5_000, 21_070]);
    await expect(orderRepo.findById("order-return")).resolves.toMatchObject({
      refundedBaseTotalMinor: 25_000,
      status: "refunded",
    });
  });
});
