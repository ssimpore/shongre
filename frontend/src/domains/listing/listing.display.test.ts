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
    it("uses the v4 vehicle card projection and preserves full details", () => {
      const vehicleListing: Partial<Listing> = {
        id: "list-car-1",
        title: "Renault Mégane E-Tech EV60",
        price: 28900,
        categorySlug: "vehicules",
        subCategorySlug: "vehicles.cars.suv",
        condition: "very_good",
        attributes: {
          brand: "renault",
          first_registration_date: "2024-01-01",
          mileage: 24000,
          fuel_type: "electric",
          transmission: "automatic",
          critair_class: "electric",
        },
      };

      const listing = vehicleListing as Listing;
      const summary = listingDisplayResolver.resolveSummaryAttributes(listing);
      const detailItems = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(summary).toEqual([
        "Renault",
        "24 000 km",
        "Électrique",
        "Automatique",
      ]);
      expect(detailItems.find((item) => item.code === "mileage")?.value).toBe(
        "24 000 km",
      );
      expect(detailItems.find((item) => item.code === "fuel_type")?.value).toBe(
        "Électrique",
      );
      expect(
        detailItems.find((item) => item.code === "transmission")?.value,
      ).toBe("Automatique");
      expect(
        detailItems.find((item) => item.code === "critair_class")?.value,
      ).toBe("Électrique / 0");
    });

    it("uses the v4 real-estate card projection and preserves full details", () => {
      const realEstateListing: Partial<Listing> = {
        id: "list-re-1",
        title: "Appartement T3 lumineux Lyon 6e",
        price: 345000,
        categorySlug: "immobilier",
        subCategorySlug: "real_estate.sales.apartments",
        attributes: {
          property_type: "apartment",
          living_area: 68,
          rooms: 3,
          bedrooms: 2,
          dpe_class: "B",
        },
      };

      const listing = realEstateListing as Listing;
      const summary = listingDisplayResolver.resolveSummaryAttributes(listing);
      const detailItems = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(summary).toEqual(["Appartement", "68 m²", "3 pièces", "B", "2"]);
      expect(
        detailItems.find((item) => item.code === "living_area")?.value,
      ).toBe("68 m²");
      expect(detailItems.find((item) => item.code === "rooms")?.value).toBe(
        "3 pièces",
      );
      expect(detailItems.find((item) => item.code === "bedrooms")?.value).toBe(
        "2",
      );
      expect(detailItems.find((item) => item.code === "dpe_class")?.value).toBe(
        "B",
      );
    });

    it("keeps smartphone cards concise while preserving v4 details", () => {
      const phoneListing: Partial<Listing> = {
        id: "list-phone-1",
        title: "iPhone 15 Pro 256 Go Titane",
        price: 890,
        categorySlug: "electronique",
        subCategorySlug: "electronics.smartphones.phones",
        condition: "very_good",
        attributes: {
          storage_capacity_gb: 256,
          color: "grey",
        },
      };

      const listing = phoneListing as Listing;
      const summary = listingDisplayResolver.resolveSummaryAttributes(listing);
      const detailItems = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(summary).toEqual(["256 GB", "Très bon état"]);
      expect(
        detailItems.find((item) => item.code === "storage_capacity_gb")?.value,
      ).toBe("256 GB");
      expect(detailItems.find((item) => item.code === "color")?.value).toBe(
        "Gris",
      );
    });

    it("keeps furniture cards concise while preserving v4 details", () => {
      const furnitureListing: Partial<Listing> = {
        id: "list-furn-1",
        title: "Table à manger scandinave teck",
        price: 450,
        categorySlug: "maison-deco",
        subCategorySlug: "home_garden.furniture.tables",
        condition: "very_good",
        attributes: {
          material: "wood",
          dimensions_width: 160,
          dimensions_length: 90,
        },
      };

      const listing = furnitureListing as Listing;
      const summary = listingDisplayResolver.resolveSummaryAttributes(listing);
      const detailItems = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(summary).toEqual(["Très bon état"]);
      expect(detailItems.find((item) => item.code === "material")?.value).toBe(
        "Bois",
      );
      expect(
        detailItems.find((item) => item.code === "dimensions_width")?.value,
      ).toBe("160 cm");
      expect(
        detailItems.find((item) => item.code === "dimensions_length")?.value,
      ).toBe("90 cm");
    });

    it("keeps employment cards essential while preserving full detail values", () => {
      const employmentListing: Partial<Listing> = {
        id: "list-job-1",
        title: "Développeur·se front-end React",
        categorySlug: "emploi",
        subCategorySlug: "jobs.offers.it_data",
        condition: "not_applicable",
        attributes: {
          contract_type: "permanent",
          job_sector: "it_data",
          remote_work: "hybrid",
        },
      };

      const listing = employmentListing as Listing;
      const summary = listingDisplayResolver.resolveSummaryAttributes(listing);
      const detailItems = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(summary).toEqual(["CDI", "Hybride"]);
      expect(
        detailItems.find((item) => item.code === "job_sector")?.value,
      ).toBe("Informatique, Data & IA");
      expect(
        detailItems.find((item) => item.code === "contract_type")?.value,
      ).toBe("CDI");
      expect(
        detailItems.find((item) => item.code === "remote_work")?.value,
      ).toBe("Hybride");
    });

    it("humanizes unregistered imported attributes on detail pages", () => {
      const listing = {
        id: "list-imported-1",
        subCategorySlug: "velos",
        attributes: {
          bikeType: "gravel",
          frameSize: "m",
          serviceType: "musique",
        },
      } as unknown as Listing;

      const items = listingDisplayResolver
        .resolveGroupedCharacteristics(listing)
        .flatMap((group) => group.items);

      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "bikeType",
            label: "Type de vélo",
            value: "Gravel",
          }),
          expect.objectContaining({
            code: "frameSize",
            label: "Taille du cadre",
            value: "M",
          }),
          expect.objectContaining({
            code: "serviceType",
            label: "Type de service",
            value: "Musique",
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // 2. GROUPED CHARACTERISTICS & ABSENCE OF IRRELEVANT DATA
  // =========================================================================
  describe("Grouped Characteristics Resolver", () => {
    it("groups vehicle technical specifications and ignores absent attributes", () => {
      const vehicleListing: Partial<Listing> = {
        id: "list-car-1",
        subCategorySlug: "vehicles.cars.suv",
        condition: "very_good",
        attributes: {
          first_registration_date: "2024-01-01",
          mileage: 24000,
          fuel_type: "electric",
          transmission: "automatic",
          doors: "5",
          battery_capacity_kwh: 60,
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
          (i) => i.code === "fuel_type" && i.value === "Électrique",
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
        subCategorySlug: "real_estate.sales.apartments",
        attributes: {
          living_area: 75,
          rooms: "3",
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

    it("keeps an exchange taxonomy contact-led even when commerce is available", () => {
      const caps = transactionCapabilitiesService.resolve({
        taxonomyNodeId: activeDirectListing.subCategorySlug,
        price: activeDirectListing.price,
      });

      const actions = listingActionsResolver.resolve({
        listing: activeDirectListing,
        viewer: mockBuyer,
        seller: mockSeller,
        transactionCapabilities: caps,
        taxonomyPrimaryCta: "propose_exchange",
      });

      expect(actions.primaryAction).toBe("contact");
      expect(actions.canContact).toBe(true);
      expect(actions.canMakeOffer).toBe(false);
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
