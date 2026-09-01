import { describe, expect, it } from "vitest";
import { CANONICAL_TAXONOMY_IDS } from "../fixtures/taxonomy-catalog";
import {
  REAL_ESTATE_SCHEMA_VERSION,
  propertyPrivateSchema,
  propertyPublicSchema,
  propertySearchQuerySchema,
  realEstateCatalogSchema,
} from "./real-estate";

const property = {
  id: "property-test",
  listingId: "listing-test",
  slug: "appartement-test-lyon",
  schemaVersion: 1,
  marketCodes: ["FR"],
  propertyType: "apartment",
  transactionType: "sale",
  lifecycle: "published",
  title: "Appartement lumineux à Lyon",
  description:
    "Un appartement structuré pour tester le contrat immobilier public.",
  financials: {
    price: { amountMinor: 48500000, currency: "EUR" },
    period: "total",
    feesPaidBy: "seller",
    isNegotiable: false,
  },
  characteristics: {
    livingAreaSquareMeters: 92,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 1,
    condition: "good",
    amenities: ["lift"],
    accessibilityFeatures: [],
  },
  energy: { dpeClass: "B", gesClass: "B" },
  regulatory: {
    coOwnershipApplicable: true,
    coOwnershipLots: 48,
    coOwnershipProcedureStatus: "none",
    riskInformationStatus: "available",
    ownershipDeclared: true,
    legalNotices: [],
  },
  address: {
    city: "Lyon",
    postalCode: "69003",
    countryCode: "FR",
    latitude: 45.75,
    longitude: 4.88,
    precision: "district",
    publicLabel: "Lyon 3e · Montchat",
    exactAddress: "14 rue secrète, 69003 Lyon",
  },
  media: {
    photos: ["https://images.example.com/property.webp"],
    floorPlans: [],
  },
  seller: {
    type: "owner",
    id: "owner-test",
    displayName: "Marie D.",
    verificationLabels: ["Téléphone vérifié"],
    rating: 4.9,
    reviewCount: 7,
  },
  promotion: { urgent: false, featured: false, sponsored: false },
  customAttributes: {},
  moderationStatus: "approved",
  documents: [
    {
      id: "doc-test",
      type: "dpe",
      status: "uploaded",
      privateStorageKey: "documents-private/immo/test.pdf",
    },
  ],
  createdByUserId: "owner-test",
  ownerUserId: "owner-test",
  planId: "immo_owner_visibility",
  riskSignals: ["internal-only"],
  createdAt: "2026-08-20T10:00:00.000Z",
  publishedAt: "2026-08-21T10:00:00.000Z",
  sortDate: "2026-08-22T10:00:00.000Z",
} as const;

describe("Shongre Immo contracts", () => {
  it("pins schema version one and validates normalized private properties", () => {
    expect(REAL_ESTATE_SCHEMA_VERSION).toBe(1);
    expect(propertyPrivateSchema.parse(property).schemaVersion).toBe(1);
  });

  it("strips exact address, private documents, moderation and risk fields", () => {
    const publicProperty = propertyPublicSchema.parse(property);
    expect(publicProperty.address).not.toHaveProperty("exactAddress");
    for (const field of [
      "documents",
      "moderationStatus",
      "createdByUserId",
      "ownerUserId",
      "riskSignals",
      "createdAt",
    ])
      expect(publicProperty).not.toHaveProperty(field);
    expect(publicProperty.seller).toMatchObject({
      rating: 4.9,
      reviewCount: 7,
    });
  });

  it("requires integer minor-unit prices", () => {
    expect(
      propertyPrivateSchema.safeParse({
        ...property,
        financials: {
          ...property.financials,
          price: { amountMinor: 485000.5, currency: "EUR" },
        },
      }).success,
    ).toBe(false);
  });

  it("bounds scalable cursor pagination", () => {
    expect(
      propertySearchQuerySchema.parse({ marketCode: "FR", sort: "relevance" }),
    ).toMatchObject({ limit: 20 });
    expect(
      propertySearchQuerySchema.safeParse({
        marketCode: "FR",
        sort: "relevance",
        limit: 51,
      }).success,
    ).toBe(false);
  });

  it("rejects a catalog whose specialized offers target another vertical", () => {
    const minimal = {
      activation: {
        marketCode: "FR",
        verticalType: "real_estate",
        categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
        subcategoryIds: [],
        schemaVersion: 1,
        isActive: true,
        featureFlags: {},
      },
      config: {
        marketCode: "FR",
        schemaVersion: 1,
        locale: "fr-FR",
        currency: "EUR",
        timezone: "Europe/Paris",
        isEnabled: true,
        defaultSearchRadiusKm: 25,
        leadRetentionDays: 730,
        draftRetentionDays: 180,
        approximateLocationRadiusM: 300,
        featureFlags: {
          verticalEnabled: true,
          mapSearchEnabled: true,
          savedSearchesEnabled: true,
          recentlyViewedEnabled: true,
          comparablesEnabled: true,
          structuredLeadsEnabled: true,
          appointmentsEnabled: true,
          paidOffersEnabled: true,
          professionalImportsEnabled: true,
          professionalApiSyncEnabled: false,
          privateDocumentsEnabled: true,
        },
        regulatoryContentVersion: "fr-v1",
      },
      propertyTypes: [],
      attributes: [],
      fieldRules: [],
      offers: [],
      addOns: [],
    };
    expect(realEstateCatalogSchema.safeParse(minimal).success).toBe(true);
    expect(
      realEstateCatalogSchema.safeParse({
        ...minimal,
        offers: [{ verticalType: "automotive" }],
      }).success,
    ).toBe(false);
  });
});
