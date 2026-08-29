import { describe, it, expect } from "vitest";
import { transactionCapabilitiesService } from "./transaction.capabilities";

describe("TransactionCapabilitiesService", () => {
  it("enables direct purchase and reservation for physical consumer goods", () => {
    const caps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: "electronics.smartphones.phones",
      marketCode: "FR",
      price: 350,
      stock: 1,
    });

    expect(caps.canContact).toBe(true);
    expect(caps.canDirectPurchase).toBe(true);
    expect(caps.canReserve).toBe(true);
    expect(caps.defaultModes).toContain("DIRECT_PURCHASE");
    expect(caps.defaultModes).toContain("RESERVATION");
  });

  it("disables direct purchase for real estate and services", () => {
    const realEstateCaps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: "real_estate.sales.apartments",
      marketCode: "FR",
      price: 250000,
    });

    expect(realEstateCaps.canContact).toBe(true);
    expect(realEstateCaps.canDirectPurchase).toBe(false);
    expect(realEstateCaps.directPurchaseDisabledReason).toBeDefined();
  });

  it("disables direct online payment when price is 0 or listing intent is GIVE", () => {
    const giveCaps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: "home_garden.furniture.tables",
      marketCode: "FR",
      listingIntent: "GIVE",
      price: 0,
    });

    expect(giveCaps.canContact).toBe(true);
    expect(giveCaps.canDirectPurchase).toBe(false);
    expect(giveCaps.canReserve).toBe(false);
  });

  it("requires a verified seller for secure direct purchase", () => {
    const caps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: "electronics.smartphones.phones",
      marketCode: "FR",
      sellerIsVerified: false,
      price: 350,
    });

    expect(caps.canDirectPurchase).toBe(false);
    expect(caps.directPurchaseDisabledReason).toContain("vérifié");
    expect(caps.canReserve).toBe(true);
  });

  it("disables purchase and reservation when stock is exhausted", () => {
    const caps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: "electronics.smartphones.phones",
      marketCode: "FR",
      price: 350,
      stock: 0,
    });

    expect(caps.canDirectPurchase).toBe(false);
    expect(caps.canReserve).toBe(false);
    expect(caps.defaultModes).toEqual(["CONTACT_ONLY"]);
  });
});
