import { createHash } from "node:crypto";
import type {
  AgencyWorkspace,
  PropertyAppointment,
  PropertyDraft,
  PropertyImport,
  PropertyFieldRule,
  PropertyLead,
  PropertyLeadNote,
  PropertyPrivate,
  PropertySearchQuery,
  PropertySearchResult,
  PropertyTypeConfig,
  RealEstateAdminOverview,
  RealEstateCatalog,
  RealEstateMarketConfig,
} from "@shongre/contracts/real-estate";
import {
  propertyAppointmentSchema,
  propertyDraftSchema,
  propertyImportSchema,
  propertyLeadSchema,
  propertyLeadNoteSchema,
  propertyPrivateSchema,
  propertySearchQuerySchema,
  realEstateCatalogSchema,
} from "@shongre/contracts/real-estate";
import type {
  VerticalAddOn,
  VerticalCheckout,
  VerticalOffer,
} from "@shongre/contracts/vertical";
import { verticalCheckoutSchema } from "@shongre/contracts/vertical";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

const NOW = "2026-08-22T10:00:00.000Z";
const clone = <T>(value: T): T => structuredClone(value);
const hash = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export type RealEstateAnalyticsEventName =
  | "listing_created"
  | "publication_step_completed"
  | "publication_completed"
  | "offer_selected"
  | "checkout_completed"
  | "lead_created"
  | "lead_responded"
  | "visit_requested"
  | "visit_completed"
  | "search_performed"
  | "property_viewed"
  | "search_contacted"
  | "subscription_started"
  | "add_on_purchased"
  | "agency_workspace_opened";

export interface RealEstateAnalyticsEvent {
  eventName: RealEstateAnalyticsEventName;
  marketCode: string;
  propertyId?: string;
  organizationId?: string;
  anonymousSessionHash?: string;
  dimensions?: Record<string, unknown>;
  valueMinor?: number;
  currency?: string;
  occurredAt?: string;
}

const featureFlags = {
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
};

const baseEntitlements = {
  maxActiveListings: 1,
  maxMedia: 12,
  maxTeamMembers: 1,
  maxBranches: 1,
  basicAnalytics: true,
  detailedAnalytics: false,
  virtualTour: false,
  qualifiedContactForm: false,
  csvImport: false,
  xmlImport: false,
  automaticSync: false,
  leadAssignment: false,
  advancedReports: false,
  apiAccess: false,
  centralizedBilling: false,
  branchPermissions: false,
  includedVisibilityCredits: 0,
};

const makeOffer = (
  id: string,
  audience: VerticalOffer["audience"],
  kind: VerticalOffer["kind"],
  name: string,
  amountMinor: number,
  sortOrder: number,
  patch: Record<string, boolean | number | string | string[]> = {},
): RealEstateCatalog["offers"][number] => ({
  id,
  verticalType: "real_estate",
  marketCode: "FR",
  audience,
  kind,
  name,
  description: `${name} — offre configurable par marché.`,
  prices: [
    {
      id: `${id}_price`,
      amount: { amountMinor, currency: "EUR" },
      billingPeriod:
        kind === "subscription" || kind === "custom" ? "month" : "once",
      durationDays: kind === "pack" ? 30 : kind === "free" ? 60 : undefined,
      trialDays: kind === "subscription" ? 14 : undefined,
      taxRateBps: amountMinor ? 2000 : 0,
      isActive: true,
    },
  ],
  entitlements: { ...baseEntitlements, ...patch },
  isActive: true,
  isRecommended: id === "immo_owner_visibility" || id === "immo_agency_growth",
  sortOrder,
});

export const DEFAULT_REAL_ESTATE_CATALOG: RealEstateCatalog = {
  activation: {
    marketCode: "FR",
    verticalType: "real_estate",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    subcategoryIds: [
      CANONICAL_TAXONOMY_IDS.realEstateSales,
      CANONICAL_TAXONOMY_IDS.realEstateRentals,
    ],
    schemaVersion: 1,
    isActive: true,
    featureFlags,
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
    featureFlags,
    regulatoryContentVersion: "fr-immo-2026-08",
  },
  propertyTypes: [
    ["apartment", "appartements", "Appartement"],
    ["house", "maisons", "Maison"],
    ["land", "terrains", "Terrain"],
    ["parking_garage", "parkings-garages", "Parking ou garage"],
    ["commercial", "locaux-commerciaux", "Local commercial"],
    ["office", "bureaux", "Bureau"],
    ["building", "immeubles", "Immeuble"],
    ["new_development", "programmes-neufs", "Programme neuf"],
    ["holiday_rental", "locations-vacances", "Location saisonnière"],
    ["room_shared", "chambres-colocation", "Chambre ou colocation"],
    ["other", "autres-biens", "Autre bien"],
  ].map(([type, slug, label], index) => ({
    type: type as PropertyTypeConfig["type"],
    marketCode: "FR",
    slug,
    label,
    description: `${label} disponible selon les projets activés pour ce marché.`,
    iconName: "Building2",
    transactionTypes:
      type === "land" || type === "building"
        ? ["sale"]
        : type === "holiday_rental"
          ? ["seasonal_rental"]
          : type === "room_shared"
            ? ["shared_accommodation", "long_term_rental"]
            : ["sale", "long_term_rental"],
    requiredFieldIds: ["price", "livingArea", "address"],
    filterFieldIds: [
      "price",
      "livingArea",
      "rooms",
      "bedrooms",
      "dpe",
      "amenities",
    ],
    schemaVersion: 1,
    isActive: true,
    sortOrder: (index + 1) * 10,
  })),
  attributes: [
    ["livingArea", "Surface habitable", "number", true, true],
    ["landArea", "Surface du terrain", "number", false, true],
    ["rooms", "Nombre de pièces", "number", true, true],
    ["bedrooms", "Chambres", "number", false, true],
    ["furnished", "Meublé", "boolean", false, true],
    ["dpe", "Classe DPE", "single_select", false, true],
    ["ges", "Classe GES", "single_select", false, true],
    ["coOwnership", "Copropriété", "boolean", false, true],
    ["coOwnershipLots", "Nombre de lots", "number", false, false],
    [
      "riskInformationStatus",
      "Information sur les risques",
      "single_select",
      false,
      false,
    ],
    [
      "professionalIdentity",
      "Identification professionnelle",
      "text",
      false,
      false,
    ],
    ["amenities", "Équipements", "multi_select", false, true],
    [
      "diagnostics",
      "Diagnostics et documents",
      "document_status",
      false,
      false,
    ],
  ].map(([id, label, fieldType, required, filterable], index) => ({
    id: String(id),
    marketCode: "FR",
    propertyTypes: [
      "apartment",
      "house",
      "land",
      "parking_garage",
      "commercial",
      "office",
      "building",
      "new_development",
      "holiday_rental",
      "room_shared",
      "other",
    ],
    transactionTypes: [
      "sale",
      "long_term_rental",
      "seasonal_rental",
      "shared_accommodation",
      "life_annuity",
      "other",
    ],
    label: String(label),
    helpText:
      id === "diagnostics"
        ? "Les fichiers restent privés et nécessitent une autorisation."
        : undefined,
    fieldType: fieldType as
      | "text"
      | "number"
      | "boolean"
      | "single_select"
      | "multi_select"
      | "document_status",
    unit: id === "livingArea" || id === "landArea" ? "m²" : undefined,
    options:
      id === "dpe" || id === "ges"
        ? ["A", "B", "C", "D", "E", "F", "G"].map((value, optionIndex) => ({
            value,
            label: value,
            sortOrder: optionIndex * 10,
          }))
        : undefined,
    privacy: id === "diagnostics" ? "reviewer_only" : "public",
    isRequired: Boolean(required),
    isFilterable: Boolean(filterable),
    isActive: true,
    schemaVersion: 1,
    sortOrder: (index + 1) * 10,
  })),
  fieldRules: [
    {
      id: "rule_fr_dpe",
      fieldId: "dpe",
      requirement: "required" as const,
      condition: {
        path: "energy.dpeClass",
        excludedPropertyTypes: ["land", "parking_garage"],
      },
    },
    {
      id: "rule_fr_ges",
      fieldId: "ges",
      requirement: "required" as const,
      condition: {
        path: "energy.gesClass",
        excludedPropertyTypes: ["land", "parking_garage"],
      },
    },
    {
      id: "rule_fr_coownership_lots",
      propertyType: "apartment" as const,
      fieldId: "coOwnershipLots",
      requirement: "required" as const,
      condition: {
        path: "regulatory.coOwnershipLots",
        whenPath: "regulatory.coOwnershipApplicable",
        whenEquals: true,
      },
    },
    {
      id: "rule_fr_risk_information",
      fieldId: "riskInformationStatus",
      requirement: "required" as const,
      condition: { path: "regulatory.riskInformationStatus" },
    },
    {
      id: "rule_fr_professional_identity",
      fieldId: "professionalIdentity",
      requirement: "required" as const,
      condition: {
        path: "seller.professionalIdentity",
        sellerTypes: ["agency", "developer", "property_manager"],
      },
    },
  ].map((rule) => ({
    ...rule,
    marketCode: "FR" as const,
    transactionType: undefined,
    schemaVersion: 1,
    isActive: true,
  })),
  offers: [
    makeOffer(
      "immo_owner_free",
      "individual",
      "free",
      "Propriétaire Gratuit",
      0,
      10,
    ),
    makeOffer(
      "immo_owner_visibility",
      "individual",
      "pack",
      "Pack Visibilité Propriétaire",
      2990,
      20,
      {
        maxActiveListings: 3,
        maxMedia: 30,
        virtualTour: true,
        qualifiedContactForm: true,
        detailedAnalytics: true,
        includedVisibilityCredits: 5,
      },
    ),
    makeOffer(
      "immo_agency_starter",
      "professional",
      "subscription",
      "Agency Starter",
      7900,
      30,
      {
        maxActiveListings: 25,
        maxTeamMembers: 3,
        agencyProfile: true,
        leadInbox: true,
      },
    ),
    makeOffer(
      "immo_agency_growth",
      "professional",
      "subscription",
      "Agency Growth",
      16900,
      40,
      {
        maxActiveListings: 200,
        maxTeamMembers: 20,
        csvImport: true,
        xmlImport: true,
        automaticSync: true,
        leadAssignment: true,
        advancedReports: true,
        includedVisibilityCredits: 2000,
      },
    ),
    makeOffer(
      "immo_agency_network",
      "organization",
      "custom",
      "Agency Network",
      39900,
      50,
      {
        maxActiveListings: 1000,
        maxTeamMembers: 100,
        maxBranches: 50,
        centralizedBilling: true,
        branchPermissions: true,
        apiAccess: true,
        customPricing: true,
      },
    ),
  ],
  addOns: [
    ["immo_urgent", "urgent", "Urgent", 790, 7],
    ["immo_bump", "search_bump", "Remonter l’annonce", 490, 1],
    ["immo_featured", "featured", "À la une", 1490, 7],
    ["immo_home_spotlight", "homepage_spotlight", "Spotlight accueil", 2990, 7],
    ["immo_local_spotlight", "local_spotlight", "Spotlight local", 1990, 7],
    [
      "immo_qualified_lead",
      "qualified_lead",
      "Crédit lead qualifié",
      590,
      undefined,
    ],
    [
      "immo_sponsored_agency",
      "sponsored_professional",
      "Agence sponsorisée",
      4990,
      30,
    ],
  ].map(([id, type, name, price, days], index) => ({
    id: String(id),
    verticalType: "real_estate",
    marketCode: "FR",
    categoryIds: [CANONICAL_TAXONOMY_IDS.realEstate],
    geographicAreaIds: [],
    type: type as VerticalAddOn["type"],
    name: String(name),
    description: "Option payante identifiable et configurable par marché.",
    price: { amountMinor: Number(price), currency: "EUR" },
    taxRateBps: 2000,
    validityDays: days ? Number(days) : undefined,
    creditQuantity: 1,
    scheduleModes:
      type === "search_bump"
        ? ["immediate", "daily", "scheduled"]
        : ["immediate", "scheduled"],
    isActive: true,
    sortOrder: (index + 1) * 10,
  })),
};

const property = (
  id: string,
  slug: string,
  title: string,
  patch: Partial<PropertyPrivate> = {},
): PropertyPrivate => ({
  id,
  listingId: `listing_${id}`,
  slug,
  schemaVersion: 1,
  marketCodes: ["FR"],
  propertyType: "apartment",
  transactionType: "sale",
  lifecycle: "published",
  title,
  description:
    "Bien présenté avec des informations structurées et une localisation respectueuse de la vie privée.",
  financials: {
    price: { amountMinor: 48500000, currency: "EUR" },
    pricePerSquareMeter: { amountMinor: 527200, currency: "EUR" },
    period: "total",
    feesPaidBy: "seller",
    isNegotiable: false,
  },
  characteristics: {
    livingAreaSquareMeters: 92,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 1,
    floor: 3,
    floorCount: 6,
    hasLift: true,
    isFurnished: false,
    condition: "excellent",
    amenities: ["lift", "balcony", "cellar"],
    accessibilityFeatures: [],
  },
  energy: { dpeClass: "B", gesClass: "B", diagnosticDate: "2025-05-12" },
  regulatory: {
    coOwnershipApplicable: true,
    coOwnershipLots: 48,
    annualCoOwnershipCharges: { amountMinor: 216000, currency: "EUR" },
    coOwnershipProcedureStatus: "none",
    riskInformationUrl: "https://www.georisques.gouv.fr/",
    riskInformationStatus: "available",
    ownershipDeclared: true,
    legalNotices: [],
  },
  address: {
    city: "Lyon",
    postalCode: "69003",
    countryCode: "FR",
    latitude: 45.7503,
    longitude: 4.8881,
    precision: "district",
    publicLabel: "Lyon 3e · Montchat",
    exactAddress: "Adresse privée — Lyon 3e",
  },
  media: {
    photos: ["https://demo.shongre.test/images/immo/appartement-lyon.webp"],
    floorPlans: [],
  },
  seller: {
    type: "owner",
    id: "owner_marie",
    displayName: "Marie D.",
    verificationLabels: ["Téléphone vérifié"],
    responseTimeLabel: "Répond généralement dans la journée",
  },
  promotion: { urgent: false, featured: true, sponsored: true },
  customAttributes: {},
  moderationStatus: "approved",
  documents: [],
  createdByUserId: "owner_marie",
  ownerUserId: "owner_marie",
  planId: "immo_owner_visibility",
  riskSignals: [],
  createdAt: "2026-08-18T10:00:00.000Z",
  publishedAt: "2026-08-20T10:00:00.000Z",
  sortDate: NOW,
  ...patch,
});

export const DEFAULT_REAL_ESTATE_PROPERTIES = [
  property(
    "property_apartment_lyon",
    "appartement-lumineux-lyon-montchat",
    "Appartement lumineux avec balcon",
  ),
  property(
    "property_rental_lyon",
    "appartement-meuble-lyon-jean-mace",
    "Appartement meublé proche Jean Macé",
    {
      transactionType: "long_term_rental",
      financials: {
        price: { amountMinor: 129000, currency: "EUR" },
        charges: { amountMinor: 9000, currency: "EUR" },
        deposit: { amountMinor: 258000, currency: "EUR" },
        pricePerSquareMeter: { amountMinor: 1897, currency: "EUR" },
        period: "month",
        feesPaidBy: "tenant",
        isNegotiable: false,
      },
      characteristics: {
        livingAreaSquareMeters: 68,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 1,
        floor: 4,
        hasLift: true,
        isFurnished: true,
        condition: "good",
        amenities: ["lift", "balcony"],
        accessibilityFeatures: [],
      },
      energy: { dpeClass: "C", gesClass: "C" },
      address: {
        city: "Lyon",
        postalCode: "69007",
        countryCode: "FR",
        latitude: 45.7461,
        longitude: 4.8424,
        precision: "district",
        publicLabel: "Lyon 7e · Jean Macé",
        exactAddress: "Adresse privée — Lyon 7e",
      },
      media: {
        photos: ["https://demo.shongre.test/images/immo/location-lyon.webp"],
        floorPlans: [],
      },
      seller: {
        type: "agency",
        id: "agency_canopee",
        displayName: "Agence Canopée",
        verificationLabels: ["Professionnel vérifié"],
        responseTimeLabel: "Répond généralement sous 2 h",
      },
      promotion: { urgent: false, featured: false, sponsored: false },
      createdByUserId: "member_clara",
      ownerUserId: undefined,
      organizationId: "agency_canopee",
      branchId: "branch_lyon",
      planId: "immo_agency_growth",
    },
  ),
  property(
    "property_house_ecully",
    "maison-familiale-ecully-jardin",
    "Maison familiale avec jardin",
    {
      propertyType: "house",
      financials: {
        price: { amountMinor: 69500000, currency: "EUR" },
        pricePerSquareMeter: { amountMinor: 543000, currency: "EUR" },
        period: "total",
        feesPaidBy: "seller",
        isNegotiable: true,
      },
      characteristics: {
        livingAreaSquareMeters: 128,
        landAreaSquareMeters: 510,
        rooms: 5,
        bedrooms: 4,
        bathrooms: 2,
        floorCount: 2,
        condition: "good",
        amenities: ["garden", "terrace", "parking", "cellar"],
        accessibilityFeatures: [],
      },
      energy: { dpeClass: "D", gesClass: "D" },
      regulatory: {
        coOwnershipApplicable: false,
        coOwnershipProcedureStatus: "not_applicable",
        riskInformationUrl: "https://www.georisques.gouv.fr/",
        riskInformationStatus: "available",
        ownershipDeclared: true,
        legalNotices: [],
      },
      address: {
        city: "Écully",
        postalCode: "69130",
        countryCode: "FR",
        latitude: 45.775,
        longitude: 4.778,
        precision: "city",
        publicLabel: "Écully",
        exactAddress: "Adresse privée — Écully",
      },
      media: {
        photos: ["https://demo.shongre.test/images/immo/maison-ecully.webp"],
        floorPlans: [],
      },
      seller: {
        type: "agency",
        id: "agency_canopee",
        displayName: "Agence Canopée",
        verificationLabels: ["Professionnel vérifié"],
        responseTimeLabel: "Répond généralement sous 2 h",
      },
      promotion: { urgent: false, featured: false, sponsored: false },
      createdByUserId: "member_clara",
      ownerUserId: undefined,
      organizationId: "agency_canopee",
      branchId: "branch_ecully",
      planId: "immo_agency_growth",
    },
  ),
];

const toPublic = (row: PropertyPrivate) => {
  const {
    moderationStatus: _moderationStatus,
    moderationReason: _moderationReason,
    documents: _documents,
    createdByUserId: _createdByUserId,
    ownerUserId: _ownerUserId,
    organizationId: _organizationId,
    branchId: _branchId,
    planId: _planId,
    riskSignals: _riskSignals,
    createdAt: _createdAt,
    ...publicRow
  } = row;
  const { exactAddress: _exactAddress, ...publicAddress } = row.address;
  const step = {
    exact: 0.001,
    street: 0.001,
    district: 0.005,
    city: 0.02,
  }[row.address.precision];
  return {
    ...publicRow,
    address: {
      ...publicAddress,
      latitude: Math.round(row.address.latitude / step) * step,
      longitude: Math.round(row.address.longitude / step) * step,
    },
    isFavorite: false,
  };
};

const matches = (query: PropertySearchQuery, row: PropertyPrivate) => {
  if (
    row.lifecycle !== "published" ||
    row.moderationStatus !== "approved" ||
    !row.marketCodes.includes(query.marketCode)
  )
    return false;
  if (
    query.transactionTypes?.length &&
    !query.transactionTypes.includes(row.transactionType)
  )
    return false;
  if (
    query.propertyTypes?.length &&
    !query.propertyTypes.includes(row.propertyType)
  )
    return false;
  if (
    query.minPriceMinor !== undefined &&
    row.financials.price.amountMinor < query.minPriceMinor
  )
    return false;
  if (
    query.maxPriceMinor !== undefined &&
    row.financials.price.amountMinor > query.maxPriceMinor
  )
    return false;
  const pricePerSquareMeter =
    row.financials.pricePerSquareMeter?.amountMinor || 0;
  if (
    query.minPricePerSquareMeterMinor !== undefined &&
    pricePerSquareMeter < query.minPricePerSquareMeterMinor
  )
    return false;
  if (
    query.maxPricePerSquareMeterMinor !== undefined &&
    pricePerSquareMeter > query.maxPricePerSquareMeterMinor
  )
    return false;
  if (
    query.minSurfaceSquareMeters !== undefined &&
    row.characteristics.livingAreaSquareMeters < query.minSurfaceSquareMeters
  )
    return false;
  if (
    query.maxSurfaceSquareMeters !== undefined &&
    row.characteristics.livingAreaSquareMeters > query.maxSurfaceSquareMeters
  )
    return false;
  if (
    query.minRooms !== undefined &&
    row.characteristics.rooms < query.minRooms
  )
    return false;
  if (
    query.minBedrooms !== undefined &&
    row.characteristics.bedrooms < query.minBedrooms
  )
    return false;
  if (
    query.furnished !== undefined &&
    Boolean(row.characteristics.isFurnished) !== query.furnished
  )
    return false;
  if (
    query.dpeClasses?.length &&
    (!row.energy.dpeClass || !query.dpeClasses.includes(row.energy.dpeClass))
  )
    return false;
  if (
    query.amenities?.length &&
    !query.amenities.every((value) =>
      row.characteristics.amenities.includes(value),
    )
  )
    return false;
  if (query.sellerTypes?.length && !query.sellerTypes.includes(row.seller.type))
    return false;
  if (
    query.city &&
    !`${row.address.city} ${row.address.publicLabel}`
      .toLowerCase()
      .includes(query.city.toLowerCase())
  )
    return false;
  if (
    query.query &&
    !`${row.title} ${row.description} ${row.address.publicLabel}`
      .toLowerCase()
      .includes(query.query.toLowerCase())
  )
    return false;
  if (
    query.boundingBox &&
    (row.address.latitude > query.boundingBox.north ||
      row.address.latitude < query.boundingBox.south ||
      row.address.longitude > query.boundingBox.east ||
      row.address.longitude < query.boundingBox.west)
  )
    return false;
  if (query.center && query.radiusKm !== undefined) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(
      row.address.latitude - query.center.latitude,
    );
    const longitudeDelta = toRadians(
      row.address.longitude - query.center.longitude,
    );
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(query.center.latitude)) *
        Math.cos(toRadians(row.address.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distanceKm > query.radiusKm) return false;
  }
  return true;
};

export interface IRealEstateRepository {
  getCatalog(
    marketCode: string,
    includeInactive?: boolean,
  ): Promise<RealEstateCatalog>;
  search(query: PropertySearchQuery): Promise<PropertySearchResult>;
  getProperty(idOrSlug: string): Promise<PropertyPrivate | null>;
  saveProperty(property: PropertyPrivate): Promise<PropertyPrivate>;
  countActiveProperties(owner: {
    ownerUserId?: string;
    organizationId?: string;
  }): Promise<number>;
  assessRisk(candidate: {
    excludePropertyId?: string;
    title: string;
    description: string;
    priceMinor: number;
    city: string;
    mediaUrls: string[];
  }): Promise<string[]>;
  getDraft(id: string): Promise<PropertyDraft | null>;
  saveDraft(draft: PropertyDraft): Promise<PropertyDraft>;
  getLead(id: string): Promise<PropertyLead | null>;
  findDuplicateLead(
    propertyId: string,
    email: string,
    type: PropertyLead["type"],
  ): Promise<PropertyLead | null>;
  saveLead(lead: PropertyLead): Promise<PropertyLead>;
  saveLeadNote(note: PropertyLeadNote): Promise<PropertyLeadNote>;
  saveAppointment(
    appointment: PropertyAppointment,
  ): Promise<PropertyAppointment>;
  getAgencyWorkspace(organizationId: string): Promise<AgencyWorkspace | null>;
  saveImport(job: PropertyImport): Promise<PropertyImport>;
  getImportByIdempotency(
    organizationId: string,
    key: string,
  ): Promise<PropertyImport | null>;
  getAdminOverview(marketCode: string): Promise<RealEstateAdminOverview>;
  updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ): Promise<RealEstateMarketConfig>;
  updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<RealEstateCatalog["offers"][number]>,
  ): Promise<RealEstateCatalog["offers"][number]>;
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<RealEstateCatalog["addOns"][number]>,
  ): Promise<RealEstateCatalog["addOns"][number]>;
  updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ): Promise<PropertyTypeConfig>;
  updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ): Promise<PropertyFieldRule>;
  getCheckoutByIdempotency(
    accountId: string,
    key: string,
  ): Promise<VerticalCheckout | null>;
  getCheckout(id: string): Promise<VerticalCheckout | null>;
  saveCheckout(checkout: VerticalCheckout): Promise<VerticalCheckout>;
  hasWebhookEvent(provider: string, eventId: string): Promise<boolean>;
  saveWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payloadHash: string;
    status: "received" | "processed" | "ignored" | "failed";
  }): Promise<void>;
  trackAnalyticsEvent(event: RealEstateAnalyticsEvent): Promise<void>;
}

export class DemoRealEstateRepository implements IRealEstateRepository {
  protected catalog = clone(DEFAULT_REAL_ESTATE_CATALOG);
  protected properties = new Map(
    DEFAULT_REAL_ESTATE_PROPERTIES.map((row) => [row.id, clone(row)]),
  );
  protected drafts = new Map<string, PropertyDraft>();
  protected leads = new Map<string, PropertyLead>();
  protected leadNotes = new Map<string, PropertyLeadNote>();
  protected appointments = new Map<string, PropertyAppointment>();
  protected imports = new Map<string, PropertyImport>();
  protected checkouts = new Map<string, VerticalCheckout>();
  protected webhookEvents = new Set<string>();
  protected analyticsEvents: RealEstateAnalyticsEvent[] = [];

  async getCatalog(marketCode: string, includeInactive = false) {
    const catalog = clone({
      ...this.catalog,
      activation: {
        ...this.catalog.activation,
        marketCode: marketCode.toUpperCase(),
      },
      config: { ...this.catalog.config, marketCode: marketCode.toUpperCase() },
    });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      propertyTypes: catalog.propertyTypes.filter((row) => row.isActive),
      attributes: catalog.attributes.filter((row) => row.isActive),
      fieldRules: catalog.fieldRules.filter((row) => row.isActive),
      offers: catalog.offers.filter((row) => row.isActive),
      addOns: catalog.addOns.filter((row) => row.isActive),
    };
  }

  async search(input: PropertySearchQuery): Promise<PropertySearchResult> {
    const query = propertySearchQuerySchema.parse(input);
    const rows = Array.from(this.properties.values()).filter((row) =>
      matches(query, row),
    );
    rows.sort((a, b) =>
      query.sort === "price_asc"
        ? a.financials.price.amountMinor - b.financials.price.amountMinor
        : query.sort === "price_desc"
          ? b.financials.price.amountMinor - a.financials.price.amountMinor
          : query.sort === "surface_desc"
            ? b.characteristics.livingAreaSquareMeters -
              a.characteristics.livingAreaSquareMeters
            : b.sortDate.localeCompare(a.sortDate),
    );
    const offset = Number(query.cursor || 0);
    return {
      items: rows.slice(offset, offset + query.limit).map(toPublic),
      total: rows.length,
      pageInfo: {
        hasNextPage: offset + query.limit < rows.length,
        nextCursor:
          offset + query.limit < rows.length
            ? String(offset + query.limit)
            : undefined,
      },
    };
  }

  async getProperty(idOrSlug: string) {
    const row =
      this.properties.get(idOrSlug) ||
      Array.from(this.properties.values()).find(
        (candidate) => candidate.slug === idOrSlug,
      );
    return row ? clone(row) : null;
  }
  async saveProperty(row: PropertyPrivate) {
    const parsed = propertyPrivateSchema.parse(row);
    this.properties.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async countActiveProperties(owner: {
    ownerUserId?: string;
    organizationId?: string;
  }) {
    return Array.from(this.properties.values()).filter(
      (row) =>
        (owner.ownerUserId
          ? row.ownerUserId === owner.ownerUserId
          : row.organizationId === owner.organizationId) &&
        ["pending_review", "published", "reserved"].includes(row.lifecycle),
    ).length;
  }
  async assessRisk(candidate: {
    excludePropertyId?: string;
    title: string;
    description: string;
    priceMinor: number;
    city: string;
    mediaUrls: string[];
  }) {
    const signals = new Set<string>();
    for (const row of this.properties.values()) {
      if (row.id === candidate.excludePropertyId) continue;
      if (hash(row.description) === hash(candidate.description))
        signals.add("reused_description");
      if (row.media.photos.some((url) => candidate.mediaUrls.includes(url)))
        signals.add("duplicate_photo");
      if (
        row.address.city === candidate.city &&
        row.financials.price.amountMinor > candidate.priceMinor * 3
      )
        signals.add("suspicious_price");
    }
    return Array.from(signals);
  }
  async getDraft(id: string) {
    return this.drafts.has(id) ? clone(this.drafts.get(id)!) : null;
  }
  async saveDraft(draft: PropertyDraft) {
    const parsed = propertyDraftSchema.parse(draft);
    this.drafts.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getLead(id: string) {
    return this.leads.has(id) ? clone(this.leads.get(id)!) : null;
  }
  async findDuplicateLead(
    propertyId: string,
    email: string,
    type: PropertyLead["type"],
  ) {
    return clone(
      Array.from(this.leads.values()).find(
        (lead) =>
          lead.propertyId === propertyId &&
          lead.requesterEmail.toLowerCase() === email.toLowerCase() &&
          lead.type === type,
      ) || null,
    );
  }
  async saveLead(lead: PropertyLead) {
    const parsed = propertyLeadSchema.parse(lead);
    this.leads.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async saveLeadNote(note: PropertyLeadNote) {
    const parsed = propertyLeadNoteSchema.parse(note);
    this.leadNotes.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async saveAppointment(appointment: PropertyAppointment) {
    const parsed = propertyAppointmentSchema.parse(appointment);
    this.appointments.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getAgencyWorkspace(
    organizationId: string,
  ): Promise<AgencyWorkspace | null> {
    if (organizationId !== "agency_canopee") return null;
    return {
      organization: {
        id: organizationId,
        name: "Agence Canopée",
        slug: "agence-canopee-lyon",
        planId: "immo_agency_growth",
        verificationStatus: "verified",
        branchCount: 2,
        memberCount: 4,
        profile: {
          description:
            "Agence indépendante spécialisée dans Lyon et l’Ouest lyonnais.",
          website: "https://agence-canopee.example.test",
          publicEmail: "contact@canopee.example.test",
          publicPhone: "+33400000000",
        },
      },
      properties: Array.from(this.properties.values())
        .filter((row) => row.organizationId === organizationId)
        .map(clone),
      drafts: Array.from(this.drafts.values())
        .filter((row) => row.organizationId === organizationId)
        .map(clone),
      leads: Array.from(this.leads.values())
        .filter((row) => row.organizationId === organizationId)
        .map(clone),
      leadNotes: Array.from(this.leadNotes.values())
        .filter(
          (note) =>
            this.leads.get(note.leadId)?.organizationId === organizationId,
        )
        .map(clone),
      appointments: Array.from(this.appointments.values())
        .filter((row) => row.organizationId === organizationId)
        .map(clone),
      imports: Array.from(this.imports.values())
        .filter((row) => row.organizationId === organizationId)
        .map(clone),
      metrics: {
        activeProperties: 42,
        newLeads: 18,
        upcomingVisits: 6,
        responseRatePercent: 87,
        medianResponseMinutes: 43,
        views: 4821,
        searchToContactRatePercent: 3.8,
      },
      visibilityCredits: { available: 1250, included: 2000 },
      subscription: {
        offerId: "immo_agency_growth",
        offerName: "Agency Growth",
        status: "active",
        renewsAt: "2026-09-22T00:00:00.000Z",
      },
      invoices: Array.from(this.checkouts.values())
        .filter(
          (row) =>
            Boolean(row.invoiceId) &&
            (row.status === "paid" || row.status === "refunded"),
        )
        .map((row) => ({
          id: row.id,
          invoiceId: row.invoiceId!,
          offerId: row.offerId,
          total: row.total,
          status: row.status as "paid" | "refunded",
          issuedAt: row.updatedAt,
        })),
      integrationSettings: {
        csvImportEnabled: true,
        xmlImportEnabled: true,
        automaticSyncEnabled: true,
        apiAccessEnabled: false,
        lastSuccessfulSyncAt: "2026-08-22T06:00:00.000Z",
      },
      members: [
        {
          id: "member_clara",
          name: "Clara Dupont",
          role: "manager",
          branchIds: ["branch_lyon"],
        },
        {
          id: "member_thomas",
          name: "Thomas Girard",
          role: "agent",
          branchIds: ["branch_lyon", "branch_ecully"],
        },
      ],
      branches: [
        {
          id: "branch_lyon",
          name: "Lyon centre",
          city: "Lyon",
          activePropertyCount: 31,
        },
        {
          id: "branch_ecully",
          name: "Écully",
          city: "Écully",
          activePropertyCount: 11,
        },
      ],
    };
  }
  async saveImport(job: PropertyImport) {
    const parsed = propertyImportSchema.parse(job);
    this.imports.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getImportByIdempotency(organizationId: string, key: string) {
    return clone(
      Array.from(this.imports.values()).find(
        (row) =>
          row.organizationId === organizationId && row.idempotencyKey === key,
      ) || null,
    );
  }
  async getAdminOverview(marketCode: string): Promise<RealEstateAdminOverview> {
    return {
      catalog: await this.getCatalog(marketCode, true),
      metrics: {
        activeProperties: 2841,
        pendingModeration: 37,
        verifiedProfessionals: 126,
        importErrors: 9,
        leads: 6210,
        visits: 814,
        leadsPerListing: 2.19,
        medianResponseMinutes: 43,
        searchToContactRatePercent: 3.8,
        agencyRetentionPercent: 91.4,
        freeToPaidConversionPercent: 8.4,
        subscriptionMrr: { amountMinor: 2146000, currency: "EUR" },
        addOnRevenue: { amountMinor: 486000, currency: "EUR" },
        costPerLead: { amountMinor: 184, currency: "EUR" },
        revenuePerLead: { amountMinor: 424, currency: "EUR" },
      },
      moderationQueue: [
        {
          id: "moderation_1",
          propertyId: "property_apartment_lyon",
          reasonLabel: "Prix significativement inférieur aux biens comparables",
          createdAt: NOW,
        },
      ],
      syncErrors: [],
    };
  }
  async updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ) {
    if (this.catalog.config.marketCode !== marketCode.toUpperCase())
      throw new Error("Marché Immo introuvable.");
    this.catalog.config = { ...this.catalog.config, ...clone(patch) };
    this.catalog.activation.isActive = this.catalog.config.isEnabled;
    return clone(this.catalog.config);
  }
  async updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<RealEstateCatalog["offers"][number]>,
  ) {
    const index = this.catalog.offers.findIndex(
      (row) =>
        row.id === offerId && row.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Offre Immo introuvable.");
    this.catalog.offers[index] = {
      ...this.catalog.offers[index],
      ...clone(patch),
    };
    return clone(this.catalog.offers[index]);
  }
  async updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<RealEstateCatalog["addOns"][number]>,
  ) {
    const index = this.catalog.addOns.findIndex(
      (row) =>
        row.id === addOnId && row.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Option Immo introuvable.");
    this.catalog.addOns[index] = {
      ...this.catalog.addOns[index],
      ...clone(patch),
    };
    return clone(this.catalog.addOns[index]);
  }
  async updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ) {
    const index = this.catalog.propertyTypes.findIndex(
      (row) => row.type === type && row.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Type de bien introuvable.");
    this.catalog.propertyTypes[index] = {
      ...this.catalog.propertyTypes[index],
      ...clone(patch),
    };
    return clone(this.catalog.propertyTypes[index]);
  }
  async updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ) {
    const index = this.catalog.fieldRules.findIndex(
      (row) => row.id === ruleId && row.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Règle de champ introuvable.");
    this.catalog.fieldRules[index] = {
      ...this.catalog.fieldRules[index],
      ...clone(patch),
    };
    return clone(this.catalog.fieldRules[index]);
  }
  async getCheckoutByIdempotency(accountId: string, key: string) {
    const checkout = this.checkouts.get(`${accountId}:${key}`);
    return checkout ? clone(checkout) : null;
  }
  async getCheckout(id: string) {
    return clone(
      Array.from(this.checkouts.values()).find(
        (checkout) => checkout.id === id,
      ) || null,
    );
  }
  async saveCheckout(checkout: VerticalCheckout) {
    const parsed = verticalCheckoutSchema.parse(checkout);
    this.checkouts.set(
      `${parsed.accountId}:${parsed.idempotencyKey}`,
      clone(parsed),
    );
    return clone(parsed);
  }
  async hasWebhookEvent(provider: string, eventId: string) {
    return this.webhookEvents.has(`${provider}:${eventId}`);
  }
  async saveWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payloadHash: string;
    status: "received" | "processed" | "ignored" | "failed";
  }) {
    this.webhookEvents.add(`${input.provider}:${input.eventId}`);
  }
  async trackAnalyticsEvent(event: RealEstateAnalyticsEvent) {
    this.analyticsEvents.push(clone(event));
  }
}

/** Database adapter. Complex business rules remain in RealEstateService. */
export class PostgresRealEstateRepository extends DemoRealEstateRepository {
  private db() {
    // Generated types are refreshed after migrations in deployed environments;
    // this adapter intentionally mirrors the established vertical repositories.
    return getSupabaseAdminClient() as any;
  }

  override async getCatalog(marketCode: string, includeInactive = false) {
    const code = marketCode.toUpperCase();
    const [
      activation,
      config,
      types,
      attributes,
      fieldRules,
      offers,
      prices,
      entitlements,
      addOns,
    ] = await Promise.all([
      this.db()
        .from("vertical_market_activations")
        .select("*")
        .eq("vertical_type", "real_estate")
        .eq("market_code", code)
        .maybeSingle(),
      this.db()
        .from("real_estate_market_configs")
        .select("*")
        .eq("market_code", code)
        .maybeSingle(),
      this.db()
        .from("real_estate_property_types")
        .select("*")
        .eq("market_code", code)
        .order("sort_order"),
      this.db()
        .from("real_estate_attribute_definitions")
        .select("*")
        .eq("market_code", code)
        .order("sort_order"),
      this.db()
        .from("real_estate_field_rules")
        .select("*")
        .eq("market_code", code),
      this.db()
        .from("vertical_offers")
        .select("*")
        .eq("vertical_type", "real_estate")
        .eq("market_code", code)
        .order("sort_order"),
      this.db()
        .from("vertical_offer_prices")
        .select("*")
        .eq("vertical_type", "real_estate")
        .eq("market_code", code),
      this.db()
        .from("vertical_offer_entitlements")
        .select("*")
        .eq("vertical_type", "real_estate")
        .eq("market_code", code),
      this.db()
        .from("vertical_add_ons")
        .select("*")
        .eq("vertical_type", "real_estate")
        .eq("market_code", code)
        .order("sort_order"),
    ]);
    for (const result of [
      activation,
      config,
      types,
      attributes,
      fieldRules,
      offers,
      prices,
      entitlements,
      addOns,
    ])
      if (result.error) throw result.error;
    if (!activation.data || !config.data)
      return super.getCatalog(code, includeInactive);
    const offerRows = (offers.data || []).map((row: any) => ({
      id: row.id,
      verticalType: "real_estate",
      marketCode: row.market_code,
      audience: row.audience,
      kind: row.kind,
      name: row.name,
      description: row.description,
      prices: (prices.data || [])
        .filter((price: any) => price.offer_id === row.id)
        .map((price: any) => ({
          id: price.id,
          amount: {
            amountMinor: Number(price.amount_minor),
            currency: price.currency,
          },
          billingPeriod: price.billing_period,
          durationDays: price.duration_days ?? undefined,
          trialDays: price.trial_days ?? undefined,
          taxRateBps: price.tax_rate_bps,
          isActive: price.is_active,
        })),
      entitlements: Object.fromEntries(
        (entitlements.data || [])
          .filter((entry: any) => entry.offer_id === row.id)
          .map((entry: any) => [
            entry.entitlement_key,
            entry.entitlement_value,
          ]),
      ),
      isActive: row.is_active,
      isRecommended: row.is_recommended,
      sortOrder: row.sort_order,
    }));
    const catalog = realEstateCatalogSchema.parse({
      activation: {
        marketCode: activation.data.market_code,
        verticalType: "real_estate",
        categoryIds: activation.data.category_ids,
        subcategoryIds: activation.data.subcategory_ids,
        schemaVersion: activation.data.schema_version,
        isActive: activation.data.is_active,
        featureFlags: activation.data.feature_flags,
      },
      config: {
        marketCode: config.data.market_code,
        schemaVersion: config.data.schema_version,
        locale: config.data.locale,
        currency: config.data.currency,
        timezone: config.data.timezone,
        isEnabled: config.data.is_enabled,
        defaultSearchRadiusKm: config.data.default_search_radius_km,
        leadRetentionDays: config.data.lead_retention_days,
        draftRetentionDays: config.data.draft_retention_days,
        approximateLocationRadiusM: config.data.approximate_location_radius_m,
        featureFlags: config.data.feature_flags,
        regulatoryContentVersion: config.data.regulatory_content_version,
      },
      propertyTypes: (types.data || []).map((row: any) => ({
        type: row.type,
        marketCode: row.market_code,
        slug: row.slug,
        label: row.label,
        description: row.description,
        iconName: row.icon_name,
        transactionTypes: row.transaction_types,
        requiredFieldIds: row.required_field_ids,
        filterFieldIds: row.filter_field_ids,
        schemaVersion: row.schema_version,
        isActive: row.is_active,
        sortOrder: row.sort_order,
      })),
      attributes: (attributes.data || []).map((row: any) => ({
        id: row.id,
        marketCode: row.market_code,
        propertyTypes: row.property_types,
        transactionTypes: row.transaction_types,
        label: row.label,
        helpText: row.help_text ?? undefined,
        fieldType: row.field_type,
        unit: row.unit ?? undefined,
        options: row.options ?? undefined,
        privacy: row.privacy,
        isRequired: row.is_required,
        isFilterable: row.is_filterable,
        isActive: row.is_active,
        schemaVersion: row.schema_version,
        sortOrder: row.sort_order,
      })),
      fieldRules: (fieldRules.data || []).map((row: any) => ({
        id: row.id,
        marketCode: row.market_code,
        propertyType: row.property_type ?? undefined,
        transactionType: row.transaction_type ?? undefined,
        fieldId: row.field_id,
        requirement: row.requirement,
        condition: row.condition_payload || {},
        schemaVersion: row.schema_version,
        isActive: row.is_active,
      })),
      offers: offerRows,
      addOns: (addOns.data || []).map((row: any) => ({
        id: row.id,
        verticalType: "real_estate",
        marketCode: row.market_code,
        categoryIds: row.category_ids,
        geographicAreaIds: row.geographic_area_ids,
        type: row.type,
        name: row.name,
        description: row.description,
        price: {
          amountMinor: Number(row.amount_minor),
          currency: row.currency,
        },
        taxRateBps: row.tax_rate_bps,
        validityDays: row.validity_days ?? undefined,
        creditQuantity: row.credit_quantity ?? undefined,
        scheduleModes: row.schedule_modes,
        isActive: row.is_active,
        sortOrder: row.sort_order,
      })),
    });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      propertyTypes: catalog.propertyTypes.filter((row) => row.isActive),
      attributes: catalog.attributes.filter((row) => row.isActive),
      fieldRules: catalog.fieldRules.filter((row) => row.isActive),
      offers: catalog.offers.filter((row) => row.isActive),
      addOns: catalog.addOns.filter((row) => row.isActive),
    };
  }

  private point(value: unknown) {
    if (
      value &&
      typeof value === "object" &&
      "coordinates" in value &&
      Array.isArray((value as { coordinates: unknown }).coordinates)
    ) {
      const [longitude, latitude] = (value as { coordinates: number[] })
        .coordinates;
      return { latitude, longitude };
    }
    const match =
      typeof value === "string"
        ? value.match(/POINT\(([-\d.]+) ([-\d.]+)\)/)
        : null;
    return match
      ? { longitude: Number(match[1]), latitude: Number(match[2]) }
      : { longitude: 0, latitude: 0 };
  }

  private mapProperty(row: any): PropertyPrivate {
    const contract = row.custom_attributes?._contract || {};
    const location = this.point(row.location_point);
    const media = (row.real_estate_media || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    );
    const documents = row.real_estate_private_documents || [];
    const { _contract: _privateContract, ...customAttributes } =
      row.custom_attributes || {};
    return propertyPrivateSchema.parse({
      id: row.id,
      listingId: row.listing_id || row.id,
      slug: row.slug,
      schemaVersion: row.schema_version,
      marketCodes: [row.market_code],
      propertyType: row.property_type,
      transactionType: row.transaction_type,
      lifecycle: row.lifecycle,
      title: row.title,
      description: row.description,
      financials: {
        price: { amountMinor: Number(row.price_minor), currency: row.currency },
        charges:
          row.charges_minor == null
            ? undefined
            : {
                amountMinor: Number(row.charges_minor),
                currency: row.currency,
              },
        agencyFees:
          row.agency_fees_minor == null
            ? undefined
            : {
                amountMinor: Number(row.agency_fees_minor),
                currency: row.currency,
              },
        deposit:
          row.deposit_minor == null
            ? undefined
            : {
                amountMinor: Number(row.deposit_minor),
                currency: row.currency,
              },
        pricePerSquareMeter:
          row.price_per_sqm_minor == null
            ? undefined
            : {
                amountMinor: Number(row.price_per_sqm_minor),
                currency: row.currency,
              },
        period: row.price_period,
        feesPaidBy: contract.financials?.feesPaidBy || "not_applicable",
        isNegotiable: contract.financials?.isNegotiable || false,
      },
      characteristics: {
        livingAreaSquareMeters: Number(row.living_area_sqm),
        landAreaSquareMeters:
          row.land_area_sqm == null ? undefined : Number(row.land_area_sqm),
        rooms: row.rooms,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        floor: row.floor ?? undefined,
        floorCount: row.floor_count ?? undefined,
        isFurnished: row.furnished ?? undefined,
        condition: contract.characteristics?.condition || "good",
        hasLift: contract.characteristics?.hasLift,
        constructionYear: contract.characteristics?.constructionYear,
        heatingType: contract.characteristics?.heatingType,
        energyType: contract.characteristics?.energyType,
        amenities: row.amenities || [],
        accessibilityFeatures: row.accessibility_features || [],
        availabilityDate: contract.characteristics?.availabilityDate,
      },
      energy: {
        ...(contract.energy || {}),
        dpeClass: row.dpe_class ?? undefined,
        gesClass: row.ges_class ?? undefined,
      },
      regulatory: row.regulatory_payload,
      address: {
        city: row.city,
        postalCode: row.postal_code,
        administrativeArea: contract.address?.administrativeArea,
        countryCode: row.market_code,
        ...location,
        precision: row.location_precision,
        publicLabel: row.public_location_label,
        exactAddress: row.exact_address_private ?? undefined,
      },
      media: {
        photos: media
          .filter((item: any) => item.type === "photo")
          .map((item: any) => item.public_url),
        floorPlans: media
          .filter((item: any) => item.type === "floor_plan")
          .map((item: any) => item.public_url),
        videoUrl: media.find((item: any) => item.type === "video")?.public_url,
        virtualTourUrl: media.find((item: any) => item.type === "virtual_tour")
          ?.public_url,
      },
      seller: row.seller_public_payload,
      promotion: {
        ...row.promotion_payload,
        urgent: row.is_urgent,
        featured: row.is_featured,
        sponsored: row.is_sponsored,
      },
      customAttributes,
      moderationStatus: row.moderation_status,
      moderationReason: row.moderation_reason ?? undefined,
      documents: documents.map((item: any) => ({
        id: item.id,
        type: item.document_type,
        status: item.status,
        privateStorageKey: item.private_storage_key,
        issuedAt: item.issued_at ?? undefined,
        expiresAt: item.expires_at ?? undefined,
        reviewLabel: item.review_label ?? undefined,
      })),
      createdByUserId: row.created_by_user_id,
      ownerUserId: row.owner_user_id ?? undefined,
      organizationId: row.organization_id ?? undefined,
      branchId: row.branch_id ?? undefined,
      planId: contract.planId,
      riskSignals: row.risk_signals_private || [],
      createdAt: row.created_at,
      publishedAt: row.published_at ?? undefined,
      sortDate: row.sort_date,
    });
  }

  override async search(query: PropertySearchQuery) {
    let spatialIds: string[] | undefined;
    if (query.boundingBox || (query.center && query.radiusKm !== undefined)) {
      const { data, error } = await this.db().rpc(
        "search_real_estate_property_ids_spatial",
        {
          p_market_code: query.marketCode,
          p_center_latitude: query.center?.latitude,
          p_center_longitude: query.center?.longitude,
          p_radius_km: query.radiusKm,
          p_north: query.boundingBox?.north,
          p_east: query.boundingBox?.east,
          p_south: query.boundingBox?.south,
          p_west: query.boundingBox?.west,
        },
      );
      if (error) throw error;
      const ids = (data || []).map((row: { id: string }) => row.id);
      spatialIds = ids;
      if (!ids.length)
        return {
          items: [],
          total: 0,
          pageInfo: { hasNextPage: false },
        };
    }
    let builder = this.db()
      .from("real_estate_properties")
      .select("*, real_estate_media(*)", { count: "exact" })
      .eq("market_code", query.marketCode)
      .eq("lifecycle", "published")
      .eq("moderation_status", "approved");
    if (spatialIds) builder = builder.in("id", spatialIds);
    if (query.transactionTypes?.length)
      builder = builder.in("transaction_type", query.transactionTypes);
    if (query.propertyTypes?.length)
      builder = builder.in("property_type", query.propertyTypes);
    if (query.city) builder = builder.ilike("city", `%${query.city}%`);
    if (query.minPriceMinor !== undefined)
      builder = builder.gte("price_minor", query.minPriceMinor);
    if (query.maxPriceMinor !== undefined)
      builder = builder.lte("price_minor", query.maxPriceMinor);
    if (query.minPricePerSquareMeterMinor !== undefined)
      builder = builder.gte(
        "price_per_sqm_minor",
        query.minPricePerSquareMeterMinor,
      );
    if (query.maxPricePerSquareMeterMinor !== undefined)
      builder = builder.lte(
        "price_per_sqm_minor",
        query.maxPricePerSquareMeterMinor,
      );
    if (query.minSurfaceSquareMeters !== undefined)
      builder = builder.gte("living_area_sqm", query.minSurfaceSquareMeters);
    if (query.maxSurfaceSquareMeters !== undefined)
      builder = builder.lte("living_area_sqm", query.maxSurfaceSquareMeters);
    if (query.minRooms !== undefined)
      builder = builder.gte("rooms", query.minRooms);
    if (query.minBedrooms !== undefined)
      builder = builder.gte("bedrooms", query.minBedrooms);
    if (query.furnished !== undefined)
      builder = builder.eq("furnished", query.furnished);
    if (query.dpeClasses?.length)
      builder = builder.in("dpe_class", query.dpeClasses);
    if (query.amenities?.length)
      builder = builder.contains("amenities", query.amenities);
    if (query.sellerTypes?.length)
      builder = builder.in("seller_type", query.sellerTypes);
    if (query.query)
      builder = builder.textSearch("search_vector", query.query, {
        config: "simple",
        type: "websearch",
      });
    const offset = Math.max(0, Number(query.cursor || 0));
    builder =
      query.sort === "promoted"
        ? builder
            .order("is_sponsored", { ascending: false })
            .order("is_featured", { ascending: false })
            .order("is_urgent", { ascending: false })
            .order("sort_date", { ascending: false })
        : query.sort === "price_asc"
          ? builder.order("price_minor", { ascending: true })
          : query.sort === "price_desc"
            ? builder.order("price_minor", { ascending: false })
            : query.sort === "surface_desc"
              ? builder.order("living_area_sqm", { ascending: false })
              : builder.order("sort_date", { ascending: false });
    const { data, error, count } = await builder.range(
      offset,
      offset + query.limit - 1,
    );
    if (error) throw error;
    const rows = (data || []).map((row: any) => this.mapProperty(row));
    const total = count || 0;
    return {
      items: rows.map(toPublic),
      total,
      pageInfo: {
        hasNextPage: offset + rows.length < total,
        nextCursor:
          offset + rows.length < total
            ? String(offset + rows.length)
            : undefined,
      },
    };
  }

  override async getProperty(idOrSlug: string) {
    const { data, error } = await this.db()
      .from("real_estate_properties")
      .select("*, real_estate_media(*), real_estate_private_documents(*)")
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapProperty(data) : null;
  }

  override async saveProperty(property: PropertyPrivate) {
    const parsed = propertyPrivateSchema.parse(property);
    const internalContract = {
      financials: {
        feesPaidBy: parsed.financials.feesPaidBy,
        isNegotiable: parsed.financials.isNegotiable,
      },
      characteristics: parsed.characteristics,
      energy: parsed.energy,
      address: { administrativeArea: parsed.address.administrativeArea },
      planId: parsed.planId,
    };
    const { error } = await this.db()
      .from("real_estate_properties")
      .upsert({
        id: parsed.id,
        listing_id: parsed.listingId,
        created_by_user_id: parsed.createdByUserId,
        owner_user_id: parsed.ownerUserId,
        organization_id: parsed.organizationId,
        branch_id: parsed.branchId,
        market_code: parsed.marketCodes[0],
        slug: parsed.slug,
        schema_version: parsed.schemaVersion,
        property_type: parsed.propertyType,
        transaction_type: parsed.transactionType,
        seller_type: parsed.seller.type,
        lifecycle: parsed.lifecycle,
        title: parsed.title,
        description: parsed.description,
        price_minor: parsed.financials.price.amountMinor,
        currency: parsed.financials.price.currency,
        price_period: parsed.financials.period,
        charges_minor: parsed.financials.charges?.amountMinor,
        agency_fees_minor: parsed.financials.agencyFees?.amountMinor,
        deposit_minor: parsed.financials.deposit?.amountMinor,
        price_per_sqm_minor: parsed.financials.pricePerSquareMeter?.amountMinor,
        living_area_sqm: parsed.characteristics.livingAreaSquareMeters,
        land_area_sqm: parsed.characteristics.landAreaSquareMeters,
        rooms: parsed.characteristics.rooms,
        bedrooms: parsed.characteristics.bedrooms,
        bathrooms: parsed.characteristics.bathrooms,
        floor: parsed.characteristics.floor,
        floor_count: parsed.characteristics.floorCount,
        furnished: parsed.characteristics.isFurnished,
        dpe_class: parsed.energy.dpeClass,
        ges_class: parsed.energy.gesClass,
        city: parsed.address.city,
        postal_code: parsed.address.postalCode,
        public_location_label: parsed.address.publicLabel,
        location_precision: parsed.address.precision,
        location_point: `POINT(${parsed.address.longitude} ${parsed.address.latitude})`,
        exact_address_private: parsed.address.exactAddress,
        amenities: parsed.characteristics.amenities,
        accessibility_features: parsed.characteristics.accessibilityFeatures,
        custom_attributes: {
          ...parsed.customAttributes,
          _contract: internalContract,
        },
        regulatory_payload: parsed.regulatory,
        seller_public_payload: parsed.seller,
        promotion_payload: parsed.promotion,
        is_urgent: parsed.promotion.urgent,
        is_featured: parsed.promotion.featured,
        is_sponsored: parsed.promotion.sponsored,
        moderation_status: parsed.moderationStatus,
        moderation_reason: parsed.moderationReason,
        risk_signals_private: parsed.riskSignals,
        published_at: parsed.publishedAt,
        sort_date: parsed.sortDate,
        created_at: parsed.createdAt,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    await Promise.all([
      this.db().from("real_estate_media").delete().eq("property_id", parsed.id),
      this.db()
        .from("real_estate_private_documents")
        .delete()
        .eq("property_id", parsed.id),
    ]);
    const media = [
      ...parsed.media.photos.map((publicUrl, index) => ({
        property_id: parsed.id,
        type: "photo",
        public_url: publicUrl,
        sort_order: index,
      })),
      ...parsed.media.floorPlans.map((publicUrl, index) => ({
        property_id: parsed.id,
        type: "floor_plan",
        public_url: publicUrl,
        sort_order: index,
      })),
      ...(parsed.media.videoUrl
        ? [
            {
              property_id: parsed.id,
              type: "video",
              public_url: parsed.media.videoUrl,
              sort_order: 0,
            },
          ]
        : []),
      ...(parsed.media.virtualTourUrl
        ? [
            {
              property_id: parsed.id,
              type: "virtual_tour",
              public_url: parsed.media.virtualTourUrl,
              sort_order: 0,
            },
          ]
        : []),
    ];
    if (media.length) {
      const result = await this.db().from("real_estate_media").insert(media);
      if (result.error) throw result.error;
    }
    const documents = parsed.documents
      .filter((item) => item.privateStorageKey)
      .map((item) => ({
        id: item.id,
        property_id: parsed.id,
        document_type: item.type,
        status: item.status,
        private_storage_key: item.privateStorageKey,
        issued_at: item.issuedAt,
        expires_at: item.expiresAt,
        review_label: item.reviewLabel,
      }));
    if (documents.length) {
      const result = await this.db()
        .from("real_estate_private_documents")
        .insert(documents);
      if (result.error) throw result.error;
    }
    return parsed;
  }

  override async assessRisk(candidate: {
    excludePropertyId?: string;
    title: string;
    description: string;
    priceMinor: number;
    city: string;
    mediaUrls: string[];
  }) {
    const { data, error } = await this.db()
      .from("real_estate_properties")
      .select(
        "id,title,description,price_minor,city,real_estate_media(public_url)",
      )
      .eq("city", candidate.city)
      .limit(100);
    if (error) throw error;
    const signals = new Set<string>();
    for (const row of data || []) {
      if (row.id === candidate.excludePropertyId) continue;
      if (
        row.description.trim().toLowerCase() ===
        candidate.description.trim().toLowerCase()
      )
        signals.add("reused_description");
      if (
        (row.real_estate_media || []).some((media: any) =>
          candidate.mediaUrls.includes(media.public_url),
        )
      )
        signals.add("duplicate_photo");
      if (
        candidate.priceMinor > 0 &&
        Number(row.price_minor) > candidate.priceMinor * 3
      )
        signals.add("suspicious_price");
    }
    return Array.from(signals);
  }

  private mapLead(row: any): PropertyLead {
    return propertyLeadSchema.parse({
      id: row.id,
      propertyId: row.property_id,
      organizationId: row.organization_id ?? undefined,
      requesterUserId: row.requester_user_id ?? undefined,
      type: row.type,
      status: row.status,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email_private,
      requesterPhone: row.requester_phone_private ?? undefined,
      message: row.message_private,
      desiredMoveDate: row.desired_move_date ?? undefined,
      preferredContactChannel: row.preferred_contact_channel,
      consentGiven: row.consent_given,
      qualificationAnswers: row.qualification_answers_private || {},
      assignedUserId: row.assigned_user_id ?? undefined,
      nextReminderAt: row.next_reminder_at ?? undefined,
      firstRespondedAt: row.first_responded_at ?? undefined,
      duplicateOfLeadId: row.duplicate_of_lead_id ?? undefined,
      contactDetailsReleased: row.contact_details_released,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapLeadNote(row: any): PropertyLeadNote {
    return propertyLeadNoteSchema.parse({
      id: row.id,
      leadId: row.lead_id,
      authorUserId: row.author_user_id,
      body: row.note_private,
      createdAt: row.created_at,
    });
  }

  override async getLead(id: string) {
    const { data, error } = await this.db()
      .from("real_estate_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapLead(data) : null;
  }

  override async saveLeadNote(note: PropertyLeadNote) {
    const parsed = propertyLeadNoteSchema.parse(note);
    const { data, error } = await this.db()
      .from("real_estate_lead_notes")
      .upsert({
        id: parsed.id,
        lead_id: parsed.leadId,
        author_user_id: parsed.authorUserId,
        note_private: parsed.body,
        created_at: parsed.createdAt,
      })
      .select("*")
      .single();
    if (error) throw error;
    return this.mapLeadNote(data);
  }

  override async findDuplicateLead(
    propertyId: string,
    email: string,
    type: PropertyLead["type"],
  ) {
    const { data, error } = await this.db()
      .from("real_estate_leads")
      .select("*")
      .eq("property_id", propertyId)
      .eq("requester_email_private", email.toLowerCase())
      .eq("type", type)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapLead(data) : null;
  }

  override async saveLead(lead: PropertyLead) {
    const parsed = propertyLeadSchema.parse(lead);
    const { error } = await this.db()
      .from("real_estate_leads")
      .upsert({
        id: parsed.id,
        property_id: parsed.propertyId,
        organization_id: parsed.organizationId,
        requester_user_id: parsed.requesterUserId,
        type: parsed.type,
        status: parsed.status,
        requester_name: parsed.requesterName,
        requester_email_private: parsed.requesterEmail.toLowerCase(),
        requester_phone_private: parsed.requesterPhone,
        message_private: parsed.message,
        desired_move_date: parsed.desiredMoveDate,
        preferred_contact_channel: parsed.preferredContactChannel,
        consent_given: parsed.consentGiven,
        qualification_answers_private: parsed.qualificationAnswers,
        assigned_user_id: parsed.assignedUserId,
        next_reminder_at: parsed.nextReminderAt,
        first_responded_at: parsed.firstRespondedAt,
        duplicate_of_lead_id: parsed.duplicateOfLeadId,
        contact_details_released: parsed.contactDetailsReleased,
        spam_fingerprint: hash(
          `${parsed.propertyId}:${parsed.requesterEmail}:${parsed.type}`,
        ),
        created_at: parsed.createdAt,
        updated_at: parsed.updatedAt,
      });
    if (error) throw error;
    return parsed;
  }

  override async saveAppointment(appointment: PropertyAppointment) {
    const parsed = propertyAppointmentSchema.parse(appointment);
    const { error } = await this.db().from("real_estate_appointments").upsert({
      id: parsed.id,
      property_id: parsed.propertyId,
      lead_id: parsed.leadId,
      organization_id: parsed.organizationId,
      assigned_user_id: parsed.assignedUserId,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      status: parsed.status,
      private_notes: parsed.privateNotes,
    });
    if (error) throw error;
    return parsed;
  }

  private mapImport(row: any): PropertyImport {
    return propertyImportSchema.parse({
      id: row.id,
      organizationId: row.organization_id,
      type: row.type,
      status: row.status,
      fileName: row.file_name ?? undefined,
      importedCount: row.imported_count,
      rejectedCount: row.rejected_count,
      errorReportKey: row.error_report_key_private ?? undefined,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    });
  }

  override async saveImport(job: PropertyImport) {
    const parsed = propertyImportSchema.parse(job);
    const { error } = await this.db().from("real_estate_imports").upsert({
      id: parsed.id,
      organization_id: parsed.organizationId,
      type: parsed.type,
      status: parsed.status,
      file_name: parsed.fileName,
      imported_count: parsed.importedCount,
      rejected_count: parsed.rejectedCount,
      error_report_key_private: parsed.errorReportKey,
      idempotency_key: parsed.idempotencyKey,
      created_at: parsed.createdAt,
      completed_at: parsed.completedAt,
    });
    if (error) throw error;
    return parsed;
  }

  override async getImportByIdempotency(organizationId: string, key: string) {
    const { data, error } = await this.db()
      .from("real_estate_imports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapImport(data) : null;
  }

  override async getAgencyWorkspace(
    organizationId: string,
  ): Promise<AgencyWorkspace | null> {
    const [
      agency,
      branches,
      members,
      properties,
      leads,
      appointments,
      imports,
      drafts,
    ] = await Promise.all([
      this.db()
        .from("real_estate_agencies")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      this.db()
        .from("real_estate_branches")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
      this.db()
        .from("real_estate_agency_members")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      this.db()
        .from("real_estate_properties")
        .select("*, real_estate_media(*), real_estate_private_documents(*)")
        .eq("organization_id", organizationId)
        .order("sort_date", { ascending: false }),
      this.db()
        .from("real_estate_leads")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      this.db()
        .from("real_estate_appointments")
        .select("*")
        .eq("organization_id", organizationId)
        .order("starts_at", { ascending: true }),
      this.db()
        .from("real_estate_imports")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      this.db()
        .from("real_estate_drafts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false }),
    ]);
    for (const result of [
      agency,
      branches,
      members,
      properties,
      leads,
      appointments,
      imports,
      drafts,
    ])
      if (result.error) throw result.error;
    if (!agency.data) return null;
    const leadIds = (leads.data || []).map((row: any) => row.id);
    const leadNotes = leadIds.length
      ? await this.db()
          .from("real_estate_lead_notes")
          .select("*")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (leadNotes.error) throw leadNotes.error;
    const memberIds = (members.data || []).map((row: any) => row.user_id);
    const checkouts = memberIds.length
      ? await this.db()
          .from("vertical_checkouts")
          .select("*")
          .eq("vertical_type", "real_estate")
          .in("account_id", memberIds)
          .in("status", ["paid", "refunded"])
          .not("invoice_id", "is", null)
          .order("updated_at", { ascending: false })
      : { data: [], error: null };
    if (checkouts.error) throw checkouts.error;
    const propertyRows: PropertyPrivate[] = (properties.data || []).map(
      (row: any) => this.mapProperty(row),
    );
    const leadRows: PropertyLead[] = (leads.data || []).map((row: any) =>
      this.mapLead(row),
    );
    const appointmentRows: PropertyAppointment[] = (
      appointments.data || []
    ).map((row: any) =>
      propertyAppointmentSchema.parse({
        id: row.id,
        propertyId: row.property_id,
        leadId: row.lead_id,
        organizationId: row.organization_id ?? undefined,
        assignedUserId: row.assigned_user_id ?? undefined,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        privateNotes: row.private_notes ?? undefined,
      }),
    );
    const settings = agency.data.settings || {};
    const publicPayload = agency.data.public_payload || {};
    const currentOfferId = settings.planId || "immo_agency_starter";
    const currentOffer = (
      await this.getCatalog(agency.data.market_code, true)
    ).offers.find((offer) => offer.id === currentOfferId);
    return {
      organization: {
        id: agency.data.organization_id,
        name: publicPayload.name || "Agence immobilière",
        slug: agency.data.slug,
        planId: settings.planId || "immo_agency_starter",
        verificationStatus: agency.data.verification_status,
        branchCount: (branches.data || []).length,
        memberCount: (members.data || []).length,
        profile: {
          description: String(publicPayload.description || ""),
          website: publicPayload.website || undefined,
          publicEmail: publicPayload.publicEmail || undefined,
          publicPhone: publicPayload.publicPhone || undefined,
        },
      },
      properties: propertyRows,
      drafts: (drafts.data || []).map((data: any) =>
        propertyDraftSchema.parse({
          id: data.id,
          ownerUserId: data.owner_user_id,
          organizationId: data.organization_id ?? undefined,
          schemaVersion: data.schema_version,
          marketCode: data.market_code,
          currentStep: data.current_step,
          completedSteps: data.completed_steps,
          data: data.draft_payload,
          validationIssues: data.validation_issues,
          updatedAt: data.updated_at,
        }),
      ),
      leads: leadRows,
      leadNotes: (leadNotes.data || []).map((row: any) =>
        this.mapLeadNote(row),
      ),
      appointments: appointmentRows,
      imports: (imports.data || []).map((row: any) => this.mapImport(row)),
      metrics: {
        activeProperties: propertyRows.filter((row) =>
          ["pending_review", "published", "reserved"].includes(row.lifecycle),
        ).length,
        newLeads: leadRows.filter((row) => row.status === "new").length,
        upcomingVisits: appointmentRows.filter(
          (row) =>
            ["requested", "confirmed"].includes(row.status) &&
            new Date(row.startsAt).getTime() > Date.now(),
        ).length,
        responseRatePercent: Number(settings.responseRatePercent || 0),
        medianResponseMinutes: Number(settings.medianResponseMinutes || 0),
        views: Number(settings.views || 0),
        searchToContactRatePercent: Number(
          settings.searchToContactRatePercent || 0,
        ),
      },
      visibilityCredits: {
        available: Number(settings.visibilityCreditsAvailable || 0),
        included: Number(settings.visibilityCreditsIncluded || 0),
      },
      subscription: {
        offerId: currentOfferId,
        offerName: currentOffer?.name || currentOfferId,
        status: settings.subscriptionStatus || "active",
        renewsAt: settings.subscriptionRenewsAt || undefined,
        trialEndsAt: settings.subscriptionTrialEndsAt || undefined,
      },
      invoices: (checkouts.data || []).map((row: any) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        offerId: row.offer_id ?? undefined,
        total: { amountMinor: row.total_minor, currency: row.currency },
        status: row.status,
        issuedAt: row.updated_at,
      })),
      integrationSettings: {
        csvImportEnabled: Boolean(settings.csvImportEnabled ?? true),
        xmlImportEnabled: Boolean(settings.xmlImportEnabled ?? false),
        automaticSyncEnabled: Boolean(settings.automaticSyncEnabled ?? false),
        apiAccessEnabled: Boolean(settings.apiAccessEnabled ?? false),
        lastSuccessfulSyncAt: settings.lastSuccessfulSyncAt || undefined,
      },
      members: (members.data || []).map((row: any) => ({
        id: row.user_id,
        name: settings.memberNames?.[row.user_id] || "Membre de l’agence",
        role: row.role,
        branchIds: row.branch_ids || [],
      })),
      branches: (branches.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        activePropertyCount: propertyRows.filter(
          (property) =>
            property.branchId === row.id &&
            ["pending_review", "published", "reserved"].includes(
              property.lifecycle,
            ),
        ).length,
      })),
    };
  }

  override async getAdminOverview(
    marketCode: string,
  ): Promise<RealEstateAdminOverview> {
    const code = marketCode.toUpperCase();
    const [
      active,
      pending,
      agencies,
      importErrors,
      leads,
      visits,
      checkouts,
      queue,
      analytics,
    ] = await Promise.all([
      this.db()
        .from("real_estate_properties")
        .select("id,created_by_user_id", { count: "exact" })
        .eq("market_code", code)
        .in("lifecycle", ["pending_review", "published", "reserved"]),
      this.db()
        .from("real_estate_properties")
        .select("id", { count: "exact", head: true })
        .eq("market_code", code)
        .eq("moderation_status", "pending"),
      this.db()
        .from("real_estate_agencies")
        .select("organization_id", { count: "exact", head: true })
        .eq("market_code", code)
        .eq("verification_status", "verified"),
      this.db()
        .from("real_estate_imports")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "completed_with_errors"]),
      this.db()
        .from("real_estate_leads")
        .select("id,property_id,created_at,first_responded_at", {
          count: "exact",
        }),
      this.db()
        .from("real_estate_appointments")
        .select("id", { count: "exact", head: true }),
      this.db()
        .from("vertical_checkouts")
        .select(
          "account_id,offer_id,add_on_ids,total_minor,currency,status,created_at",
        )
        .eq("vertical_type", "real_estate")
        .eq("market_code", code)
        .eq("status", "paid"),
      this.db()
        .from("real_estate_properties")
        .select("id,risk_signals_private,created_at")
        .eq("market_code", code)
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),
      this.db()
        .from("real_estate_analytics_events")
        .select("event_name,organization_id,occurred_at,dimensions,value_minor")
        .eq("market_code", code)
        .gte(
          "occurred_at",
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        ),
    ]);
    for (const result of [
      active,
      pending,
      agencies,
      importErrors,
      leads,
      visits,
      checkouts,
      queue,
      analytics,
    ])
      if (result.error) throw result.error;
    const catalog = await this.getCatalog(code, true);
    const paidRows = checkouts.data || [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentPaidRows = paidRows.filter(
      (row: any) => new Date(row.created_at).getTime() >= thirtyDaysAgo,
    );
    const subscriptionOfferIds = new Set(
      catalog.offers
        .filter((offer) => offer.kind === "subscription")
        .map((offer) => offer.id),
    );
    const subscriptionMinor = recentPaidRows
      .filter(
        (row: any) => row.offer_id && subscriptionOfferIds.has(row.offer_id),
      )
      .reduce((sum: number, row: any) => sum + Number(row.total_minor), 0);
    const addOnMinor = recentPaidRows
      .filter((row: any) => (row.add_on_ids || []).length)
      .reduce((sum: number, row: any) => sum + Number(row.total_minor), 0);
    const leadCount = leads.count || 0;
    const activeCount = active.count || 0;
    const responseMinutes = (leads.data || [])
      .filter((row: any) => row.first_responded_at)
      .map((row: any) =>
        Math.max(
          0,
          (new Date(row.first_responded_at).getTime() -
            new Date(row.created_at).getTime()) /
            60_000,
        ),
      )
      .sort((a: number, b: number) => a - b);
    const medianResponseMinutes = responseMinutes.length
      ? responseMinutes[Math.floor(responseMinutes.length / 2)]
      : 0;
    const eventRows = analytics.data || [];
    const searches = eventRows.filter(
      (row: any) => row.event_name === "search_performed",
    ).length;
    const searchContacts = eventRows.filter(
      (row: any) => row.event_name === "search_contacted",
    ).length;
    const workspaceEvents = eventRows.filter(
      (row: any) =>
        row.event_name === "agency_workspace_opened" && row.organization_id,
    );
    const currentAgencies = new Set(
      workspaceEvents
        .filter(
          (row: any) => new Date(row.occurred_at).getTime() >= thirtyDaysAgo,
        )
        .map((row: any) => row.organization_id),
    );
    const previousAgencies = new Set(
      workspaceEvents
        .filter(
          (row: any) => new Date(row.occurred_at).getTime() < thirtyDaysAgo,
        )
        .map((row: any) => row.organization_id),
    );
    const retainedAgencies = Array.from(previousAgencies).filter((id) =>
      currentAgencies.has(id),
    ).length;
    const creatorIds = new Set(
      (active.data || []).map((row: any) => row.created_by_user_id),
    );
    const paidAccountIds = new Set(paidRows.map((row: any) => row.account_id));
    const convertedCreators = Array.from(creatorIds).filter((id) =>
      paidAccountIds.has(id),
    ).length;
    const totalRevenueMinor = paidRows.reduce(
      (sum: number, row: any) => sum + Number(row.total_minor),
      0,
    );
    const trackedCostMinor = eventRows.reduce(
      (sum: number, row: any) =>
        sum +
        (typeof row.dimensions?.costMinor === "number"
          ? row.dimensions.costMinor
          : 0),
      0,
    );
    return {
      catalog,
      metrics: {
        activeProperties: activeCount,
        pendingModeration: pending.count || 0,
        verifiedProfessionals: agencies.count || 0,
        importErrors: importErrors.count || 0,
        leads: leadCount,
        visits: visits.count || 0,
        leadsPerListing: activeCount
          ? Math.round((leadCount / activeCount) * 100) / 100
          : 0,
        medianResponseMinutes: Math.round(medianResponseMinutes),
        searchToContactRatePercent: searches
          ? Math.min(
              100,
              Math.round((searchContacts / searches) * 10_000) / 100,
            )
          : 0,
        agencyRetentionPercent: previousAgencies.size
          ? Math.round((retainedAgencies / previousAgencies.size) * 10_000) /
            100
          : 0,
        freeToPaidConversionPercent: creatorIds.size
          ? Math.round((convertedCreators / creatorIds.size) * 10_000) / 100
          : 0,
        subscriptionMrr: {
          amountMinor: subscriptionMinor,
          currency: code === "FR" ? "EUR" : catalog.config.currency,
        },
        addOnRevenue: {
          amountMinor: addOnMinor,
          currency: catalog.config.currency,
        },
        costPerLead: {
          amountMinor: leadCount ? Math.round(trackedCostMinor / leadCount) : 0,
          currency: catalog.config.currency,
        },
        revenuePerLead: {
          amountMinor: leadCount
            ? Math.round(totalRevenueMinor / leadCount)
            : 0,
          currency: catalog.config.currency,
        },
      },
      moderationQueue: (queue.data || []).map((row: any) => ({
        id: `moderation-${row.id}`,
        propertyId: row.id,
        reasonLabel:
          Array.isArray(row.risk_signals_private) &&
          row.risk_signals_private.length
            ? "Signal interne à examiner"
            : "Validation de publication requise",
        createdAt: row.created_at,
      })),
      syncErrors: [],
    };
  }

  override async updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ) {
    const code = marketCode.toUpperCase();
    const current = (await this.getCatalog(code, true)).config;
    const next = { ...current, ...patch };
    const { error } = await this.db()
      .from("real_estate_market_configs")
      .update({
        schema_version: next.schemaVersion,
        locale: next.locale,
        currency: next.currency,
        timezone: next.timezone,
        is_enabled: next.isEnabled,
        default_search_radius_km: next.defaultSearchRadiusKm,
        lead_retention_days: next.leadRetentionDays,
        draft_retention_days: next.draftRetentionDays,
        approximate_location_radius_m: next.approximateLocationRadiusM,
        feature_flags: next.featureFlags,
        regulatory_content_version: next.regulatoryContentVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("market_code", code);
    if (error) throw error;
    const activation = await this.db()
      .from("vertical_market_activations")
      .update({
        is_active: next.isEnabled,
        feature_flags: next.featureFlags,
        updated_at: new Date().toISOString(),
      })
      .eq("vertical_type", "real_estate")
      .eq("market_code", code);
    if (activation.error) throw activation.error;
    return next;
  }

  override async updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<RealEstateCatalog["offers"][number]>,
  ) {
    const code = marketCode.toUpperCase();
    const current = (await this.getCatalog(code, true)).offers.find(
      (row) => row.id === offerId,
    );
    if (!current) throw new Error("Offre Immo introuvable.");
    const next = { ...current, ...patch, verticalType: "real_estate" as const };
    const { error } = await this.db()
      .from("vertical_offers")
      .update({
        audience: next.audience,
        kind: next.kind,
        name: next.name,
        description: next.description,
        is_active: next.isActive,
        is_recommended: next.isRecommended,
        sort_order: next.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("vertical_type", "real_estate")
      .eq("market_code", code);
    if (error) throw error;
    return next;
  }

  override async updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<RealEstateCatalog["addOns"][number]>,
  ) {
    const code = marketCode.toUpperCase();
    const current = (await this.getCatalog(code, true)).addOns.find(
      (row) => row.id === addOnId,
    );
    if (!current) throw new Error("Option Immo introuvable.");
    const next = { ...current, ...patch, verticalType: "real_estate" as const };
    const { error } = await this.db()
      .from("vertical_add_ons")
      .update({
        type: next.type,
        name: next.name,
        description: next.description,
        amount_minor: next.price.amountMinor,
        currency: next.price.currency,
        tax_rate_bps: next.taxRateBps,
        validity_days: next.validityDays,
        credit_quantity: next.creditQuantity,
        schedule_modes: next.scheduleModes,
        is_active: next.isActive,
        sort_order: next.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", addOnId)
      .eq("vertical_type", "real_estate")
      .eq("market_code", code);
    if (error) throw error;
    return next;
  }

  override async updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ) {
    const code = marketCode.toUpperCase();
    const current = (await this.getCatalog(code, true)).propertyTypes.find(
      (row) => row.type === type,
    );
    if (!current) throw new Error("Type de bien introuvable.");
    const next = { ...current, ...patch };
    const { error } = await this.db()
      .from("real_estate_property_types")
      .update({
        slug: next.slug,
        label: next.label,
        description: next.description,
        icon_name: next.iconName,
        transaction_types: next.transactionTypes,
        required_field_ids: next.requiredFieldIds,
        filter_field_ids: next.filterFieldIds,
        schema_version: next.schemaVersion,
        is_active: next.isActive,
        sort_order: next.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("type", type)
      .eq("market_code", code);
    if (error) throw error;
    return next;
  }

  override async updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ) {
    const code = marketCode.toUpperCase();
    const current = (await this.getCatalog(code, true)).fieldRules.find(
      (row) => row.id === ruleId,
    );
    if (!current) throw new Error("Règle de champ introuvable.");
    const next = { ...current, ...patch, marketCode: code };
    const { error } = await this.db()
      .from("real_estate_field_rules")
      .update({
        property_type: next.propertyType,
        transaction_type: next.transactionType,
        field_id: next.fieldId,
        requirement: next.requirement,
        condition_payload: next.condition,
        schema_version: next.schemaVersion,
        is_active: next.isActive,
      })
      .eq("id", ruleId)
      .eq("market_code", code);
    if (error) throw error;
    return next;
  }

  override async getDraft(id: string) {
    const { data, error } = await this.db()
      .from("real_estate_drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return propertyDraftSchema.parse({
      id: data.id,
      ownerUserId: data.owner_user_id,
      organizationId: data.organization_id ?? undefined,
      schemaVersion: data.schema_version,
      marketCode: data.market_code,
      currentStep: data.current_step,
      completedSteps: data.completed_steps,
      data: data.draft_payload,
      validationIssues: data.validation_issues,
      updatedAt: data.updated_at,
    });
  }
  override async saveDraft(draft: PropertyDraft) {
    const parsed = propertyDraftSchema.parse(draft);
    const { error } = await this.db().from("real_estate_drafts").upsert({
      id: parsed.id,
      owner_user_id: parsed.ownerUserId,
      organization_id: parsed.organizationId,
      market_code: parsed.marketCode,
      schema_version: parsed.schemaVersion,
      current_step: parsed.currentStep,
      completed_steps: parsed.completedSteps,
      draft_payload: parsed.data,
      validation_issues: parsed.validationIssues,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    return parsed;
  }
  override async countActiveProperties(owner: {
    ownerUserId?: string;
    organizationId?: string;
  }) {
    let query = this.db()
      .from("real_estate_properties")
      .select("id", { count: "exact", head: true })
      .in("lifecycle", ["pending_review", "published", "reserved"]);
    query = owner.ownerUserId
      ? query.eq("owner_user_id", owner.ownerUserId)
      : query.eq("organization_id", owner.organizationId);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
  override async getCheckoutByIdempotency(accountId: string, key: string) {
    const { data, error } = await this.db()
      .from("vertical_checkouts")
      .select("*")
      .eq("account_id", accountId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) throw error;
    return data
      ? verticalCheckoutSchema.parse({
          id: data.id,
          verticalType: data.vertical_type,
          marketCode: data.market_code,
          accountId: data.account_id,
          offerId: data.offer_id ?? undefined,
          addOnIds: data.add_on_ids,
          total: {
            amountMinor: Number(data.total_minor),
            currency: data.currency,
          },
          tax: { amountMinor: Number(data.tax_minor), currency: data.currency },
          status: data.status,
          provider: data.provider,
          providerCheckoutId: data.provider_checkout_id ?? undefined,
          providerCheckoutUrl: data.provider_checkout_url ?? undefined,
          providerPaymentId: data.provider_payment_id ?? undefined,
          invoiceId: data.invoice_id ?? undefined,
          idempotencyKey: data.idempotency_key,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        })
      : null;
  }
  override async getCheckout(id: string) {
    const { data, error } = await this.db()
      .from("vertical_checkouts")
      .select("*")
      .eq("id", id)
      .eq("vertical_type", "real_estate")
      .maybeSingle();
    if (error) throw error;
    return data
      ? verticalCheckoutSchema.parse({
          id: data.id,
          verticalType: data.vertical_type,
          marketCode: data.market_code,
          accountId: data.account_id,
          offerId: data.offer_id ?? undefined,
          addOnIds: data.add_on_ids,
          total: {
            amountMinor: Number(data.total_minor),
            currency: data.currency,
          },
          tax: { amountMinor: Number(data.tax_minor), currency: data.currency },
          status: data.status,
          provider: data.provider,
          providerCheckoutId: data.provider_checkout_id ?? undefined,
          providerCheckoutUrl: data.provider_checkout_url ?? undefined,
          providerPaymentId: data.provider_payment_id ?? undefined,
          invoiceId: data.invoice_id ?? undefined,
          idempotencyKey: data.idempotency_key,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        })
      : null;
  }
  override async saveCheckout(checkout: VerticalCheckout) {
    const parsed = verticalCheckoutSchema.parse(checkout);
    const { error } = await this.db().from("vertical_checkouts").upsert({
      id: parsed.id,
      vertical_type: parsed.verticalType,
      market_code: parsed.marketCode,
      account_id: parsed.accountId,
      offer_id: parsed.offerId,
      add_on_ids: parsed.addOnIds,
      total_minor: parsed.total.amountMinor,
      tax_minor: parsed.tax.amountMinor,
      currency: parsed.total.currency,
      status: parsed.status,
      provider: parsed.provider,
      provider_checkout_id: parsed.providerCheckoutId,
      provider_checkout_url: parsed.providerCheckoutUrl,
      provider_payment_id: parsed.providerPaymentId,
      invoice_id: parsed.invoiceId,
      idempotency_key: parsed.idempotencyKey,
      created_at: parsed.createdAt,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    return parsed;
  }
  override async hasWebhookEvent(provider: string, eventId: string) {
    const { data, error } = await this.db()
      .from("vertical_payment_webhook_events")
      .select("provider_event_id")
      .eq("provider", provider)
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  override async saveWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payloadHash: string;
    status: "received" | "processed" | "ignored" | "failed";
  }) {
    const { error } = await this.db()
      .from("vertical_payment_webhook_events")
      .upsert({
        provider: input.provider,
        provider_event_id: input.eventId,
        event_type: input.eventType,
        payload_hash: input.payloadHash,
        status: input.status,
        processed_at:
          input.status === "processed" ? new Date().toISOString() : null,
      });
    if (error) throw error;
  }

  override async trackAnalyticsEvent(event: RealEstateAnalyticsEvent) {
    const { error } = await this.db()
      .from("real_estate_analytics_events")
      .insert({
        event_name: event.eventName,
        market_code: event.marketCode.toUpperCase(),
        property_id: event.propertyId,
        organization_id: event.organizationId,
        anonymous_session_hash: event.anonymousSessionHash,
        dimensions: event.dimensions || {},
        value_minor: event.valueMinor,
        currency: event.currency,
        occurred_at: event.occurredAt || new Date().toISOString(),
      });
    if (error) throw error;
  }
}
