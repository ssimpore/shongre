import { beforeEach, describe, it, expect } from "vitest";
import { listingsService } from "../../src/modules/listings/listings.service.js";
import { ordersService } from "../../src/modules/orders/orders.service.js";
import {
  DemoListingRepository,
  DemoOrderRepository,
  repositories,
} from "../../src/infrastructure/database/repositories/index.js";

describe("Listing & Order Lifecycle", () => {
  beforeEach(() => {
    (repositories.listings as DemoListingRepository).reset();
    (repositories.orders as DemoOrderRepository).reset();
  });

  it("creates a draft and validates mandatory publication fields", async () => {
    const draft = await listingsService.createListingDraft("user_thomas", "FR");
    expect(draft.step).toBe("category");

    await expect(
      listingsService.publishListing(
        { title: "", price: 0, categoryId: "" },
        "user_thomas",
      ),
    ).rejects.toThrow();
  });

  it("parses bounded professional CSV imports with market money", async () => {
    const parsed = await listingsService.parseBulkImportCsv({
      marketCode: "FR",
      defaultCity: "Lyon",
      defaultPostalCode: "69002",
      content:
        "Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description\nTable de salle à manger;home_garden;furniture;280,50;very_good;2;;;Bois massif",
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      title: "Table de salle à manger",
      city: "Lyon",
      postalCode: "69002",
      isValid: true,
      price: { amountMinor: 28_050, currency: "EUR" },
    });
  });

  it("publishes a valid listing with automated safety assessment", async () => {
    const published = await listingsService.publishListing(
      {
        title: "Smartphone Sony Xperia 1 V",
        description:
          "Excellent état, vendu avec sa boîte et deux coques de protection.",
        price: 1850,
        categoryId: "electronics.smartphones.phones",
        marketCode: "FR",
        condition: "tres-bon-etat",
        city: "Lyon",
        postalCode: "69002",
        images: ["https://images.example.test/xperia.jpg"],
        attributes: { listing_intent: "sell", price_type: "fixed" },
      },
      "user_camille",
    );

    expect(published.id).toBeDefined();
    expect(published.status).toBe("published");
    expect(published).not.toHaveProperty("safetyRiskScore");
    expect(published.price).toBe(1850);
  });

  it("persists one listing with explicit France and Belgium publications", async () => {
    const published = await listingsService.publishListing(
      {
        title: "Smartphone Sony multi-marché",
        description:
          "Excellent état, vendu avec sa boîte et une coque supplémentaire.",
        price: 920,
        categoryId: "electronics.smartphones.phones",
        marketCode: "FR",
        selectedMarkets: ["FR", "BE"],
        condition: "tres-bon-etat",
        city: "Lille",
        postalCode: "59000",
        images: ["https://images.example.test/xperia-multi-market.jpg"],
        attributes: { listing_intent: "sell", price_type: "fixed" },
      },
      "user_camille",
    );

    expect(published.marketCodes).toEqual(["FR", "BE"]);
    expect(published.marketPublications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ marketCode: "FR", isPrimary: true }),
        expect.objectContaining({ marketCode: "BE", isPrimary: false }),
      ]),
    );
    await expect(
      repositories.listings.findPublicById(published.id, "BE"),
    ).resolves.toMatchObject({ marketCode: "BE", currency: "EUR" });
  });

  it("starts provider checkout without exposing a handover secret", async () => {
    const order = await ordersService.createDirectPurchase({
      listingId: "list_1",
      buyerId: "user_thomas",
      deliveryMethod: "hand_delivery",
      paymentMethod: "card",
      idempotencyKey: "checkout-listing-lifecycle-1",
    });

    expect(order.transactionType).toBe("DIRECT_PURCHASE");
    expect(order.deliveryMethod).toBe("hand_delivery");
    expect(order.status).toBe("initiated");
    expect(order.checkout.url).toContain("/paiement/retour");
    expect(order).not.toHaveProperty("handoverPin");
    expect(order).not.toHaveProperty("handoverPinHash");
    expect(order).not.toHaveProperty("paymentIntentId");
    await expect(
      repositories.listings.findById("list_1"),
    ).resolves.toMatchObject({ status: "reserved" });
    await expect(
      ordersService.createDirectPurchase({
        listingId: "list_1",
        buyerId: "user_thomas",
        deliveryMethod: "hand_delivery",
        idempotencyKey: "checkout-listing-lifecycle-1",
      }),
    ).resolves.toMatchObject({
      id: order.id,
      checkout: { id: order.checkout.id },
    });
  });

  it("rejects invalid PIN lengths during handover", async () => {
    await expect(
      ordersService.confirmHandoverPIN("ord_1", "user_camille", "12"),
    ).rejects.toThrow();
  });

  it("rejects a well-formed but incorrect handover PIN", async () => {
    const order = await ordersService.createDirectPurchase({
      listingId: "list_1",
      buyerId: "user_thomas",
      deliveryMethod: "hand_delivery",
      paymentMethod: "card",
    });
    const rawEvent = JSON.stringify({ orderId: order.id, paid: true });
    await ordersService.handleStripeWebhook(
      {
        id: `evt_${order.id}`,
        type: "checkout.session.completed",
        data: {
          object: {
            id: order.checkout.id,
            payment_status: "paid",
            amount_total: order.totalChargedMinor,
            currency: order.currency.toLowerCase(),
            payment_intent: `pi_${order.id}`,
            metadata: {
              resource_type: "marketplace_order",
              order_id: order.id,
            },
          },
        },
      },
      rawEvent,
    );
    const { code } = await ordersService.issueHandoverCode(
      order.id,
      "user_thomas",
    );
    const wrongPin = code === "9999" ? "0000" : "9999";

    await expect(
      ordersService.confirmHandoverPIN(order.id, "user_camille", wrongPin),
    ).rejects.toMatchObject({
      code: "INVALID_PIN",
    });
  });

  it("releases item and shipping proceeds only after confirmed delivery", async () => {
    const order = await ordersService.createDirectPurchase({
      listingId: "list_1",
      buyerId: "user_thomas",
      deliveryMethod: "relay_point",
      shippingAddress: {
        street: "10 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        country: "FR",
      },
    });
    await ordersService.handleStripeWebhook(
      {
        id: `evt_paid_${order.id}`,
        type: "checkout.session.completed",
        data: {
          object: {
            id: order.checkout.id,
            payment_status: "paid",
            amount_total: order.totalChargedMinor,
            currency: order.currency.toLowerCase(),
            payment_intent: `pi_${order.id}`,
            metadata: {
              resource_type: "marketplace_order",
              order_id: order.id,
            },
          },
        },
      },
      JSON.stringify({ orderId: order.id, paid: true }),
    );

    await expect(
      ordersService.confirmDeliveryReceived(order.id, "user_thomas"),
    ).resolves.toMatchObject({ status: "completed" });
    await expect(repositories.orders.findById(order.id)).resolves.toMatchObject(
      {
        sellerTransferStatus: "completed",
        sellerTransferAmountMinor: 25_850,
      },
    );
    await expect(
      repositories.listings.findById("list_1"),
    ).resolves.toMatchObject({ status: "sold" });
    await expect(
      ordersService.refundOrder(order.id, {
        refundBaseMinor: 10_000,
        idempotencyKey: "refund-order-partial-refused",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      ordersService.refundOrder(order.id, {
        idempotencyKey: "refund-order-complete-1",
      }),
    ).resolves.toMatchObject({
      order: { status: "refunded" },
      providerRefund: { status: "succeeded" },
    });
    await expect(repositories.orders.findById(order.id)).resolves.toMatchObject(
      {
        sellerTransferStatus: "reversed",
      },
    );
    await expect(
      repositories.listings.findById("list_1"),
    ).resolves.toMatchObject({ status: "sold" });
  });
});
