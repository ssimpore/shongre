import { beforeEach, describe, it, expect } from "vitest";
import { DELIVERY_TAXONOMY_CATEGORY_ID } from "@shongre/contracts/delivery";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts/publication";
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

  it("keeps delivery requests out of the generic listing publication path", async () => {
    await expect(
      listingsService.publishListing(
        {
          title: "Livrer un colis",
          description: "Demande de livraison locale entre deux quartiers.",
          priceModel: "on_request",
          categoryId: DELIVERY_TAXONOMY_CATEGORY_ID,
          marketCode: "FR",
        },
        "user_thomas",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
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

  it("rejects an overlong new title before publication and preserves the submitted copy", async () => {
    const draft = {
      title: "W".repeat(PUBLICATION_CONSTRAINTS.title.maxLength + 1),
      categoryId: "electronics.smartphones.phones",
      marketCode: "FR",
    };
    await expect(
      listingsService.publishListing(draft, "user_camille"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        field: "title",
        maxLength: PUBLICATION_CONSTRAINTS.title.maxLength,
      },
    });
    expect(draft.title).toHaveLength(
      PUBLICATION_CONSTRAINTS.title.maxLength + 1,
    );
  });

  it("flags overlong CSV titles and never trusts a forged valid-row flag", async () => {
    const title = "É".repeat(PUBLICATION_CONSTRAINTS.title.maxLength);
    const parsed = await listingsService.parseBulkImportCsv({
      marketCode: "FR",
      content: `Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description\n${title};home_garden;furniture;280;very_good;2;Lyon;69002;Bois massif\n${title}!;home_garden;furniture;280;very_good;2;Lyon;69002;Bois massif`,
    });
    expect(parsed[0]).toMatchObject({ title, isValid: true });
    expect(parsed[1]).toMatchObject({
      title: `${title}!`,
      isValid: false,
      validationErrorCode: "TITLE_TOO_LONG",
    });
    await expect(
      listingsService.publishBulkListings("user_nadia", {
        marketCode: "FR",
        rows: [{ ...parsed[1], isValid: true }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("publishes a valid listing with automated safety assessment", async () => {
    const published = await listingsService.publishListing(
      {
        title: "Smartphone Sony Xperia 1 V",
        description:
          "Excellent état, vendu avec sa boîte et deux coques de protection.",
        price: 1850,
        priceModel: "fixed",
        categoryId: "electronics.smartphones.phones",
        marketCode: "FR",
        condition: "tres-bon-etat",
        city: "Lyon",
        postalCode: "69002",
        images: ["https://images.example.test/xperia.jpg"],
        attributes: { listing_intent: "sell" },
      },
      "user_camille",
    );

    expect(published.id).toBeDefined();
    expect(published.status).toBe("published");
    expect(published).not.toHaveProperty("safetyRiskScore");
    expect(published.price).toBe(1850);
    expect(published.attributes?.price_type).toBe("fixed");
  });

  it("rejects an unknown price type instead of publishing ambiguous card data", async () => {
    await expect(
      listingsService.publishListing(
        {
          title: "Téléphone avec modèle de prix invalide",
          description:
            "Annonce qui ne doit jamais atteindre la projection publique.",
          price: 250,
          categoryId: "electronics.smartphones.phones",
          marketCode: "FR",
          condition: "bon-etat",
          city: "Lyon",
          postalCode: "69002",
          attributes: { price_type: "guess_the_price" },
        },
        "user_camille",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each([
    ["free", 250],
    ["on_request", 250],
    ["unpriced", 250],
    ["fixed", 0],
  ] as const)(
    "rejects a %s model with an incoherent public amount",
    async (priceModel, price) => {
      await expect(
        listingsService.publishListing(
          {
            title: "Annonce avec prix incohérent",
            description:
              "Cette annonce valide la cohérence entre le modèle et le montant.",
            price,
            priceModel,
            categoryId: "electronics.smartphones.phones",
            marketCode: "FR",
            condition: "bon-etat",
            city: "Lyon",
            postalCode: "69002",
          },
          "user_camille",
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    },
  );

  it("accepts a category without a public price only when it is explicit", async () => {
    const listing = await listingsService.publishListing(
      {
        title: "Mission avec tarif sur demande",
        description:
          "Le montant sera établi après qualification précise de la demande.",
        priceModel: "on_request",
        categoryId: "services.local_services.digital_it",
        marketCode: "FR",
        condition: "non-applicable",
        city: "Lyon",
        postalCode: "69002",
        attributes: {
          service_type: "digital_it",
          service_price_model: "on_request",
          availability_schedule: ["Sur rendez-vous"],
        },
      },
      "user_camille",
    );

    expect(listing.price).toBe(0);
    expect(listing.attributes?.price_type).toBe("on_request");
  });

  it("fails closed when one selected market has no commercial publication policy", async () => {
    await expect(
      listingsService.publishListing(
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
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
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
