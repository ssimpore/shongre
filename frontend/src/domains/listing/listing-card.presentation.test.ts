import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VehiclePublic } from "@shongre/contracts/auto";
import type { JobPostingCard } from "@shongre/contracts/employment";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import { DETERMINISTIC_DEMO_CURRENCY_CATALOG } from "@shongre/contracts";
import { convertMoney } from "@shongre/shared";
import {
  presentEmploymentListingCard,
  presentPropertyListingCard,
  presentVehicleListingCard,
} from "./listing-card.presentation";

describe("structured category listing-card presentation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("projects real property price, seller and promotion data", () => {
    const property = {
      id: "property-1",
      taxonomy: {
        rootLabels: { "fr-FR": "Immobilier" },
        cardCharacteristics: [
          {
            code: "living_area",
            labels: { "fr-FR": "Surface publiée" },
            values: { "fr-FR": "68 m²" },
          },
          {
            code: "rooms",
            labels: { "fr-FR": "Pièces publiées" },
            values: { "fr-FR": "3" },
          },
        ],
      },
      title: "Appartement lumineux",
      propertyType: "apartment",
      financials: {
        price: { amountMinor: 129_000, currency: "EUR" },
        period: "month",
        isNegotiable: false,
      },
      characteristics: {
        condition: "good",
        livingAreaSquareMeters: 68,
        rooms: 3,
      },
      address: {
        publicLabel: "Lyon 7e · Jean Macé",
        city: "Lyon",
        countryCode: "FR",
      },
      media: { photos: ["https://example.test/property.jpg"] },
      seller: {
        id: "agency",
        displayName: "Agence Canopée",
        type: "agency",
        verificationLabels: ["Entreprise vérifiée"],
        rating: 4.9,
        reviewCount: 28,
      },
      promotion: {
        urgent: false,
        featured: true,
        sponsored: true,
        bumpedAt: "2026-08-20T10:00:00Z",
        endsAt: "2027-08-20T10:00:00Z",
      },
      resolvedPromotion: {
        state: "active",
        type: "sponsored_search",
        marketCode: "FR",
        source: "purchase",
        sourceId: "property-promotion",
        startsAt: "2026-08-20T10:00:00Z",
        endsAt: "2027-08-20T10:00:00Z",
      },
      publishedAt: "2026-08-20T10:00:00Z",
      sortDate: "2026-08-20T10:00:00Z",
    } as unknown as PropertyPublic;

    const card = presentPropertyListingCard(property, "fr-FR", "FR");

    expect(card.priceLabel).toContain("/ mois");
    expect(card.categoryLabel).toBe("Immobilier");
    expect(card.characteristics).toEqual([
      "Surface publiée : 68 m²",
      "Pièces publiées : 3",
    ]);
    expect(card.characteristicIcons).toEqual(["tag", "tag"]);
    expect(card.seller?.sellerType).toBe("pro");
    expect(card.seller?.rating).toBe(4.9);
    expect(card.seller?.reviewCount).toBe(28);
    expect(card.promotion).toMatchObject({
      state: "active",
      type: "sponsored_search",
    });
  });

  it("does not invent unavailable property seller data", () => {
    const property = {
      id: "land-1",
      title: "Terrain",
      propertyType: "land",
      financials: {
        price: { amountMinor: 80_000_00, currency: "EUR" },
        period: "total",
        isNegotiable: true,
      },
      characteristics: {
        condition: "good",
        livingAreaSquareMeters: 0,
        rooms: 0,
      },
      address: {
        publicLabel: "Écully",
        city: "Écully",
        countryCode: "FR",
      },
      media: { photos: [] },
      seller: {
        id: "owner",
        displayName: "Marie",
        type: "owner",
        verificationLabels: [],
      },
      promotion: { urgent: false, featured: false, sponsored: false },
      sortDate: "2026-08-20T10:00:00Z",
    } as unknown as PropertyPublic;

    const card = presentPropertyListingCard(property, "fr-FR", "FR");
    expect(card.characteristics).toEqual([]);
    expect(card.seller?.rating).toBeUndefined();
    expect(card.seller?.reviewCount).toBeUndefined();
    expect(card.publishedAt).toBeUndefined();
  });

  it("projects a listing into the selected currency without changing its source money", () => {
    const sourcePrice = { amountMinor: 129_000, currency: "EUR" };
    const property = {
      id: "property-converted",
      title: "Studio",
      propertyType: "apartment",
      financials: {
        price: sourcePrice,
        period: "month",
        isNegotiable: false,
      },
      characteristics: {
        condition: "good",
        livingAreaSquareMeters: 24,
        rooms: 1,
      },
      address: {
        publicLabel: "Bruxelles",
        city: "Bruxelles",
        countryCode: "BE",
      },
      media: { photos: [] },
      seller: {
        id: "owner",
        displayName: "Marie",
        type: "owner",
        verificationLabels: [],
      },
      promotion: { urgent: false, featured: false, sponsored: false },
      sortDate: "2026-08-20T10:00:00Z",
    } as unknown as PropertyPublic;

    const card = presentPropertyListingCard(property, "fr-BE", "BE", (money) =>
      convertMoney(
        money,
        "CHF",
        DETERMINISTIC_DEMO_CURRENCY_CATALOG,
        new Date("2026-09-02T00:00:00.000Z"),
      ),
    );

    expect(card.price).toEqual({ amountMinor: 121_260, currency: "CHF" });
    expect(card.priceLabel).toMatch(/^≈/);
    expect(card.priceLabel).toContain("CHF");
    expect(sourcePrice).toEqual({ amountMinor: 129_000, currency: "EUR" });
  });

  it("projects buyer decision facts for the vehicle universe", () => {
    const vehicle = {
      id: "vehicle-1",
      taxonomy: {
        rootLabels: { "fr-FR": "Véhicules", "en-US": "Vehicles" },
        cardCharacteristics: [
          {
            code: "brand",
            icon: "car",
            labels: { "fr-FR": "Marque" },
            values: { "fr-FR": "Peugeot" },
          },
          {
            code: "model_year",
            labels: { "fr-FR": "Année" },
            values: { "fr-FR": "2022" },
          },
          {
            code: "mileage",
            labels: { "fr-FR": "Distance" },
            values: { "fr-FR": "42 000 km" },
          },
          {
            code: "fuel_type",
            labels: { "fr-FR": "Énergie publiée" },
            values: { "fr-FR": "Hybride" },
          },
        ],
      },
      title: "Peugeot 3008",
      makeLabel: "Peugeot",
      price: { amountMinor: 2_490_000, currency: "EUR" },
      technical: {
        modelYear: 2022,
        mileage: 42_000,
        mileageUnit: "km",
        fuelType: "hybrid",
      },
      history: { condition: "excellent" },
      locationLabel: "Lyon",
      marketCodes: ["FR"],
      seller: {
        id: "dealer",
        displayName: "Auto Shongre",
        type: "dealer",
        locationLabel: "Lyon",
        responseTimeMinutes: 42,
        rating: 4.8,
        reviewCount: 64,
        verifiedBusiness: true,
      },
      trust: { sellerIdentity: "verified" },
      mediaUrls: ["https://example.test/vehicle.jpg"],
      promotionLabels: ["urgent"],
      resolvedPromotion: {
        state: "active",
        type: "urgent_badge",
        marketCode: "FR",
        source: "purchase",
        sourceId: "vehicle-promotion",
        startsAt: "2026-09-01T10:00:00Z",
        endsAt: "2026-09-30T10:00:00Z",
      },
      publishedAt: "2026-08-20T10:00:00Z",
      priceNegotiable: true,
    } as unknown as VehiclePublic;

    const card = presentVehicleListingCard(vehicle, "fr-FR", "FR");
    expect(card.categoryLabel).toBe("Véhicules");
    expect(
      card.characteristics.map((value) => value.replace(/\s/gu, " ")),
    ).toEqual([
      "Année : 2022",
      "Distance : 42 000 km",
      "Énergie publiée : Hybride",
    ]);
    expect(card.characteristicIcons).toEqual(["tag", "tag", "tag"]);
    expect(card.brandLabel).toBe("Peugeot");
    expect(card.seller?.rating).toBe(4.8);
    expect(card.seller?.reviewCount).toBe(64);
    expect(card.seller?.responseTimeLabel).toBe("Répond en 42 min");
    expect(card.isUrgent).toBe(true);
    expect(card.promotion).toMatchObject({
      state: "active",
      type: "urgent_badge",
    });
    expect(
      presentVehicleListingCard(vehicle, "en-US", "FR").categoryLabel,
    ).toBe("Vehicles");
  });

  it("presents the real job salary range and employer reputation", () => {
    const job = {
      id: "job-1",
      taxonomy: { rootLabels: { "fr-FR": "Emploi" } },
      title: "Développeur front-end",
      employer: {
        id: "employer",
        organizationId: "organization-studio-canopee",
        name: "Studio Canopée",
        rating: 4.7,
        reviewCount: 18,
        isPubliclyVerified: true,
      },
      contractTypeLabel: "CDI",
      workingArrangementLabel: "Hybride",
      professionLabel: "Développement Web",
      primaryLocation: { label: "Lyon 2e", city: "Lyon" },
      salary: {
        isPublic: true,
        minimum: { amountMinor: 4_000_00, currency: "EUR" },
        maximum: { amountMinor: 5_000_00, currency: "EUR" },
        frequencyId: "salary.month",
      },
      publishedAt: "2026-08-20T10:00:00Z",
      isUrgent: false,
      isFeatured: false,
      isSponsored: true,
      resolvedPromotion: {
        state: "active",
        type: "sponsored_search",
        marketCode: "FR",
        source: "subscription_credit",
        sourceId: "job-promotion",
        startsAt: "2026-09-01T10:00:00Z",
        endsAt: "2026-09-30T10:00:00Z",
      },
    } as unknown as JobPostingCard;

    const card = presentEmploymentListingCard(
      job,
      {
        dictionaries: [{ id: "salary.month", label: "Par mois" }],
      } as never,
      "fr-FR",
      "FR",
    );
    expect(card.priceLabel?.replace(/\s/gu, " ")).toContain(
      "4 000 € – 5 000 €",
    );
    expect(card.priceLabel).toContain("par mois");
    expect(card.categoryLabel).toBe("Emploi");
    expect(card.characteristics).toEqual([
      "CDI",
      "Hybride",
      "Développement Web",
    ]);
    expect(card.characteristicIcons).toEqual([
      "briefcase",
      "laptop",
      "briefcase",
    ]);
    expect(card.seller?.sellerType).toBe("pro");
    expect(card.seller?.rating).toBe(4.7);
    expect(card.seller?.reviewCount).toBe(18);
    expect(card.promotion).toMatchObject({
      state: "active",
      type: "sponsored_search",
    });

    const unpriced = presentEmploymentListingCard(
      { ...job, salary: undefined } as JobPostingCard,
      null,
      "fr-FR",
      "FR",
    );
    expect(unpriced.priceKind).toBe("unpriced");
    expect(unpriced.price).toBeUndefined();

    const individualEmployer = presentEmploymentListingCard(
      {
        ...job,
        employer: { ...job.employer, organizationId: undefined },
      } as JobPostingCard,
      null,
      "fr-FR",
      "FR",
    );
    expect(individualEmployer.seller?.sellerType).toBe("individual");

    expect(
      presentEmploymentListingCard(job, null, "en-US", "FR").priceLabel,
    ).toContain("per month");
  });

  it.each([
    [
      "inactive state",
      {
        state: "inactive",
        type: "featured",
        marketCode: "FR",
        source: "purchase",
        sourceId: "inactive-promotion",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-09-30T00:00:00.000Z",
      },
    ],
    [
      "expired schedule",
      {
        state: "active",
        type: "featured",
        marketCode: "FR",
        source: "purchase",
        sourceId: "expired-promotion",
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    [
      "market mismatch",
      {
        state: "active",
        type: "featured",
        marketCode: "BE",
        source: "purchase",
        sourceId: "wrong-market-promotion",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-09-30T00:00:00.000Z",
      },
    ],
  ] as const)("rejects a %s promotion projection", (_label, promotion) => {
    const vehicle = {
      id: "vehicle-promotion",
      title: "Véhicule de test",
      makeLabel: "Peugeot",
      price: { amountMinor: 2_490_000, currency: "EUR" },
      locationLabel: "Lyon",
      marketCodes: ["FR"],
      seller: {
        id: "dealer",
        displayName: "Auto Shongre",
        type: "dealer",
        locationLabel: "Lyon",
        verifiedBusiness: true,
      },
      trust: { sellerIdentity: "verified" },
      mediaUrls: [],
      promotionLabels: ["featured"],
      resolvedPromotion: promotion,
      publishedAt: "2026-08-20T10:00:00Z",
    } as unknown as VehiclePublic;

    const card = presentVehicleListingCard(vehicle, "fr-FR", "FR");
    expect(card.promotion).toBeUndefined();
    expect(card.isFeatured).toBe(false);
  });

  it("rejects an active promotion without authoritative provenance", () => {
    const vehicle = {
      id: "vehicle-unproven-promotion",
      title: "Véhicule de test",
      makeLabel: "Peugeot",
      price: { amountMinor: 2_490_000, currency: "EUR" },
      locationLabel: "Lyon",
      marketCodes: ["FR"],
      seller: {
        id: "dealer",
        displayName: "Auto Shongre",
        type: "dealer",
        locationLabel: "Lyon",
        verifiedBusiness: true,
      },
      trust: { sellerIdentity: "verified" },
      mediaUrls: [],
      promotionLabels: ["featured"],
      resolvedPromotion: {
        state: "active",
        type: "featured",
        marketCode: "FR",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-09-30T00:00:00.000Z",
      },
      publishedAt: "2026-08-20T10:00:00Z",
    } as unknown as VehiclePublic;

    expect(
      presentVehicleListingCard(vehicle, "fr-FR", "FR").promotion,
    ).toBeUndefined();
  });

  it("never derives a card promotion from structured legacy flags alone", () => {
    const vehicle = {
      id: "vehicle-legacy-promotion",
      title: "Véhicule de test",
      makeLabel: "Peugeot",
      price: { amountMinor: 2_490_000, currency: "EUR" },
      locationLabel: "Lyon",
      marketCodes: ["FR"],
      seller: {
        id: "dealer",
        displayName: "Auto Shongre",
        type: "dealer",
        locationLabel: "Lyon",
        verifiedBusiness: true,
      },
      trust: { sellerIdentity: "verified" },
      mediaUrls: [],
      promotionLabels: ["urgent", "featured"],
      publishedAt: "2026-08-20T10:00:00Z",
    } as unknown as VehiclePublic;

    const card = presentVehicleListingCard(vehicle, "fr-FR", "FR");
    expect(card.promotion).toBeUndefined();
    expect(card.isUrgent).toBe(false);
    expect(card.isFeatured).toBe(false);
  });
});
