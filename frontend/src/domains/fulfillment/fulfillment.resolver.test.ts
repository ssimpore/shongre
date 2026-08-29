import { describe, it, expect } from "vitest";
import { fulfillmentResolver } from "./fulfillment.resolver";

describe("FulfillmentResolver", () => {
  it("resolves parcel and hand delivery capabilities for physical items", () => {
    const caps = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: "electronics.smartphones.phones",
      marketCode: "FR",
      sellerType: "individual",
      price: 450,
    });

    expect(caps.allowHandDelivery).toBe(true);
    expect(caps.allowParcelShipping).toBe(true);
    expect(caps.allowBulkyDelivery).toBe(false);
  });

  it("resolves bulky delivery for large furniture items and disables standard small parcel", () => {
    const caps = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: "home_garden.furniture.sofas",
      marketCode: "FR",
      sellerType: "individual",
      price: 800,
    });

    expect(caps.allowHandDelivery).toBe(true);
    expect(caps.allowParcelShipping).toBe(false);
    expect(caps.allowBulkyDelivery).toBe(true);
  });

  it("disables physical shipping for real estate and job listings", () => {
    const realEstateCaps = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: "real_estate.sales.apartments",
      marketCode: "FR",
      sellerType: "pro",
    });

    expect(realEstateCaps.allowHandDelivery).toBe(false);
    expect(realEstateCaps.allowParcelShipping).toBe(false);
    expect(realEstateCaps.allowBulkyDelivery).toBe(false);
  });

  it("keeps zero-price wording in the quote price instead of repeating it in the description", () => {
    const quotes = fulfillmentResolver.resolveAvailableQuotes({
      listing: {
        id: "l-hand-delivery",
        title: "Machine à café",
        price: 180,
        city: "Lyon 2e",
        postalCode: "69002",
        sellerType: "individual",
        deliveryOptions: [{ type: "hand_delivery", available: true }],
      } as any,
    });

    expect(quotes[0]).toMatchObject({
      deliveryType: "hand_delivery",
      price: 0,
      description: "À Lyon 2e (69002) avec code PIN sécurisé",
    });
    expect(quotes[0]?.description.toLowerCase()).not.toContain("gratuit");
  });

  it("calculates order pricing and buyer protection service fee accurately", () => {
    const mockListing: any = {
      id: "l-1",
      title: "iPhone 15 Pro",
      price: 800,
      sellerType: "individual",
      marketCode: "FR",
    };

    const mockQuote: any = {
      id: "quote-colissimo",
      code: "COLISSIMO_HOME",
      title: "Colissimo Domicile",
      price: 6.9,
      deliveryType: "home_delivery",
    };

    const pricing = fulfillmentResolver.calculateOrderPricing({
      listing: mockListing,
      quantity: 1,
      selectedQuote: mockQuote,
      marketCode: "FR",
    });

    expect(pricing.itemSubtotal).toBe(800);
    expect(pricing.deliveryFee).toBe(6.9);
    // Published FR rule: 0.70 + 800 * 0.04 = 32.70 EUR.
    expect(pricing.buyerServiceFee).toBe(32.7);
    expect(pricing.buyerTotal).toBe(839.6);
    expect(pricing.sellerNet).toBe(800);
  });
});
