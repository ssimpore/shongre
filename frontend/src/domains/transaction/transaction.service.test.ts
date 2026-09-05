import { afterEach, describe, it, expect, vi } from "vitest";
import { transactionService } from "./transaction.service";
import { storageService } from "../../services/storage.service";
import type { UserProfile } from "../../types";

describe("TransactionService - Escrow & Fee Calculations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calculates buyer protection fee and minor units correctly for an individual seller", () => {
    const itemPrice = 100; // 100 EUR
    const amounts = transactionService.calculateAmounts(
      itemPrice,
      "hand_delivery",
      "individual",
    );

    // Item price in cents
    expect(amounts.itemPrice).toBe(100);
    expect(amounts.itemPriceCents).toBe(10000);

    // Buyer fee: 4% of 10000 cents (400) + 70 cents = 470 cents = 4.70 EUR
    expect(amounts.protectionFeeCents).toBe(470);
    expect(amounts.protectionFee).toBe(4.7);

    // Hand delivery has 0 shipping fee
    expect(amounts.shippingFeeCents).toBe(0);
    expect(amounts.shippingFee).toBe(0);

    // Total = 100 + 4.70 = 104.70 EUR
    expect(amounts.totalAmount).toBe(104.7);
    expect(amounts.totalAmountCents).toBe(10470);

    // Individual seller has 0 platform commission
    expect(amounts.platformCommission).toBe(0);
    expect(amounts.sellerPayoutAmount).toBe(100);
  });

  it("calculates minor-units snapshot accurately with calculateOrderPricingSnapshot", () => {
    const snapshot = transactionService.calculateOrderPricingSnapshot(
      150,
      2,
      6.9,
      "pro",
      "FR",
    );
    // itemPriceMinor: 15000
    // itemSubtotalMinor: 30000
    // shippingFeeMinor: 690
    // buyerProtectionFeeMinor: 30000 * 0.04 (1200) + 70 = 1270
    // The active canonical professional policy resolves to 900 minor units.
    // totalAmountMinor: 30000 + 690 + 1270 = 31960
    // sellerPayoutAmountMinor: 30000 - 900 = 29100

    expect(snapshot.itemPriceMinor).toBe(15000);
    expect(snapshot.itemSubtotalMinor).toBe(30000);
    expect(snapshot.shippingFeeMinor).toBe(690);
    expect(snapshot.buyerProtectionFeeMinor).toBe(1270);
    expect(snapshot.platformCommissionMinor).toBe(900);
    expect(snapshot.totalAmountMinor).toBe(31960);
    expect(snapshot.sellerPayoutAmountMinor).toBe(29100);
    expect(snapshot.currency).toBe("EUR");
  });

  it("calculates shipping fee for relay point and home delivery", () => {
    const relayAmounts = transactionService.calculateAmounts(
      50,
      "relay_point",
      "individual",
    );
    expect(relayAmounts.shippingFee).toBe(4.9);
    expect(relayAmounts.shippingFeeCents).toBe(490);

    const homeAmounts = transactionService.calculateAmounts(
      50,
      "home_delivery",
      "individual",
    );
    expect(homeAmounts.shippingFee).toBe(6.9);
    expect(homeAmounts.shippingFeeCents).toBe(690);
  });

  it("calculates platform commission for professional marketplace sellers", () => {
    const itemPrice = 200; // 200 EUR
    const amounts = transactionService.calculateAmounts(
      itemPrice,
      "relay_point",
      "pro",
    );

    // The canonical engine resolves a 6 EUR professional commission here.
    expect(amounts.platformCommission).toBe(6);
    expect(amounts.sellerPayoutAmount).toBe(194); // 200 - 6 = 194 EUR
  });

  it("generates a 6-digit confirmation PIN code", () => {
    const pin = transactionService.generateVerificationPin();
    expect(pin).toBe("482731");
    const num = parseInt(pin, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it("generates a human-readable transaction reference code starting with SHG-", () => {
    const ref = transactionService.generateReferenceCode();
    expect(ref).toMatch(/^SHG-[A-Z0-9]{6}$/);
  });

  it("does not let a Staff role bypass customer order ownership", async () => {
    vi.spyOn(storageService, "getTransactions").mockReturnValue([
      {
        id: "tx-foreign",
        sellerId: "seller-owner",
        buyerId: "buyer-owner",
      } as never,
    ]);
    const staff = {
      id: "staff-admin",
      email: "staff-admin@example.test",
      name: "Staff Admin",
      accountType: "individual",
      status: "active",
      staffStatus: "active",
      staffRole: "admin",
      role: "individual_buyer",
      primaryRole: "buyer",
      sellerType: "individual",
      isVerified: true,
      city: "Paris",
      postalCode: "75001",
      createdAt: "2026-01-01T00:00:00.000Z",
      rating: 0,
      reviewCount: 0,
      responseRatePercent: 0,
      responseTimeText: "Non applicable",
    } satisfies UserProfile;

    await expect(
      transactionService.sellerAcceptReservation("tx-foreign", staff),
    ).rejects.toThrow();
    await expect(
      transactionService.confirmBuyerReceipt("tx-foreign", staff),
    ).rejects.toThrow();
  });
});
