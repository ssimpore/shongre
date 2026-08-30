import { describe, expect, it } from "vitest";
import type { VehiclePublic } from "@shongre/contracts/auto";
import type { JobPostingCard } from "@shongre/contracts/employment";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import {
  presentEmploymentListingCard,
  presentPropertyListingCard,
  presentVehicleListingCard,
} from "./listing-card.presentation";

describe("structured category listing-card presentation", () => {
  it("selects property type, area and room count without placeholders", () => {
    const property = {
      id: "property-1",
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
      },
      promotion: { urgent: false, featured: true, sponsored: true },
      publishedAt: "2026-08-20T10:00:00Z",
      sortDate: "2026-08-20T10:00:00Z",
    } as unknown as PropertyPublic;

    const card = presentPropertyListingCard(property, "fr-FR");

    expect(card.priceLabel).toContain("/ mois");
    expect(card.conditionLabel).toBe("Bon état");
    expect(card.characteristics).toEqual(["Appartement", "68 m²", "3 pièces"]);
    expect(card.seller?.sellerType).toBe("pro");
  });

  it("collapses unavailable property metadata instead of filling space", () => {
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

    expect(
      presentPropertyListingCard(property, "fr-FR").characteristics,
    ).toEqual(["Terrain"]);
  });

  it("selects vehicle year, mileage and fuel", () => {
    const vehicle = {
      id: "vehicle-1",
      title: "Peugeot 3008",
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
        verifiedBusiness: true,
      },
      trust: { sellerIdentity: "verified" },
      mediaUrls: ["https://example.test/vehicle.jpg"],
      promotionLabels: ["urgent"],
      publishedAt: "2026-08-20T10:00:00Z",
      priceNegotiable: true,
    } as unknown as VehiclePublic;

    const card = presentVehicleListingCard(vehicle, "fr-FR");
    expect(card.characteristics[0]).toBe("2022");
    expect(card.characteristics[1]?.replace(/\s/gu, " ")).toBe("42 000 km");
    expect(card.characteristics[2]).toBe("Hybride");
    expect(card.conditionLabel).toBe("Excellent état");
    expect(card.isUrgent).toBe(true);
  });

  it("presents job salary ranges and the three useful employment fields", () => {
    const job = {
      id: "job-1",
      title: "Développeur front-end",
      employer: {
        id: "employer",
        name: "Studio Canopée",
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
    } as unknown as JobPostingCard;

    const card = presentEmploymentListingCard(
      job,
      {
        dictionaries: [{ id: "salary.month", label: "Par mois" }],
      } as never,
      "fr-FR",
      "FR",
      "EUR",
    );
    expect(card.priceLabel?.replace(/\s/gu, " ")).toContain(
      "4 000 € – 5 000 €",
    );
    expect(card.priceLabel).toContain("par mois");
    expect(card.characteristics).toEqual([
      "CDI",
      "Hybride",
      "Développement Web",
    ]);
    expect(card.conditionLabel).toBe("");
  });
});
