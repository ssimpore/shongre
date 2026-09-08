import { describe, expect, it } from "vitest";
import type { ListingCardView } from "@shongre/contracts";
import {
  getListingCardPriceText,
  getListingCapabilityPresentation,
  getListingPromotionBadges,
  getListingSellerRatingPresentation,
  listingAccessibilityLabel,
} from "./presentation";
import { getListingPromotionRefreshDelay } from "./use-listing-promotion-refresh";

describe("getListingPromotionBadges", () => {
  it("shows the compact label only while a promotion schedule is active", () => {
    const current = Date.now();
    const active = {
      state: "active" as const,
      type: "featured" as const,
      marketCode: "FR",
      source: "purchase" as const,
      sourceId: "promotion-proof",
      startsAt: new Date(current - 60_000).toISOString(),
      endsAt: new Date(current + 60_000).toISOString(),
    };

    expect(
      getListingPromotionBadges(
        {
          marketCode: "FR",
          isUrgent: false,
          isFeatured: false,
          promotion: active,
        },
        "Boosté",
      ),
    ).toEqual([{ label: "Boosté" }]);
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: false,
        promotion: {
          ...active,
          endsAt: new Date(current - 1).toISOString(),
        },
      }),
    ).toEqual([]);
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: false,
        promotion: { ...active, state: "scheduled" },
      }),
    ).toEqual([]);
    expect(
      getListingPromotionBadges({
        marketCode: "BE",
        isUrgent: false,
        isFeatured: false,
        promotion: active,
      }),
    ).toEqual([]);
  });

  it("never promotes a legacy boolean without resolved active state", () => {
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: true,
        isFeatured: true,
      }),
    ).toEqual([]);
  });

  it("fails closed when an otherwise active promotion has no provenance", () => {
    const current = Date.now();
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: true,
        promotion: {
          state: "active",
          type: "featured",
          marketCode: "FR",
          startsAt: new Date(current - 60_000).toISOString(),
          endsAt: new Date(current + 60_000).toISOString(),
        } as unknown as ListingCardView["promotion"],
      }),
    ).toEqual([]);
  });

  it("does not let ranking data revive an expired promotion", () => {
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: false,
        promotion: {
          state: "active",
          type: "featured",
          marketCode: "FR",
          source: "purchase",
          sourceId: "expired-promotion-proof",
          startsAt: "2020-01-01T00:00:00.000Z",
          endsAt: "2020-02-01T00:00:00.000Z",
        },
        discovery: {
          isSponsored: true,
          placementReason: "sponsored_relevant",
          rankingVersion: "test-v1",
        },
      }),
    ).toEqual([]);
  });

  it("does not treat standalone sponsored ranking data as promotion proof", () => {
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: true,
        discovery: {
          isSponsored: true,
          placementReason: "sponsored_relevant",
          rankingVersion: "test-v1",
        },
      }),
    ).toEqual([]);
  });
});

describe("compact card value presentation", () => {
  it("projects only explicit buyer-facing capabilities in a stable order", () => {
    const labels = {
      delivery: "Livraison",
      digitalFulfillment: "Accès numérique",
      negotiable: "Négociable",
      onlinePayment: "Paiement en ligne",
      verifiedSeller: "Vendeur vérifié",
    };

    expect(
      getListingCapabilityPresentation(
        {
          onlinePaymentAvailable: true,
          deliveryAvailable: true,
          fulfillmentTypes: ["PHYSICAL"],
          requiresPhysicalDelivery: true,
          isNegotiable: true,
          seller: {
            id: "seller",
            name: "Vendeur",
            sellerType: "individual",
            isIdentityVerified: true,
            isBusinessVerified: false,
          },
        },
        labels,
      ),
    ).toEqual([
      { icon: "shield", kind: "online_payment", label: "Paiement en ligne" },
      { icon: "truck", kind: "delivery", label: "Livraison" },
      { icon: "tag", kind: "negotiable", label: "Négociable" },
      {
        icon: "verified",
        kind: "verified_seller",
        label: "Vendeur vérifié",
      },
    ]);

    expect(
      getListingCapabilityPresentation(
        {
          onlinePaymentAvailable: false,
          deliveryAvailable: false,
          fulfillmentTypes: ["PHYSICAL"],
          requiresPhysicalDelivery: true,
          isNegotiable: false,
          seller: undefined,
        },
        labels,
      ),
    ).toEqual([]);
  });

  it("requires an explicit non-physical fulfillment method for digital access", () => {
    const labels = {
      delivery: "Livraison",
      digitalFulfillment: "Accès numérique",
      negotiable: "Négociable",
      onlinePayment: "Paiement en ligne",
      verifiedSeller: "Vendeur vérifié",
    };

    expect(
      getListingCapabilityPresentation(
        {
          requiresPhysicalDelivery: false,
          fulfillmentTypes: ["FILE_DOWNLOAD"],
        },
        labels,
      ),
    ).toEqual([
      {
        icon: "file",
        kind: "digital_fulfillment",
        label: "Accès numérique",
      },
    ]);
    expect(
      getListingCapabilityPresentation(
        { requiresPhysicalDelivery: false },
        labels,
      ),
    ).toEqual([]);
  });

  it("uses semantic price states shared by cards and map markers", () => {
    const labels = { free: "Gratuit", onRequest: "Prix sur demande" };
    expect(
      getListingCardPriceText({ priceKind: "on_request" }, "fr-FR", labels),
    ).toBe("Prix sur demande");
    expect(
      getListingCardPriceText({ priceKind: "unpriced" }, "fr-FR", labels),
    ).toBeUndefined();
    expect(
      getListingCardPriceText(
        {
          priceKind: "amount",
          price: { amountMinor: 25_000, currency: "EUR" },
        },
        "fr-FR",
        labels,
      ),
    ).toBe("250 €");
  });

  it("compacts only the visual review count and retains the full accessible count", () => {
    expect(
      getListingSellerRatingPresentation(4.8, 1_234, "fr-FR"),
    ).toMatchObject({ reviewCount: "1 234", visualReviewCount: "1 234" });
    const long = getListingSellerRatingPresentation(4.8, 12_345_678, "fr-FR");
    expect(long?.reviewCount).toBe("12 345 678");
    expect(long?.visualReviewCount).not.toBe(long?.reviewCount);
  });
});

describe("listingAccessibilityLabel", () => {
  it("includes the localized seller rating summary when it is real", () => {
    expect(
      listingAccessibilityLabel(
        {
          id: "listing-accessible",
          title: "Canapé trois places",
          price: { amountMinor: 25_000, currency: "EUR" },
          priceKind: "amount",
          city: "Lyon",
          marketCode: "FR",
          categoryLabel: "Maison",
          conditionLabel: "Bon état",
          characteristics: [],
          publishedAt: "2026-09-01T10:00:00.000Z",
          isUrgent: false,
          isFeatured: false,
        },
        "250 €",
        "Note 4,8 sur 5, 32 avis",
      ),
    ).toContain("Note 4,8 sur 5, 32 avis");
  });

  it("announces paid prominence and professional status", () => {
    const label = listingAccessibilityLabel(
      {
        id: "listing-promoted-accessible",
        title: "Canapé trois places",
        price: { amountMinor: 25_000, currency: "EUR" },
        priceKind: "amount",
        city: "Lyon",
        marketCode: "FR",
        categoryLabel: "Maison",
        conditionLabel: "Bon état",
        characteristics: [],
        isUrgent: false,
        isFeatured: false,
        publisherType: "professional",
      },
      "250 €",
      undefined,
      "Boosté",
      "Pro",
      "Aujourd’hui",
      ["Paiement en ligne", "Livraison"],
    );

    expect(label).toContain("Boosté");
    expect(label).toContain("Pro");
    expect(label).toContain("Aujourd’hui");
    expect(label).toContain("Paiement en ligne");
    expect(label).toContain("Livraison");
  });
});

describe("getListingPromotionRefreshDelay", () => {
  it("schedules a refresh at the next active promotion boundary", () => {
    const now = Date.parse("2026-09-06T10:00:00.000Z");
    expect(
      getListingPromotionRefreshDelay(
        {
          state: "active",
          type: "featured",
          marketCode: "FR",
          source: "purchase",
          sourceId: "promotion-proof",
          startsAt: "2026-09-06T09:00:00.000Z",
          endsAt: "2026-09-06T10:00:01.000Z",
        },
        now,
      ),
    ).toBe(1_001);
  });

  it("does not schedule unproven promotion data", () => {
    expect(
      getListingPromotionRefreshDelay({
        state: "active",
        type: "featured",
        marketCode: "FR",
        startsAt: "2026-09-06T09:00:00.000Z",
        endsAt: "2026-09-06T11:00:00.000Z",
      } as unknown as ListingCardView["promotion"]),
    ).toBeUndefined();
  });
});
