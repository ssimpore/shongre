/**
 * SHONGRE LISTING DETAIL & DISPLAY AUTOMATED TEST SUITE
 * Exhaustively tests summary attributes derivation across all listing families,
 * grouped technical characteristics, absence of irrelevant fields, action resolution,
 * owner vs buyer views, and SEO structured data.
 */

import { describe, it, expect } from "vitest";
import { listingDisplayResolver } from "./listing.display";
import { listingActionsResolver } from "./listing.actions";
import { Listing, UserProfile } from "../../types";
import { transactionCapabilitiesService } from "../transaction/transaction.capabilities";

describe("Listing Detail Display & Action Resolvers", () => {
  // =========================================================================
  // 1. SUMMARY ATTRIBUTES DERIVATION ACROSS TAXONOMY FAMILIES
  // =========================================================================
  describe("Summary Attributes Resolver", () => {
    it("resolves vehicle summary attributes (Year, Mileage, Fuel, Transmission, CritAir)", () => {
      const vehicleListing: Partial<Listing> = {
        id: "list-car-1",
        title: "Renault Mégane E-Tech EV60",
        price: 28900,
        categorySlug: "vehicules",
        subCategorySlug: "vehicles.cars",
        condition: "very_good",
        attributes: {
          year: 2024,
          mileage: 24000,
          fuel: "electrique",
          gearbox: "automatique",
          critair: "0",
        },
      };

      const summary = listingDisplayResolver.resolveSummaryAttributes(
        vehicleListing as Listing,
      );
      expect(summary).toContain("2024");
      expect(summary).toContain("24 000 km");
      expect(summary).toContain("100% Électrique");
      expect(summary).toContain("Automatique");
      expect(summary).toContain("Crit'Air 0");
    });

    it("resolves real estate summary attributes (Property type, Surface, Rooms, Bedrooms, DPE)", () => {
      const realEstateListing: Partial<Listing> = {
        id: "list-re-1",
        title: "Appartement T3 lumineux Lyon 6e",
        price: 345000,
        categorySlug: "immobilier",
        subCategorySlug: "real_estate.sales",
        attributes: {
          property_type: "appartement",
          surface: 68,
          rooms: 3,
          bedrooms: 2,
          energy_class: "b",
        },
      };

      const summary = listingDisplayResolver.resolveSummaryAttributes(
        realEstateListing as Listing,
      );
      expect(summary).toContain("Appartement");
      expect(summary).toContain("68 m²");
      expect(summary).toContain("3 pièces");
      expect(summary).toContain("2 ch.");
      expect(summary).toContain("DPE B");
    });

    it("resolves smartphone summary attributes (Storage, Color, Condition)", () => {
      const phoneListing: Partial<Listing> = {
        id: "list-phone-1",
        title: "iPhone 15 Pro 256 Go Titane",
        price: 890,
        categorySlug: "multimedia",
        subCategorySlug: "electronics.telephony.smartphones",
        condition: "very_good",
        attributes: {
          storage_capacity: 256,
          color: "gris",
        },
      };

      const summary = listingDisplayResolver.resolveSummaryAttributes(
        phoneListing as Listing,
      );
      expect(summary).toContain("256 Go");
      expect(summary).toContain("Gris / Argent");
      expect(summary).toContain("Très bon état");
    });

    it("resolves furniture summary attributes (Material, Dimensions, Condition)", () => {
      const furnitureListing: Partial<Listing> = {
        id: "list-furn-1",
        title: "Table à manger scandinave teck",
        price: 450,
        categorySlug: "maison-deco",
        subCategorySlug: "home_garden.furniture.tables",
        condition: "very_good",
        attributes: {
          material: "bois_massif",
          dimensions: "160 × 90 cm",
        },
      };

      const summary = listingDisplayResolver.resolveSummaryAttributes(
        furnitureListing as Listing,
      );
      expect(summary).toContain("Bois massif");
      expect(summary).toContain("160 × 90 cm");
      expect(summary).toContain("Très bon état");
    });
  });

  // =========================================================================
  // 2. GROUPED CHARACTERISTICS & ABSENCE OF IRRELEVANT DATA
  // =========================================================================
  describe("Grouped Characteristics Resolver", () => {
    it("groups vehicle technical specifications and ignores absent attributes", () => {
      const vehicleListing: Partial<Listing> = {
        id: "list-car-1",
        subCategorySlug: "vehicles.cars",
        condition: "very_good",
        attributes: {
          year: 2024,
          mileage: 24000,
          fuel: "electrique",
          gearbox: "automatique",
          doors: 5,
          battery_capacity: 60,
        },
      };

      const groups = listingDisplayResolver.resolveGroupedCharacteristics(
        vehicleListing as Listing,
      );
      expect(groups.length).toBeGreaterThanOrEqual(2);

      const allItems = groups.flatMap((g) => g.items);
      expect(
        allItems.some((i) => i.code === "mileage" && i.value === "24 000 km"),
      ).toBe(true);
      expect(
        allItems.some(
          (i) => i.code === "fuel" && i.value === "100% Électrique",
        ),
      ).toBe(true);

      // Verify no empty/absent attributes are returned
      groups.forEach((g) => {
        g.items.forEach((item) => {
          expect(item.value).not.toBe("");
          expect(item.value).not.toBe("—");
          expect(item.value).not.toBe("undefined");
        });
      });
    });

    it("does NOT include vehicle engine specs on real estate listings", () => {
      const reListing: Partial<Listing> = {
        id: "list-re-1",
        subCategorySlug: "real_estate.sales",
        attributes: {
          surface: 75,
          rooms: 3,
        },
      };

      const groups = listingDisplayResolver.resolveGroupedCharacteristics(
        reListing as Listing,
      );
      const engineGroup = groups.find((g) => g.groupKey === "engine");
      expect(engineGroup).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. OWNER VS BUYER ACTIONS RESOLUTION
  // =========================================================================
  describe("Listing Actions Resolver", () => {
    const mockSeller = {
      id: "seller-alice",
      name: "Alice Dupont",
      email: "alice@example.com",
      role: "individual_seller",
      status: "active",
      isVerified: true,
      city: "Paris",
      postalCode: "75011",
      rating: 5.0,
      reviewCount: 10,
      responseTimeText: "en 1h",
      responseRatePercent: 100,
      createdAt: new Date().toISOString(),
    } as any as UserProfile;

    const mockBuyer = {
      id: "buyer-thomas",
      name: "Thomas Laurent",
      email: "thomas@example.com",
      role: "individual_buyer",
      status: "active",
      isVerified: true,
      city: "Lyon",
      postalCode: "69002",
      rating: 4.9,
      reviewCount: 5,
      responseTimeText: "en 1h",
      responseRatePercent: 100,
      createdAt: new Date().toISOString(),
    } as any as UserProfile;

    const activeDirectListing = {
      id: "list-active-1",
      title: "Canapé scandinave beige",
      description: "Superbe état",
      price: 250,
      isNegotiable: true,
      isFreeDonation: false,
      categorySlug: "maison-deco",
      subCategorySlug: "home_garden.furniture.sofas",
      categoryLabel: "Maison",
      subCategoryLabel: "Canapés",
      condition: "very_good",
      sellerId: "seller-alice",
      sellerName: "Alice Dupont",
      sellerType: "individual",
      city: "Paris",
      postalCode: "75011",
      coverImageUrl: "https://images.unsplash.com/test.jpg",
      photos: [
        {
          id: "p1",
          url: "https://images.unsplash.com/test.jpg",
          isCover: true,
        },
      ],
      deliveryOptions: [{ type: "hand_delivery", available: true }],
      isOnlinePaymentAvailable: true,
      isReservable: true,
      attributes: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewsCount: 10,
      favoritesCount: 2,
      contactCount: 1,
    } as any as Listing;

    it("provides owner actions and disables commerce actions when seller views own listing", () => {
      const caps = transactionCapabilitiesService.resolve({
        taxonomyNodeId: activeDirectListing.subCategorySlug,
        price: activeDirectListing.price,
      });

      const actions = listingActionsResolver.resolve({
        listing: activeDirectListing,
        viewer: mockSeller, // Seller viewing own listing
        seller: mockSeller,
        transactionCapabilities: caps,
      });

      expect(actions.isOwner).toBe(true);
      expect(actions.ownerActions).toContain("edit");
      expect(actions.ownerActions).toContain("manage");
      expect(actions.canDirectPurchase).toBe(false);
      expect(actions.canReserve).toBe(false);
      expect(actions.canContact).toBe(false);
    });

    it("provides direct purchase and reservation for buyer viewing active listing", () => {
      const caps = transactionCapabilitiesService.resolve({
        taxonomyNodeId: activeDirectListing.subCategorySlug,
        price: activeDirectListing.price,
      });

      const actions = listingActionsResolver.resolve({
        listing: activeDirectListing,
        viewer: mockBuyer, // Buyer viewing listing
        seller: mockSeller,
        transactionCapabilities: caps,
      });

      expect(actions.isOwner).toBe(false);
      expect(actions.primaryAction).toBe("direct_purchase");
      expect(actions.canDirectPurchase).toBe(true);
      expect(actions.canReserve).toBe(true);
      expect(actions.canContact).toBe(true);
      expect(actions.canMakeOffer).toBe(true);
      expect(actions.statusNotice).toBeNull();
    });

    it("disables purchase and shows status notice when listing is reserved", () => {
      const reservedListing: Listing = {
        ...activeDirectListing,
        status: "reserved",
      };

      const caps = transactionCapabilitiesService.resolve({
        taxonomyNodeId: reservedListing.subCategorySlug,
        price: reservedListing.price,
      });

      const actions = listingActionsResolver.resolve({
        listing: reservedListing,
        viewer: mockBuyer,
        seller: mockSeller,
        transactionCapabilities: caps,
      });

      expect(actions.canDirectPurchase).toBe(false);
      expect(actions.canReserve).toBe(false);
      expect(actions.statusNotice).not.toBeNull();
      expect(actions.statusNotice?.type).toBe("reserved");
    });

    it("disables purchase and shows status notice when listing is sold", () => {
      const soldListing: Listing = {
        ...activeDirectListing,
        status: "sold",
      };

      const caps = transactionCapabilitiesService.resolve({
        taxonomyNodeId: soldListing.subCategorySlug,
        price: soldListing.price,
      });

      const actions = listingActionsResolver.resolve({
        listing: soldListing,
        viewer: mockBuyer,
        seller: mockSeller,
        transactionCapabilities: caps,
      });

      expect(actions.canDirectPurchase).toBe(false);
      expect(actions.canReserve).toBe(false);
      expect(actions.statusNotice).not.toBeNull();
      expect(actions.statusNotice?.type).toBe("sold");
    });
  });

  // =========================================================================
  // 4. SEO & STRUCTURED DATA (JSON-LD) GENERATION
  // =========================================================================
  describe("SEO & Structured Data", () => {
    it("generates valid Schema.org Product structured data", () => {
      const sampleListing = {
        id: "list-seo-1",
        title: "Vélo Gravel Trek Checkpoint ALR 5",
        description: "Excellent vélo gravel en taille 54.",
        price: 1850,
        isNegotiable: false,
        isFreeDonation: false,
        categorySlug: "sports-hobbies",
        subCategorySlug: "sports_leisure.cycling.gravel",
        categoryLabel: "Sports",
        subCategoryLabel: "Vélos Gravel",
        condition: "very_good",
        sellerId: "user-thomas",
        sellerName: "Thomas Laurent",
        sellerType: "individual",
        city: "Lyon",
        postalCode: "69002",
        coverImageUrl: "https://images.unsplash.com/gravel.jpg",
        photos: [
          {
            id: "p1",
            url: "https://images.unsplash.com/gravel.jpg",
            isCover: true,
          },
        ],
        deliveryOptions: [{ type: "hand_delivery", available: true }],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewsCount: 40,
        favoritesCount: 8,
        contactCount: 3,
      } as any as Listing;

      const jsonLd =
        listingDisplayResolver.generateListingStructuredData(sampleListing);
      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Product");
      expect(jsonLd.name).toBe("Vélo Gravel Trek Checkpoint ALR 5");
      expect(jsonLd.offers.price).toBe(1850);
      expect(jsonLd.offers.priceCurrency).toBe("EUR");
      expect(jsonLd.offers.availability).toBe("https://schema.org/InStock");
    });
  });
});
