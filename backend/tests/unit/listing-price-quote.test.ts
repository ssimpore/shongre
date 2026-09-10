import { describe, expect, it } from "vitest";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoOrderRepository } from "../../src/infrastructure/database/repositories/order.repository.js";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";
import type { OrderPaymentGateway } from "../../src/infrastructure/payments/order-payment-gateway.js";
import {
  CommissionService,
  commissionService,
} from "../../src/modules/commission/commission.service.js";
import { OrdersService } from "../../src/modules/orders/orders.service.js";
import type { DeliveryType, Listing } from "../../src/shared/types/index.js";

/**
 * `quoteListingPrice` is what lets the listing page disclose a real total to a
 * signed-out visitor. `quoteDirectPurchase` cannot: it needs
 * `permission("order.create")` because it also decides whether *this buyer* may
 * purchase. The two must agree on the arithmetic, and this one must never
 * acquire buyer context.
 */
function serviceWith(listing: Listing) {
  const listingRepo = new DemoListingRepository();
  listingRepo.findById = async (id: string) =>
    id === listing.id ? listing : null;
  const service = new OrdersService(
    new DemoOrderRepository(),
    listingRepo,
    commissionService as CommissionService,
    repositories.markets,
    repositories.compliance,
    {} as OrderPaymentGateway,
  );
  return service;
}

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    ...(new DemoListingRepository() as unknown as {
      // The canonical demo listing is the closest thing to a real row; only the
      // fields the quote reads are overridden.
    }),
    id: "list-quote",
    sellerId: "user_camille",
    title: "Peugeot 208",
    price: 15_400,
    currency: "EUR",
    marketCode: "FR",
    status: "published",
    allowedDelivery: ["hand_delivery", "home_delivery"] as DeliveryType[],
    shippingCost: 45,
    fulfillmentModel: "PHYSICAL",
    ...overrides,
  } as unknown as Listing;
}

describe("quoteListingPrice", () => {
  it("prices every row, so no row has to be a placeholder", async () => {
    const quote = await serviceWith(listing()).quoteListingPrice({
      listingId: "list-quote",
    });

    expect(quote.itemAmountMinor).toBe(1_540_000);
    expect(quote.protectionFeeMinor).toBeGreaterThan(0);
    expect(quote.currency).toBe("EUR");
    expect(quote.totalAmountMinor).toBe(
      quote.itemAmountMinor + quote.protectionFeeMinor + quote.shippingFeeMinor,
    );
  });

  it("defaults to the cheapest fulfilment the listing allows", async () => {
    /* The disclosed total has to be the lowest total the buyer could actually
       reach, not whichever method happens to be listed first. */
    const quote = await serviceWith(listing()).quoteListingPrice({
      listingId: "list-quote",
    });

    expect(quote.deliveryMethod).toBe("hand_delivery");
    expect(quote.shippingFeeMinor).toBe(0);
  });

  it("honours a requested fulfilment method the listing allows", async () => {
    const quote = await serviceWith(listing()).quoteListingPrice({
      listingId: "list-quote",
      deliveryMethod: "home_delivery",
    });

    expect(quote.deliveryMethod).toBe("home_delivery");
    expect(quote.shippingFeeMinor).toBe(4_500);
    expect(quote.totalAmountMinor).toBe(
      quote.itemAmountMinor + quote.protectionFeeMinor + 4_500,
    );
  });

  it("ignores a method the listing does not allow rather than refusing to price", async () => {
    /* This endpoint exists to display a price. Rejecting the request because a
       query parameter is stale would put the placeholder back on the page. */
    const quote = await serviceWith(
      listing({ allowedDelivery: ["hand_delivery"] as DeliveryType[] }),
    ).quoteListingPrice({
      listingId: "list-quote",
      deliveryMethod: "express",
    });

    expect(quote.deliveryMethod).toBe("hand_delivery");
  });

  it("prices a digital listing as digital fulfilment with no delivery fee", async () => {
    const quote = await serviceWith(
      listing({
        fulfillmentModel: "DIGITAL",
        allowedDelivery: ["digital"] as DeliveryType[],
      }),
    ).quoteListingPrice({ listingId: "list-quote" });

    expect(quote.deliveryMethod).toBe("digital");
    expect(quote.shippingFeeMinor).toBe(0);
  });

  it("reports an unknown listing as absent", async () => {
    await expect(
      serviceWith(listing()).quoteListingPrice({ listingId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("agrees with the authenticated checkout quote on the same method", async () => {
    /* One authority for an amount the buyer will be charged. If these ever
       diverge, the page is disclosing a price checkout will not honour. */
    const subject = listing();
    const service = serviceWith(subject);
    const publicQuote = await service.quoteListingPrice({
      listingId: subject.id,
      deliveryMethod: "home_delivery",
    });
    const checkoutQuote = await service.quoteDirectPurchase({
      listingId: subject.id,
      buyerId: "user_thomas",
      deliveryMethod: "home_delivery",
    });

    expect(publicQuote.itemAmountMinor).toBe(checkoutQuote.itemAmountMinor);
    expect(publicQuote.protectionFeeMinor).toBe(
      checkoutQuote.protectionFeeMinor,
    );
    expect(publicQuote.shippingFeeMinor).toBe(checkoutQuote.shippingFeeMinor);
    expect(publicQuote.totalAmountMinor).toBe(checkoutQuote.totalAmountMinor);
    expect(publicQuote.currency).toBe(checkoutQuote.currency);
  });
});
