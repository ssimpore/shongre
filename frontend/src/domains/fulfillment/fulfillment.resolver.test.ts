import { describe, it, expect } from "vitest";
import { fulfillmentResolver } from "./fulfillment.resolver";

describe("FulfillmentResolver", () => {
  it("resolves parcel and hand delivery capabilities for physical items", () => {
    const caps = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: "electronics.smartphones",
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
      taxonomyNodeId: "real_estate.sales",
      marketCode: "FR",
      sellerType: "pro",
    });

    expect(realEstateCaps.allowHandDelivery).toBe(false);
    expect(realEstateCaps.allowParcelShipping).toBe(false);
    expect(realEstateCaps.allowBulkyDelivery).toBe(false);
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
