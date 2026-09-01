import { describe, expect, it } from "vitest";
import {
  AUTO_SCHEMA_VERSION,
  autoPlanSchema,
  vehiclePrivateSchema,
  vehiclePublicSchema,
  vehicleSearchQuerySchema,
} from "./auto";

const vehicle = {
  id: "vehicle-contract-test",
  schemaVersion: 1,
  vertical: "automotive",
  slug: "peugeot-3008-contract-test",
  vehicleType: "car",
  lifecycle: "published",
  marketCodes: ["FR"],
  title: "Peugeot 3008 Allure",
  description: "Véhicule entretenu et disponible sur rendez-vous.",
  makeId: "peugeot",
  makeLabel: "Peugeot",
  modelId: "peugeot-3008",
  modelLabel: "3008",
  technical: {
    modelYear: 2021,
    mileage: 42000,
    mileageUnit: "km",
    fuelType: "petrol",
    transmission: "automatic",
  },
  history: {
    condition: "good",
    accidentStatus: "none_declared",
    maintenanceBookStatus: "complete",
    inspectionStatus: "valid",
  },
  price: { amountMinor: 2199000, currency: "EUR" },
  priceIncludesTax: true,
  locationLabel: "Lyon (69)",
  seller: {
    id: "seller-test",
    type: "individual",
    displayName: "Vendeur Test",
    slug: "vendeur-test",
    locationLabel: "Lyon (69)",
    rating: 4.8,
    reviewCount: 64,
    memberSinceYear: 2022,
    verifiedBusiness: false,
  },
  mediaUrls: ["https://images.example.com/vehicle.jpg"],
  equipment: ["GPS"],
  dynamicAttributes: {},
  trust: {
    sellerIdentity: "pending",
    professionalBusiness: "not_applicable",
    vinOnFile: true,
    documents: [],
    historyReportStatus: "uploaded_private",
    publicBadges: [],
  },
  promotionLabels: [],
  isFavorite: false,
  publishedAt: "2026-08-20T10:00:00.000Z",
  sortDate: "2026-08-20T10:00:00.000Z",
  updatedAt: "2026-08-20T10:00:00.000Z",
  ownerUserId: "user-private-seller",
  vinMasked: "VF3**************",
  vinHash: "sha256:private-hash",
  registrationHash: "sha256:private-registration-hash",
  moderationStatus: "approved",
  planId: "auto_private_free",
  documents: [],
  riskSignals: [],
  createdAt: "2026-08-19T10:00:00.000Z",
} as const;

describe("Shongre Auto public contracts", () => {
  it("pins the automotive schema version", () => {
    expect(AUTO_SCHEMA_VERSION).toBe(1);
    expect(vehiclePrivateSchema.parse(vehicle).schemaVersion).toBe(1);
    expect(
      vehiclePrivateSchema.safeParse({ ...vehicle, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it("keeps public vehicle parsing free of private identity and moderation fields", () => {
    const publicVehicle = vehiclePublicSchema.parse(vehicle);
    expect(publicVehicle).not.toHaveProperty("ownerUserId");
    expect(publicVehicle).not.toHaveProperty("vinMasked");
    expect(publicVehicle).not.toHaveProperty("vinHash");
    expect(publicVehicle).not.toHaveProperty("registrationHash");
    expect(publicVehicle).not.toHaveProperty("moderationStatus");
    expect(publicVehicle).not.toHaveProperty("riskSignals");
    expect(publicVehicle.seller).toMatchObject({
      rating: 4.8,
      reviewCount: 64,
    });
  });

  it("requires exactly one private-seller or dealer owner", () => {
    expect(vehiclePrivateSchema.safeParse(vehicle).success).toBe(true);
    expect(
      vehiclePrivateSchema.safeParse({
        ...vehicle,
        dealerOrganizationId: "dealer-test",
      }).success,
    ).toBe(false);
    const dealerVehicle = {
      ...vehicle,
      ownerUserId: undefined,
      dealerOrganizationId: "dealer-test",
      dealerLocationId: "dealer-location-test",
      seller: { ...vehicle.seller, type: "dealer" },
    };
    expect(vehiclePrivateSchema.safeParse(dealerVehicle).success).toBe(true);
    expect(
      vehiclePrivateSchema.safeParse({
        ...dealerVehicle,
        dealerOrganizationId: undefined,
      }).success,
    ).toBe(false);
  });

  it("enforces integer minor-unit commercial prices", () => {
    const plan = {
      id: "auto_plan_test",
      marketCode: "FR",
      audience: "individual",
      name: "Plan test",
      description: "Plan de validation",
      monthlyPrice: { amountMinor: 4990, currency: "EUR" },
      taxRateBps: 2000,
      isActive: true,
      isRecommended: false,
      entitlements: {
        maxActiveVehicles: 1,
        maxPhotosPerVehicle: 12,
        maxVideosPerVehicle: 0,
        maxTeamMembers: 1,
        maxLocations: 1,
        monthlyPromotionCredits: 0,
        includedUrgentCredits: 0,
        includedBumpCredits: 0,
        includedFeaturedCredits: 0,
        inventoryCsvImport: false,
        inventoryXmlImport: false,
        inventoryApiSync: false,
        leadAssignment: false,
        leadReminders: false,
        publicStorefront: false,
        vehicleVideo: false,
        vehicleView360: false,
        detailedAnalytics: false,
        networkAnalytics: false,
        apiAccess: false,
        centralizedBilling: false,
        branchPermissions: false,
        stockTransfers: false,
        customPlan: false,
        serviceLevelAgreement: false,
        prioritySupport: false,
      },
    };
    expect(autoPlanSchema.safeParse(plan).success).toBe(true);
    expect(
      autoPlanSchema.safeParse({
        ...plan,
        monthlyPrice: { amountMinor: 49.9, currency: "EUR" },
      }).success,
    ).toBe(false);
  });

  it("bounds filter pagination and normalizes search defaults", () => {
    expect(vehicleSearchQuerySchema.parse({ marketCode: "FR" })).toMatchObject({
      marketCode: "FR",
      sort: "relevance",
      limit: 20,
    });
    expect(
      vehicleSearchQuerySchema.safeParse({ marketCode: "FR", limit: 51 })
        .success,
    ).toBe(false);
    expect(
      vehicleSearchQuerySchema.safeParse({
        marketCode: "FR",
        radiusKm: 501,
      }).success,
    ).toBe(false);
  });
});
