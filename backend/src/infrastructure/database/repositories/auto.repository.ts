import { createHash } from "node:crypto";
import type {
  AutoAdminOverview,
  AutoAddOn,
  AutoCatalog,
  AutoLead,
  AutoMarketConfig,
  AutoPlan,
  DealerWorkspace,
  InventoryImport,
  VehicleDraft,
  VehiclePrivate,
  VehiclePublic,
  VehicleSearchQuery,
  VehicleSearchResponse,
  VehicleTypeConfig,
} from "@shongre/contracts/auto";
import {
  autoLeadSchema,
  autoAddOnSchema,
  dealerStockTransferSchema,
  autoMarketConfigSchema,
  autoPlanSchema,
  vehicleDraftSchema,
  vehiclePrivateSchema,
  vehicleSearchQuerySchema,
  vehicleTypeConfigSchema,
} from "@shongre/contracts/auto";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

const NOW = "2026-08-22T10:00:00.000Z";
const clone = <T>(value: T): T => structuredClone(value);
const fingerprint = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

const BASE_ENTITLEMENTS = {
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
};

export const DEFAULT_AUTO_CONFIG: AutoMarketConfig = {
  vertical: "automotive",
  schemaVersion: 1,
  marketCode: "FR",
  locale: "fr-FR",
  currency: "EUR",
  timezone: "Europe/Paris",
  isEnabled: true,
  comparisonLimit: 4,
  defaultSearchRadiusKm: 50,
  leadRetentionDays: 730,
  featureFlags: {
    verticalEnabled: true,
    comparisonsEnabled: true,
    savedSearchesEnabled: true,
    structuredLeadsEnabled: true,
    appointmentsEnabled: true,
    dealerImportsEnabled: true,
    dealerApiSyncEnabled: false,
    paidOffersEnabled: false,
    secureSaleEnabled: false,
    financingReferralsEnabled: false,
    insuranceReferralsEnabled: false,
    inspectionReferralsEnabled: false,
    warrantyReferralsEnabled: false,
    deliveryReferralsEnabled: false,
    tradeInReferralsEnabled: false,
    boatListingsEnabled: false,
  },
  financingDisclaimer:
    "Estimation mensuelle fournie à titre indicatif, sans décision de crédit ni engagement d’un partenaire financier.",
  priceEstimateDisclaimer:
    "Estimation indicative calculée à partir d’annonces comparables. Elle ne constitue ni une expertise ni une garantie de prix de vente.",
  safetyGuidance: [
    "Vérifiez l’identité du vendeur, le numéro de série et les documents originaux avant tout paiement.",
    "Ne versez jamais d’acompte hors d’un parcours Shongre explicitement sécurisé.",
    "Pour un véhicule immatriculé en France, consultez les informations HistoVec communiquées par le vendeur.",
  ],
  updatedAt: NOW,
};

export const DEFAULT_AUTO_PLANS: AutoPlan[] = [
  {
    id: "auto_private_free",
    marketCode: "FR",
    audience: "individual",
    name: "Particulier Gratuit",
    description:
      "Une annonce active et les outils essentiels pour vendre soi-même.",
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: BASE_ENTITLEMENTS,
  },
  {
    id: "auto_private_secure",
    marketCode: "FR",
    audience: "individual",
    name: "Vente Sérénité",
    description:
      "Accompagnement documentaire et parcours de vente renforcé, activé uniquement quand le service est disponible.",
    monthlyPrice: { amountMinor: 4990, currency: "EUR" },
    durationDays: 30,
    taxRateBps: 2000,
    isActive: true,
    isRecommended: true,
    entitlements: {
      ...BASE_ENTITLEMENTS,
      maxPhotosPerVehicle: 24,
      maxVideosPerVehicle: 1,
      includedUrgentCredits: 1,
      includedBumpCredits: 2,
      includedFeaturedCredits: 1,
      vehicleVideo: true,
      detailedAnalytics: true,
    },
  },
  {
    id: "auto_dealer_starter",
    marketCode: "FR",
    audience: "dealer",
    name: "Dealer Starter",
    description: "Stock, leads et vitrine pour une petite concession.",
    monthlyPrice: { amountMinor: 7900, currency: "EUR" },
    annualPrice: { amountMinor: 79000, currency: "EUR" },
    trialDays: 14,
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: {
      ...BASE_ENTITLEMENTS,
      maxActiveVehicles: 25,
      maxPhotosPerVehicle: 24,
      maxTeamMembers: 3,
      monthlyPromotionCredits: 5,
      inventoryCsvImport: true,
      leadAssignment: true,
      leadReminders: true,
      publicStorefront: true,
      detailedAnalytics: true,
    },
  },
  {
    id: "auto_dealer_growth",
    marketCode: "FR",
    audience: "dealer",
    name: "Dealer Growth",
    description:
      "Capacité renforcée, imports multi-formats, équipe et analyse détaillée.",
    monthlyPrice: { amountMinor: 16900, currency: "EUR" },
    annualPrice: { amountMinor: 169000, currency: "EUR" },
    trialDays: 14,
    taxRateBps: 2000,
    isActive: true,
    isRecommended: true,
    entitlements: {
      ...BASE_ENTITLEMENTS,
      maxActiveVehicles: 120,
      maxPhotosPerVehicle: 40,
      maxVideosPerVehicle: 2,
      maxTeamMembers: 12,
      maxLocations: 3,
      monthlyPromotionCredits: 50,
      inventoryCsvImport: true,
      inventoryXmlImport: true,
      leadAssignment: true,
      leadReminders: true,
      publicStorefront: true,
      vehicleVideo: true,
      vehicleView360: true,
      detailedAnalytics: true,
      prioritySupport: true,
    },
  },
  {
    id: "auto_dealer_network",
    marketCode: "FR",
    audience: "dealer",
    name: "Dealer Network",
    description:
      "Pilotage multi-sites, synchronisation, API et analyse réseau.",
    monthlyPrice: { amountMinor: 39900, currency: "EUR" },
    annualPrice: { amountMinor: 399000, currency: "EUR" },
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: {
      ...BASE_ENTITLEMENTS,
      maxActiveVehicles: 1000,
      maxPhotosPerVehicle: 50,
      maxVideosPerVehicle: 3,
      maxTeamMembers: 75,
      maxLocations: 30,
      monthlyPromotionCredits: 250,
      inventoryCsvImport: true,
      inventoryXmlImport: true,
      inventoryApiSync: true,
      leadAssignment: true,
      leadReminders: true,
      publicStorefront: true,
      vehicleVideo: true,
      vehicleView360: true,
      detailedAnalytics: true,
      networkAnalytics: true,
      apiAccess: true,
      centralizedBilling: true,
      branchPermissions: true,
      stockTransfers: true,
      customPlan: true,
      serviceLevelAgreement: true,
      prioritySupport: true,
    },
  },
];

const TYPE_ROWS: Array<
  [VehicleTypeConfig["type"], string, string, string, boolean]
> = [
  [
    "car",
    "voitures",
    "Voitures",
    "Voitures particulières neuves et d’occasion",
    true,
  ],
  [
    "motorcycle",
    "motos-scooters",
    "Motos & scooters",
    "Deux-roues motorisés",
    true,
  ],
  [
    "utility",
    "utilitaires",
    "Vans & utilitaires",
    "Véhicules utilitaires légers",
    true,
  ],
  [
    "truck",
    "poids-lourds",
    "Poids lourds",
    "Camions et véhicules industriels",
    true,
  ],
  [
    "motorhome",
    "camping-cars-caravanes",
    "Camping-cars & caravanes",
    "Véhicules de loisirs",
    true,
  ],
  [
    "boat",
    "bateaux",
    "Bateaux",
    "Navigation de plaisance — activation par marché",
    false,
  ],
  [
    "agricultural",
    "agricoles",
    "Matériel agricole",
    "Tracteurs et équipements agricoles",
    true,
  ],
  [
    "construction",
    "construction",
    "Engins de chantier",
    "Construction et travaux publics",
    true,
  ],
  [
    "parts",
    "pieces-accessoires",
    "Pièces & accessoires",
    "Pièces, pneus et équipements",
    true,
  ],
  [
    "other",
    "autres-vehicules",
    "Autres véhicules",
    "Véhicules hors catégories principales",
    true,
  ],
];

export const DEFAULT_AUTO_TYPES: VehicleTypeConfig[] = TYPE_ROWS.map(
  ([type, slug, label, description, isActive], index) => ({
    type,
    slug,
    label,
    description,
    iconName:
      type === "car" ? "CarFront" : type === "motorcycle" ? "Bike" : "Truck",
    schemaVersion: 1,
    isActive,
    sortOrder: (index + 1) * 10,
    requiredFieldIds:
      type === "parts"
        ? ["condition", "price"]
        : ["make", "model", "modelYear", "mileage", "fuelType", "price"],
    filterFieldIds:
      type === "parts"
        ? ["condition", "price"]
        : [
            "make",
            "model",
            "modelYear",
            "mileage",
            "fuelType",
            "transmission",
            "price",
          ],
  }),
);

const SELLER = {
  id: "dealer_auto_select_lyon",
  type: "dealer" as const,
  displayName: "Auto Select Lyon",
  slug: "auto-select-lyon",
  locationLabel: "Lyon (69)",
  responseTimeMinutes: 42,
  memberSinceYear: 2019,
  verifiedBusiness: true,
};

function makeVehicle(
  input: Partial<VehiclePrivate> &
    Pick<
      VehiclePrivate,
      | "id"
      | "slug"
      | "title"
      | "makeLabel"
      | "modelLabel"
      | "price"
      | "mediaUrls"
    >,
): VehiclePrivate {
  return vehiclePrivateSchema.parse({
    schemaVersion: 1,
    vertical: "automotive",
    vehicleType: "car",
    lifecycle: "published",
    marketCodes: ["FR"],
    description:
      "Véhicule entretenu, disponible immédiatement. Historique et documents présentés sur demande dans un cadre sécurisé.",
    makeId: input.makeLabel.toLowerCase(),
    modelId: input.modelLabel.toLowerCase().replaceAll(" ", "-"),
    technical: {
      bodyType: "SUV",
      modelYear: 2020,
      firstRegistrationDate: "2020-06-15",
      mileage: 61200,
      mileageUnit: "km",
      fuelType: "petrol",
      transmission: "automatic",
      powerKw: 96,
      powerHp: 130,
      fiscalPower: 7,
      exteriorColor: "Blanc nacré",
      doors: 5,
      seats: 5,
      co2GramsPerKm: 135,
      critAirClass: "1",
    },
    history: {
      condition: "good",
      accidentStatus: "none_declared",
      previousOwnerCount: 1,
      maintenanceBookStatus: "complete",
      inspectionStatus: "valid",
      inspectionValidUntil: "2027-06-01",
      warrantyMonths: 12,
      warrantyLabel: "Garantie commerciale 12 mois",
    },
    priceIncludesTax: true,
    priceNegotiable: false,
    financingAvailable: true,
    financingMonthlyEstimate: { amountMinor: 29300, currency: "EUR" },
    financingDisclaimer: DEFAULT_AUTO_CONFIG.financingDisclaimer,
    locationLabel: "Lyon (69)",
    seller: SELLER,
    equipment: ["GPS", "Caméra de recul", "Régulateur adaptatif", "CarPlay"],
    dynamicAttributes: { upholstery: "Tissu", serviceHistory: true },
    trust: {
      sellerIdentity: "verified",
      professionalBusiness: "verified",
      vinOnFile: true,
      documents: [],
      historyReportStatus: "uploaded_private",
      publicBadges: ["Professionnel vérifié", "Garantie 12 mois"],
    },
    priceEstimate: {
      band: "within_market",
      low: { amountMinor: 1850000, currency: "EUR" },
      high: { amountMinor: 2050000, currency: "EUR" },
      sampleSize: 41,
      generatedAt: NOW,
      disclaimer: DEFAULT_AUTO_CONFIG.priceEstimateDisclaimer,
    },
    promotionLabels: [],
    isFavorite: false,
    publishedAt: "2026-08-04T08:00:00.000Z",
    sortDate: "2026-08-21T09:00:00.000Z",
    updatedAt: NOW,
    dealerOrganizationId: "dealer_auto_select_lyon",
    dealerLocationId: "dealer_location_lyon",
    stockReference: `ASL-${input.id.slice(-4).toUpperCase()}`,
    vinMasked: "VF3**************",
    vinHash: `sha256:${input.id}`,
    moderationStatus: "approved",
    planId: "auto_dealer_growth",
    documents: [],
    riskSignals: [],
    createdAt: "2026-07-18T08:00:00.000Z",
    ...input,
  });
}

export const DEMO_AUTO_VEHICLES: VehiclePrivate[] = [
  makeVehicle({
    id: "vehicle_3008_diesel",
    slug: "peugeot-3008-bluehdi-130-allure-2019",
    title: "Peugeot 3008 BlueHDi 130 S&S BVM6 Allure",
    makeLabel: "Peugeot",
    modelLabel: "3008",
    price: { amountMinor: 1699000, currency: "EUR" },
    mediaUrls: [
      "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80",
    ],
    technical: {
      bodyType: "SUV",
      modelYear: 2019,
      firstRegistrationDate: "2019-03-12",
      mileage: 84500,
      mileageUnit: "km",
      fuelType: "diesel",
      transmission: "manual",
      powerKw: 96,
      powerHp: 130,
      fiscalPower: 6,
      exteriorColor: "Gris Artense",
      doors: 5,
      seats: 5,
      co2GramsPerKm: 112,
      critAirClass: "2",
    },
    promotionLabels: ["sponsored"],
  }),
  makeVehicle({
    id: "vehicle_3008_petrol",
    slug: "peugeot-3008-puretech-130-gt-line-2020",
    title: "Peugeot 3008 PureTech 130 S&S EAT8 GT Line",
    makeLabel: "Peugeot",
    modelLabel: "3008",
    price: { amountMinor: 1949000, currency: "EUR" },
    mediaUrls: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    ],
  }),
  makeVehicle({
    id: "vehicle_3008_hybrid",
    slug: "peugeot-3008-hybrid4-300-2022",
    title: "Peugeot 3008 Hybrid4 300 e-EAT8",
    makeLabel: "Peugeot",
    modelLabel: "3008",
    price: { amountMinor: 2899000, currency: "EUR" },
    mediaUrls: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    ],
    technical: {
      bodyType: "SUV",
      modelYear: 2022,
      firstRegistrationDate: "2022-01-20",
      mileage: 32800,
      mileageUnit: "km",
      fuelType: "plug_in_hybrid",
      transmission: "automatic",
      powerKw: 220,
      powerHp: 300,
      fiscalPower: 10,
      batteryCapacityKwh: 13.2,
      electricRangeKm: 59,
      chargingPowerKw: 7.4,
      exteriorColor: "Bleu Célèbes",
      doors: 5,
      seats: 5,
      co2GramsPerKm: 29,
      critAirClass: "1",
    },
  }),
  makeVehicle({
    id: "vehicle_bmw_x3",
    slug: "bmw-x3-xdrive20d-2022",
    title: "BMW X3 xDrive20d xLine",
    makeLabel: "BMW",
    modelLabel: "X3",
    price: { amountMinor: 3649000, currency: "EUR" },
    mediaUrls: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
    ],
    technical: {
      bodyType: "SUV",
      modelYear: 2022,
      firstRegistrationDate: "2022-09-10",
      mileage: 44200,
      mileageUnit: "km",
      fuelType: "diesel",
      transmission: "automatic",
      powerKw: 140,
      powerHp: 190,
      fiscalPower: 10,
      exteriorColor: "Noir métallisé",
      doors: 5,
      seats: 5,
      co2GramsPerKm: 154,
      critAirClass: "2",
    },
  }),
];

export const DEFAULT_AUTO_CATALOG: AutoCatalog = {
  config: DEFAULT_AUTO_CONFIG,
  vehicleTypes: DEFAULT_AUTO_TYPES,
  attributes: [
    {
      id: "bodyType",
      marketCode: "FR",
      vehicleTypes: ["car", "utility"],
      label: "Carrosserie",
      fieldType: "single_select",
      options: [
        { value: "SUV", label: "SUV", sortOrder: 10 },
        { value: "sedan", label: "Berline", sortOrder: 20 },
      ],
      isRequired: false,
      isFilterable: true,
      isPublic: true,
      sortOrder: 10,
      schemaVersion: 1,
      isActive: true,
    },
    {
      id: "batteryCapacityKwh",
      marketCode: "FR",
      vehicleTypes: ["car", "utility", "motorcycle"],
      label: "Capacité de batterie",
      fieldType: "number",
      unit: "kWh",
      isRequired: false,
      isFilterable: true,
      isPublic: true,
      sortOrder: 20,
      schemaVersion: 1,
      isActive: true,
    },
    {
      id: "electricRangeKm",
      marketCode: "FR",
      vehicleTypes: ["car", "utility", "motorcycle"],
      label: "Autonomie électrique",
      fieldType: "number",
      unit: "km",
      isRequired: false,
      isFilterable: true,
      isPublic: true,
      sortOrder: 30,
      schemaVersion: 1,
      isActive: true,
    },
  ],
  vehicleCatalog: [
    {
      id: "peugeot",
      kind: "make",
      vehicleTypes: ["car", "utility"],
      slug: "peugeot",
      label: "Peugeot",
      isActive: true,
    },
    {
      id: "peugeot-3008",
      kind: "model",
      parentId: "peugeot",
      vehicleTypes: ["car"],
      slug: "3008",
      label: "3008",
      isActive: true,
    },
    {
      id: "bmw",
      kind: "make",
      vehicleTypes: ["car", "motorcycle"],
      slug: "bmw",
      label: "BMW",
      isActive: true,
    },
    {
      id: "bmw-x3",
      kind: "model",
      parentId: "bmw",
      vehicleTypes: ["car"],
      slug: "x3",
      label: "X3",
      isActive: true,
    },
  ],
  plans: DEFAULT_AUTO_PLANS,
  addOns: [
    {
      id: "auto_addon_secure_sale",
      marketCode: "FR",
      type: "secure_sale",
      name: "Vente Sérénité",
      description: "Parcours renforcé, selon disponibilité du service.",
      price: { amountMinor: 4990, currency: "EUR" },
      taxRateBps: 2000,
      isActive: true,
    },
    {
      id: "auto_addon_urgent",
      marketCode: "FR",
      type: "urgent",
      name: "Urgent",
      description: "Signale visiblement le caractère urgent de la vente.",
      price: { amountMinor: 790, currency: "EUR" },
      taxRateBps: 2000,
      validityDays: 7,
      isActive: true,
    },
    {
      id: "auto_addon_bump",
      marketCode: "FR",
      type: "search_bump",
      name: "Remonter l’annonce",
      description:
        "Actualise la date de tri sans modifier la date de publication.",
      price: { amountMinor: 490, currency: "EUR" },
      taxRateBps: 2000,
      validityDays: 1,
      isActive: true,
    },
    {
      id: "auto_addon_featured",
      marketCode: "FR",
      type: "featured",
      name: "À la une",
      description:
        "Emplacement payant identifiable, sous réserve de disponibilité.",
      price: { amountMinor: 1490, currency: "EUR" },
      taxRateBps: 2000,
      validityDays: 7,
      isActive: true,
    },
    ...[
      [
        "auto_addon_homepage",
        "homepage_spotlight",
        "Spotlight accueil",
        2990,
        true,
      ],
      [
        "auto_addon_category",
        "category_spotlight",
        "Spotlight catégorie",
        1990,
        true,
      ],
      [
        "auto_addon_qualified_lead",
        "qualified_lead",
        "Lead acheteur qualifié",
        590,
        true,
      ],
      [
        "auto_addon_sponsored_dealer",
        "sponsored_dealer",
        "Concession sponsorisée",
        4990,
        true,
      ],
      [
        "auto_addon_inspection_referral",
        "inspection_referral",
        "Demande d’inspection",
        0,
        false,
      ],
      [
        "auto_addon_warranty_referral",
        "warranty_referral",
        "Demande de garantie",
        0,
        false,
      ],
      [
        "auto_addon_financing_referral",
        "financing_referral",
        "Demande de financement",
        0,
        false,
      ],
      [
        "auto_addon_insurance_referral",
        "insurance_referral",
        "Demande d’assurance",
        0,
        false,
      ],
      [
        "auto_addon_delivery_referral",
        "delivery_referral",
        "Demande de livraison",
        0,
        false,
      ],
      [
        "auto_addon_trade_in_referral",
        "trade_in_referral",
        "Demande de reprise",
        0,
        false,
      ],
    ].map(([id, type, name, amountMinor, isActive]) => ({
      id: String(id),
      marketCode: "FR" as const,
      type: type as AutoCatalog["addOns"][number]["type"],
      name: String(name),
      description: isActive
        ? "Option commerciale configurable et identifiable."
        : "Réservé à une future intégration partenaire validée.",
      price: { amountMinor: Number(amountMinor), currency: "EUR" as const },
      taxRateBps: 2000,
      isActive: Boolean(isActive),
    })),
  ],
};

const DEMO_LEADS: AutoLead[] = [
  autoLeadSchema.parse({
    id: "lead_auto_1",
    vehicleId: "vehicle_bmw_x3",
    dealerOrganizationId: SELLER.id,
    contactName: "Camille Robert",
    contactEmail: "camille@example.fr",
    contactPhone: "+33600000001",
    intention: "purchase",
    message: "Le véhicule est-il disponible cette semaine ?",
    status: "new",
    source: "vehicle_page",
    marketingConsent: false,
    contactConsentAt: NOW,
    spamAssessment: "clear",
    createdAt: NOW,
    updatedAt: NOW,
  }),
  autoLeadSchema.parse({
    id: "lead_auto_2",
    vehicleId: "vehicle_3008_petrol",
    dealerOrganizationId: SELLER.id,
    contactName: "Nora Petit",
    contactEmail: "nora@example.fr",
    intention: "test_drive",
    message: "Je souhaite comparer puis organiser un essai.",
    status: "qualified",
    assignedUserId: "user_dealer_seller",
    source: "comparison",
    marketingConsent: true,
    contactConsentAt: NOW,
    spamAssessment: "clear",
    nextReminderAt: "2026-08-23T14:00:00.000Z",
    createdAt: NOW,
    updatedAt: NOW,
  }),
];

export interface IAutoRepository {
  getCatalog(
    marketCode: string,
    includeInactive?: boolean,
  ): Promise<AutoCatalog>;
  saveMarketConfig(config: AutoMarketConfig): Promise<AutoMarketConfig>;
  savePlan(plan: AutoPlan): Promise<AutoPlan>;
  saveAddOn(addOn: AutoAddOn): Promise<AutoAddOn>;
  saveVehicleType(
    type: VehicleTypeConfig,
    marketCode: string,
  ): Promise<VehicleTypeConfig>;
  search(query: VehicleSearchQuery): Promise<VehicleSearchResponse>;
  getVehicle(idOrSlug: string): Promise<VehiclePrivate | null>;
  saveVehicle(vehicle: VehiclePrivate): Promise<VehiclePrivate>;
  hasDuplicateIdentity(identity: {
    vinHash?: string;
    registrationHash?: string;
  }): Promise<boolean>;
  assessVehicleRisk(candidate: {
    excludeVehicleId?: string;
    vinHash?: string;
    registrationHash?: string;
    description: string;
    mediaUrls: string[];
    mileage: number;
  }): Promise<VehiclePrivate["riskSignals"]>;
  countActiveVehicles(owner: {
    ownerUserId?: string;
    dealerOrganizationId?: string;
  }): Promise<number>;
  getDraft(id: string): Promise<VehicleDraft | null>;
  saveDraft(draft: VehicleDraft): Promise<VehicleDraft>;
  getDraftIdentity(id: string): Promise<{
    vinHash?: string;
    vinMasked?: string;
    registrationHash?: string;
  } | null>;
  saveDraftIdentity(
    id: string,
    identity: {
      vinHash?: string;
      vinMasked?: string;
      registrationHash?: string;
    },
  ): Promise<void>;
  createInventoryImport(
    job: InventoryImport,
    requestedBy: string,
    marketCode: string,
    idempotencyKey: string,
  ): Promise<InventoryImport>;
  beginProviderEvent(event: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payloadHash: string;
  }): Promise<boolean>;
  updateAddOnPurchaseFromProvider(
    purchaseId: string,
    status: "requires_action" | "paid" | "failed" | "cancelled" | "refunded",
    providerPaymentReference?: string,
  ): Promise<void>;
  completeProviderEvent(
    providerEventId: string,
    processingError?: string,
  ): Promise<void>;
  hasRecentDuplicateLead(
    vehicleId: string,
    contactEmail: string,
  ): Promise<boolean>;
  createLead(lead: AutoLead): Promise<AutoLead>;
  saveLead(lead: AutoLead): Promise<AutoLead>;
  getDealerWorkspace(organizationId: string): Promise<DealerWorkspace | null>;
  getAdminOverview(marketCode: string): Promise<AutoAdminOverview>;
}

function matches(query: VehicleSearchQuery, vehicle: VehiclePrivate) {
  if (
    vehicle.lifecycle !== "published" ||
    !vehicle.marketCodes.includes(query.marketCode)
  )
    return false;
  if (
    query.vehicleTypes?.length &&
    !query.vehicleTypes.includes(vehicle.vehicleType)
  )
    return false;
  if (
    query.makeIds?.length &&
    (!vehicle.makeId || !query.makeIds.includes(vehicle.makeId))
  )
    return false;
  if (
    query.modelIds?.length &&
    (!vehicle.modelId || !query.modelIds.includes(vehicle.modelId))
  )
    return false;
  if (
    query.bodyTypes?.length &&
    (!vehicle.technical.bodyType ||
      !query.bodyTypes.includes(vehicle.technical.bodyType))
  )
    return false;
  if (
    query.fuelTypes?.length &&
    !query.fuelTypes.includes(vehicle.technical.fuelType)
  )
    return false;
  if (
    query.transmissions?.length &&
    !query.transmissions.includes(vehicle.technical.transmission)
  )
    return false;
  if (
    query.sellerTypes?.length &&
    !query.sellerTypes.includes(vehicle.seller.type)
  )
    return false;
  if (
    query.minPriceMinor !== undefined &&
    vehicle.price.amountMinor < query.minPriceMinor
  )
    return false;
  if (
    query.maxPriceMinor !== undefined &&
    vehicle.price.amountMinor > query.maxPriceMinor
  )
    return false;
  if (
    query.minYear !== undefined &&
    vehicle.technical.modelYear < query.minYear
  )
    return false;
  if (
    query.maxYear !== undefined &&
    vehicle.technical.modelYear > query.maxYear
  )
    return false;
  if (
    query.maxMileage !== undefined &&
    vehicle.technical.mileage > query.maxMileage
  )
    return false;
  if (
    query.minPowerHp !== undefined &&
    (vehicle.technical.powerHp || 0) < query.minPowerHp
  )
    return false;
  if (
    query.maxPowerHp !== undefined &&
    (vehicle.technical.powerHp || 0) > query.maxPowerHp
  )
    return false;
  if (
    query.minBatteryCapacityKwh !== undefined &&
    (vehicle.technical.batteryCapacityKwh || 0) < query.minBatteryCapacityKwh
  )
    return false;
  if (
    query.minElectricRangeKm !== undefined &&
    (vehicle.technical.electricRangeKm || 0) < query.minElectricRangeKm
  )
    return false;
  if (
    query.city &&
    !vehicle.locationLabel.toLowerCase().includes(query.city.toLowerCase())
  )
    return false;
  if (query.warrantyOnly && !vehicle.history.warrantyMonths) return false;
  if (query.financingAvailable && !vehicle.financingAvailable) return false;
  for (const [key, values] of Object.entries(query.dynamicAttributes || {})) {
    if (!values.length) continue;
    const actual = vehicle.dynamicAttributes[key];
    const actualValues = Array.isArray(actual)
      ? actual.map(String)
      : [String(actual)];
    if (!values.some((value) => actualValues.includes(value))) return false;
  }
  if (
    query.query &&
    !`${vehicle.title} ${vehicle.description} ${vehicle.makeLabel} ${vehicle.modelLabel}`
      .toLowerCase()
      .includes(query.query.toLowerCase())
  )
    return false;
  return true;
}

function toPublic(vehicle: VehiclePrivate): VehiclePublic {
  const {
    ownerUserId: _owner,
    dealerOrganizationId: _org,
    dealerLocationId: _location,
    stockReference: _stock,
    vinMasked: _vinMasked,
    vinHash: _vinHash,
    registrationHash: _registration,
    moderationStatus: _moderation,
    moderationReason: _reason,
    planId: _plan,
    documents: _documents,
    riskSignals: _risks,
    createdAt: _created,
    ...publicVehicle
  } = vehicle;
  return publicVehicle;
}

export class DemoAutoRepository implements IAutoRepository {
  private catalog = clone(DEFAULT_AUTO_CATALOG);
  private vehicles = new Map(
    DEMO_AUTO_VEHICLES.map((vehicle) => [vehicle.id, clone(vehicle)]),
  );
  private leads = new Map(DEMO_LEADS.map((lead) => [lead.id, clone(lead)]));
  private drafts = new Map<string, VehicleDraft>();
  private draftIdentities = new Map<
    string,
    { vinHash?: string; vinMasked?: string; registrationHash?: string }
  >();
  private importJobs = new Map<string, InventoryImport>();
  private providerEvents = new Set<string>();

  async getCatalog(marketCode: string, includeInactive = false) {
    const catalog = clone({
      ...this.catalog,
      config: { ...this.catalog.config, marketCode: marketCode.toUpperCase() },
    });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      vehicleTypes: catalog.vehicleTypes.filter((row) => row.isActive),
      attributes: catalog.attributes.filter((row) => row.isActive),
      vehicleCatalog: catalog.vehicleCatalog.filter((row) => row.isActive),
      plans: catalog.plans.filter((row) => row.isActive),
      addOns: catalog.addOns.filter((row) => row.isActive),
    };
  }
  async saveMarketConfig(config: AutoMarketConfig) {
    this.catalog.config = autoMarketConfigSchema.parse(config);
    return clone(this.catalog.config);
  }
  async savePlan(plan: AutoPlan) {
    const parsed = autoPlanSchema.parse(plan);
    const index = this.catalog.plans.findIndex((row) => row.id === parsed.id);
    if (index < 0) throw new Error("Auto plan not found");
    this.catalog.plans[index] = parsed;
    return clone(parsed);
  }
  async saveAddOn(addOn: AutoAddOn) {
    const parsed = autoAddOnSchema.parse(addOn);
    const index = this.catalog.addOns.findIndex((row) => row.id === parsed.id);
    if (index < 0) throw new Error("Auto add-on not found");
    this.catalog.addOns[index] = parsed;
    return clone(parsed);
  }
  async saveVehicleType(type: VehicleTypeConfig, _marketCode: string) {
    const parsed = vehicleTypeConfigSchema.parse(type);
    const index = this.catalog.vehicleTypes.findIndex(
      (row) => row.type === parsed.type,
    );
    if (index < 0) throw new Error("Vehicle type not found");
    this.catalog.vehicleTypes[index] = parsed;
    return clone(parsed);
  }
  async search(input: VehicleSearchQuery) {
    const query = vehicleSearchQuerySchema.parse(input);
    const rows = Array.from(this.vehicles.values()).filter((row) =>
      matches(query, row),
    );
    rows.sort((a, b) =>
      query.sort === "price_asc"
        ? a.price.amountMinor - b.price.amountMinor
        : query.sort === "price_desc"
          ? b.price.amountMinor - a.price.amountMinor
          : query.sort === "year_desc"
            ? b.technical.modelYear - a.technical.modelYear
            : query.sort === "mileage_asc"
              ? a.technical.mileage - b.technical.mileage
              : b.sortDate.localeCompare(a.sortDate),
    );
    const offset = Number(query.cursor || 0);
    const page = rows.slice(offset, offset + query.limit);
    return {
      items: page.map(toPublic).map(clone),
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
  async getVehicle(idOrSlug: string) {
    const value =
      this.vehicles.get(idOrSlug) ||
      Array.from(this.vehicles.values()).find((row) => row.slug === idOrSlug);
    return value ? clone(value) : null;
  }
  async saveVehicle(vehicle: VehiclePrivate) {
    const parsed = vehiclePrivateSchema.parse(vehicle);
    this.vehicles.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async hasDuplicateIdentity(identity: {
    vinHash?: string;
    registrationHash?: string;
  }) {
    return Array.from(this.vehicles.values()).some(
      (vehicle) =>
        (identity.vinHash && vehicle.vinHash === identity.vinHash) ||
        (identity.registrationHash &&
          vehicle.registrationHash === identity.registrationHash),
    );
  }
  async assessVehicleRisk(candidate: {
    excludeVehicleId?: string;
    vinHash?: string;
    registrationHash?: string;
    description: string;
    mediaUrls: string[];
    mileage: number;
  }) {
    const signals = new Set<VehiclePrivate["riskSignals"][number]>();
    const description = candidate.description.trim().toLowerCase();
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.id === candidate.excludeVehicleId) continue;
      const sameVin = Boolean(
        candidate.vinHash && vehicle.vinHash === candidate.vinHash,
      );
      const sameRegistration = Boolean(
        candidate.registrationHash &&
        vehicle.registrationHash === candidate.registrationHash,
      );
      if (sameVin) signals.add("duplicate_vin");
      if (sameRegistration) signals.add("duplicate_registration");
      if (
        (sameVin || sameRegistration) &&
        vehicle.technical.mileage > candidate.mileage
      )
        signals.add("inconsistent_mileage");
      if (candidate.mediaUrls.some((url) => vehicle.mediaUrls.includes(url)))
        signals.add("duplicate_photo");
      if (
        description.length >= 40 &&
        vehicle.description.trim().toLowerCase() === description
      )
        signals.add("reused_description");
    }
    return Array.from(signals);
  }
  async countActiveVehicles(owner: {
    ownerUserId?: string;
    dealerOrganizationId?: string;
  }) {
    return Array.from(this.vehicles.values()).filter(
      (vehicle) =>
        ["pending_review", "published", "reserved"].includes(
          vehicle.lifecycle,
        ) &&
        (owner.ownerUserId
          ? vehicle.ownerUserId === owner.ownerUserId
          : vehicle.dealerOrganizationId === owner.dealerOrganizationId),
    ).length;
  }
  async getDraft(id: string) {
    const draft = this.drafts.get(id);
    return draft ? clone(draft) : null;
  }
  async saveDraft(draft: VehicleDraft) {
    const parsed = vehicleDraftSchema.parse(draft);
    this.drafts.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getDraftIdentity(id: string) {
    const identity = this.draftIdentities.get(id);
    return identity ? clone(identity) : null;
  }
  async saveDraftIdentity(
    id: string,
    identity: {
      vinHash?: string;
      vinMasked?: string;
      registrationHash?: string;
    },
  ) {
    this.draftIdentities.set(id, clone(identity));
  }
  async createInventoryImport(
    job: InventoryImport,
    _requestedBy: string,
    _marketCode: string,
    idempotencyKey: string,
  ) {
    const existing = this.importJobs.get(idempotencyKey);
    if (existing) return clone(existing);
    this.importJobs.set(idempotencyKey, clone(job));
    return clone(job);
  }
  async beginProviderEvent(event: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payloadHash: string;
  }) {
    if (this.providerEvents.has(event.providerEventId)) return false;
    this.providerEvents.add(event.providerEventId);
    return true;
  }
  async updateAddOnPurchaseFromProvider(
    _purchaseId: string,
    _status: "requires_action" | "paid" | "failed" | "cancelled" | "refunded",
    _providerPaymentReference?: string,
  ) {}
  async completeProviderEvent(
    _providerEventId: string,
    _processingError?: string,
  ) {}
  async hasRecentDuplicateLead(vehicleId: string, contactEmail: string) {
    const normalizedEmail = contactEmail.trim().toLowerCase();
    return Array.from(this.leads.values()).some(
      (lead) =>
        lead.vehicleId === vehicleId &&
        lead.contactEmail.trim().toLowerCase() === normalizedEmail,
    );
  }
  async createLead(lead: AutoLead) {
    const parsed = autoLeadSchema.parse(lead);
    this.leads.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async saveLead(lead: AutoLead) {
    return this.createLead(lead);
  }
  async getDealerWorkspace(
    organizationId: string,
  ): Promise<DealerWorkspace | null> {
    if (organizationId !== SELLER.id) return null;
    const vehicles = Array.from(this.vehicles.values()).filter(
      (row) => row.dealerOrganizationId === organizationId,
    );
    const leads = Array.from(this.leads.values()).filter(
      (row) => row.dealerOrganizationId === organizationId,
    );
    return clone({
      organization: {
        id: SELLER.id,
        name: SELLER.displayName,
        slug: SELLER.slug,
        verificationStatus: "verified",
        planId: "auto_dealer_growth",
      },
      locations: [
        {
          id: "dealer_location_lyon",
          name: "Lyon Centre",
          publicAddress: "Lyon 3e",
          city: "Lyon",
          postalCode: "69003",
          marketCode: "FR",
          phone: "04 00 00 00 00",
          isActive: true,
        },
      ],
      members: [
        {
          id: "member_owner",
          userId: "user_dealer_owner",
          displayName: "Michel Girard",
          email: "michel@example.fr",
          role: "owner",
          locationIds: ["dealer_location_lyon"],
          status: "active",
        },
        {
          id: "member_seller",
          userId: "user_dealer_seller",
          displayName: "Lucie Martin",
          email: "lucie@example.fr",
          role: "seller",
          locationIds: ["dealer_location_lyon"],
          status: "active",
        },
      ],
      vehicles,
      leads,
      leadActions: [],
      appointments: [],
      stockTransfers: [],
      imports: [
        {
          id: "import_auto_demo",
          dealerOrganizationId: SELLER.id,
          type: "csv",
          fileName: "stock_auto_2026-08-22.csv",
          status: "completed_with_errors",
          totalRows: 51,
          createdCount: 48,
          updatedCount: 2,
          skippedCount: 0,
          errorCount: 1,
          reportAvailable: true,
          requestedAt: "2026-08-22T07:18:00.000Z",
          completedAt: "2026-08-22T07:19:12.000Z",
        },
      ],
      usage: {
        activeVehicles: vehicles.length,
        remainingVehicleSlots: Math.max(
          0,
          (this.catalog.plans.find((plan) => plan.id === "auto_dealer_growth")
            ?.entitlements.maxActiveVehicles || 0) - vehicles.length,
        ),
        remainingPromotionCredits: 24,
        medianResponseMinutes: 42,
      },
      analytics: {
        views30d: 12840,
        leads30d: 126,
        appointments30d: 31,
        sold30d: 18,
        conversionRatePercent: 14.3,
      },
      vehicleMetrics: vehicles.map((vehicle, index) => ({
        vehicleId: vehicle.id,
        views30d: [312, 265, 218, 171][index] || 0,
        leads30d: [8, 7, 5, 3][index] || 0,
        appointments30d: [2, 2, 1, 1][index] || 0,
      })),
    });
  }
  async getAdminOverview(marketCode: string) {
    return {
      catalog: await this.getCatalog(marketCode, true),
      metrics: {
        activeVehicles: this.vehicles.size,
        pendingModeration: 1,
        dealers: 1,
        newLeads30d: this.leads.size,
        duplicateSignals30d: 1,
        partnerReferrals30d: 0,
      },
      recentImports: (await this.getDealerWorkspace(SELLER.id))?.imports || [],
      flaggedVehicles: Array.from(this.vehicles.values()).filter(
        (row) => row.riskSignals.length > 0,
      ),
    };
  }
}

export class PostgresAutoRepository implements IAutoRepository {
  private db() {
    return getSupabaseAdminClient() as any;
  }
  async getCatalog(
    marketCode: string,
    includeInactive = false,
  ): Promise<AutoCatalog> {
    const db = this.db();
    const active = (q: any) => (includeInactive ? q : q.eq("is_active", true));
    const [config, types, attrs, catalog, plans, addOns] = await Promise.all([
      db
        .from("auto_market_configs")
        .select("config_payload")
        .eq("market_code", marketCode)
        .maybeSingle(),
      active(
        db
          .from("auto_vehicle_types")
          .select("public_payload")
          .eq("market_code", marketCode),
      ).order("sort_order"),
      active(
        db
          .from("auto_attribute_definitions")
          .select("public_payload")
          .eq("market_code", marketCode),
      ).order("sort_order"),
      active(
        db
          .from("auto_catalog_entries")
          .select("public_payload")
          .eq("market_code", marketCode),
      ).order("label"),
      active(
        db
          .from("auto_plans")
          .select("public_payload")
          .eq("market_code", marketCode),
      ).order("sort_order"),
      active(
        db
          .from("auto_add_ons")
          .select("public_payload")
          .eq("market_code", marketCode),
      ).order("sort_order"),
    ]);
    for (const result of [config, types, attrs, catalog, plans, addOns])
      if (result.error) throw result.error;
    return {
      config: autoMarketConfigSchema.parse(config.data?.config_payload),
      vehicleTypes: (types.data || []).map((r: any) => r.public_payload),
      attributes: (attrs.data || []).map((r: any) => r.public_payload),
      vehicleCatalog: (catalog.data || []).map((r: any) => r.public_payload),
      plans: (plans.data || []).map((r: any) =>
        autoPlanSchema.parse(r.public_payload),
      ),
      addOns: (addOns.data || []).map((r: any) => r.public_payload),
    };
  }
  async saveMarketConfig(config: AutoMarketConfig) {
    const parsed = autoMarketConfigSchema.parse(config);
    const { error } = await this.db().from("auto_market_configs").upsert({
      market_code: parsed.marketCode,
      schema_version: parsed.schemaVersion,
      is_enabled: parsed.isEnabled,
      locale: parsed.locale,
      currency: parsed.currency,
      timezone: parsed.timezone,
      comparison_limit: parsed.comparisonLimit,
      default_search_radius_km: parsed.defaultSearchRadiusKm,
      lead_retention_days: parsed.leadRetentionDays,
      paid_offers_enabled: parsed.featureFlags.paidOffersEnabled,
      secure_sale_enabled: parsed.featureFlags.secureSaleEnabled,
      financing_referrals_enabled:
        parsed.featureFlags.financingReferralsEnabled,
      insurance_referrals_enabled:
        parsed.featureFlags.insuranceReferralsEnabled,
      inspection_referrals_enabled:
        parsed.featureFlags.inspectionReferralsEnabled,
      warranty_referrals_enabled: parsed.featureFlags.warrantyReferralsEnabled,
      delivery_referrals_enabled: parsed.featureFlags.deliveryReferralsEnabled,
      trade_in_referrals_enabled: parsed.featureFlags.tradeInReferralsEnabled,
      boat_listings_enabled: parsed.featureFlags.boatListingsEnabled,
      config_payload: parsed,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    return parsed;
  }
  async savePlan(plan: AutoPlan) {
    const parsed = autoPlanSchema.parse(plan);
    const { error } = await this.db()
      .from("auto_plans")
      .update({
        public_payload: parsed,
        vehicle_types: parsed.vehicleTypes,
        is_active: parsed.isActive,
        price_monthly_minor: parsed.monthlyPrice?.amountMinor,
        price_annual_minor: parsed.annualPrice?.amountMinor,
        duration_days: parsed.durationDays,
        trial_days: parsed.trialDays,
        currency:
          parsed.monthlyPrice?.currency ||
          parsed.annualPrice?.currency ||
          "EUR",
        tax_rate_bps: parsed.taxRateBps,
        entitlements: parsed.entitlements,
        is_recommended: parsed.isRecommended,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.id)
      .eq("market_code", parsed.marketCode);
    if (error) throw error;
    return parsed;
  }
  async saveAddOn(addOn: AutoAddOn) {
    const parsed = autoAddOnSchema.parse(addOn);
    const { error } = await this.db()
      .from("auto_add_ons")
      .update({
        vehicle_type: parsed.vehicleType,
        name: parsed.name,
        description: parsed.description,
        price_minor: parsed.price.amountMinor,
        currency: parsed.price.currency,
        tax_rate_bps: parsed.taxRateBps,
        validity_days: parsed.validityDays,
        credit_quantity: parsed.creditQuantity,
        is_active: parsed.isActive,
        public_payload: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.id)
      .eq("market_code", parsed.marketCode);
    if (error) throw error;
    return parsed;
  }
  async saveVehicleType(type: VehicleTypeConfig, marketCode: string) {
    const parsed = vehicleTypeConfigSchema.parse(type);
    const { error } = await this.db()
      .from("auto_vehicle_types")
      .update({
        label: parsed.label,
        description: parsed.description,
        schema_version: parsed.schemaVersion,
        required_field_ids: parsed.requiredFieldIds,
        filter_field_ids: parsed.filterFieldIds,
        sort_order: parsed.sortOrder,
        is_active: parsed.isActive,
        public_payload: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("type", parsed.type)
      .eq("market_code", marketCode.toUpperCase());
    if (error) throw error;
    return parsed;
  }
  async search(input: VehicleSearchQuery): Promise<VehicleSearchResponse> {
    const query = vehicleSearchQuerySchema.parse(input);
    let q = this.db()
      .from("auto_vehicles")
      .select("public_payload", { count: "exact" })
      .eq("lifecycle", "published")
      .eq("moderation_status", "approved")
      .contains("market_codes", [query.marketCode]);
    if (query.vehicleTypes?.length)
      q = q.in("vehicle_type", query.vehicleTypes);
    if (query.makeIds?.length) q = q.in("make_id", query.makeIds);
    if (query.modelIds?.length) q = q.in("model_id", query.modelIds);
    if (query.fuelTypes?.length) q = q.in("fuel_type", query.fuelTypes);
    if (query.transmissions?.length)
      q = q.in("transmission", query.transmissions);
    if (query.bodyTypes?.length) q = q.in("body_type", query.bodyTypes);
    if (query.sellerTypes?.length) q = q.in("seller_type", query.sellerTypes);
    if (query.minPriceMinor !== undefined)
      q = q.gte("price_minor", query.minPriceMinor);
    if (query.maxPriceMinor !== undefined)
      q = q.lte("price_minor", query.maxPriceMinor);
    if (query.minYear !== undefined) q = q.gte("model_year", query.minYear);
    if (query.maxYear !== undefined) q = q.lte("model_year", query.maxYear);
    if (query.maxMileage !== undefined)
      q = q.lte("mileage_value", query.maxMileage);
    if (query.minPowerHp !== undefined) q = q.gte("power_hp", query.minPowerHp);
    if (query.maxPowerHp !== undefined) q = q.lte("power_hp", query.maxPowerHp);
    if (query.minBatteryCapacityKwh !== undefined)
      q = q.gte("battery_capacity_kwh", query.minBatteryCapacityKwh);
    if (query.minElectricRangeKm !== undefined)
      q = q.gte("electric_range_km", query.minElectricRangeKm);
    if (query.city) q = q.ilike("location_city", `%${query.city}%`);
    if (query.warrantyOnly) q = q.gt("warranty_months", 0);
    if (query.financingAvailable) q = q.eq("financing_available", true);
    for (const [key, values] of Object.entries(query.dynamicAttributes || {})) {
      if (values.length === 1)
        q = q.contains("dynamic_attributes", { [key]: values[0] });
      else if (values.length > 1)
        q = q.contains("dynamic_attributes", { [key]: values });
    }
    if (query.query)
      q = q.textSearch("search_document", query.query, {
        type: "websearch",
        config: "french",
      });
    const offset = Number(query.cursor || 0);
    q = q.range(offset, offset + query.limit - 1);
    const order =
      query.sort === "price_asc"
        ? ["price_minor", true]
        : query.sort === "price_desc"
          ? ["price_minor", false]
          : query.sort === "year_desc"
            ? ["model_year", false]
            : query.sort === "mileage_asc"
              ? ["mileage_value", true]
              : ["sort_date", false];
    q = q.order(order[0], { ascending: order[1] });
    const { data, count, error } = await q;
    if (error) throw error;
    const total = count || 0;
    return {
      items: (data || []).map((r: any) => r.public_payload),
      total,
      pageInfo: {
        hasNextPage: offset + query.limit < total,
        nextCursor:
          offset + query.limit < total
            ? String(offset + query.limit)
            : undefined,
      },
    };
  }
  async getVehicle(idOrSlug: string) {
    const db = this.db();
    let result = await db
      .from("auto_vehicles")
      .select("private_payload")
      .eq("id", idOrSlug)
      .maybeSingle();
    if (!result.data && !result.error)
      result = await db
        .from("auto_vehicles")
        .select("private_payload")
        .eq("slug", idOrSlug)
        .maybeSingle();
    if (result.error) throw result.error;
    return result.data
      ? vehiclePrivateSchema.parse(result.data.private_payload)
      : null;
  }
  async saveVehicle(vehicle: VehiclePrivate) {
    const parsed = vehiclePrivateSchema.parse(vehicle);
    const { error } = await this.db()
      .from("auto_vehicles")
      .upsert({
        id: parsed.id,
        owner_user_id: parsed.ownerUserId,
        dealer_organization_id: parsed.dealerOrganizationId,
        dealer_location_id: parsed.dealerLocationId,
        stock_reference: parsed.stockReference,
        schema_version: parsed.schemaVersion,
        slug: parsed.slug,
        vehicle_type: parsed.vehicleType,
        lifecycle: parsed.lifecycle,
        moderation_status: parsed.moderationStatus,
        moderation_reason: parsed.moderationReason,
        market_codes: parsed.marketCodes,
        make_id: parsed.makeId,
        model_id: parsed.modelId,
        body_type: parsed.technical.bodyType,
        model_year: parsed.technical.modelYear,
        first_registration_date: parsed.technical.firstRegistrationDate,
        mileage_value: parsed.technical.mileage,
        mileage_unit: parsed.technical.mileageUnit,
        fuel_type: parsed.technical.fuelType,
        transmission: parsed.technical.transmission,
        power_kw: parsed.technical.powerKw,
        power_hp: parsed.technical.powerHp,
        fiscal_power: parsed.technical.fiscalPower,
        battery_capacity_kwh: parsed.technical.batteryCapacityKwh,
        electric_range_km: parsed.technical.electricRangeKm,
        co2_grams_per_km: parsed.technical.co2GramsPerKm,
        condition: parsed.history.condition,
        price_minor: parsed.price.amountMinor,
        currency: parsed.price.currency,
        price_includes_tax: parsed.priceIncludesTax,
        price_negotiable: Boolean(parsed.priceNegotiable),
        seller_type: parsed.seller.type,
        location_city: parsed.locationLabel,
        warranty_months: parsed.history.warrantyMonths || 0,
        financing_available: Boolean(parsed.financingAvailable),
        vin_hash: parsed.vinHash,
        vin_masked: parsed.vinMasked,
        registration_hash: parsed.registrationHash,
        description_hash: fingerprint(parsed.description),
        media_hashes: parsed.mediaUrls.map(fingerprint),
        dynamic_attributes: parsed.dynamicAttributes,
        equipment: parsed.equipment,
        risk_signals: parsed.riskSignals,
        sort_date: parsed.sortDate,
        published_at: parsed.publishedAt,
        public_payload: toPublic(parsed),
        private_payload: parsed,
        created_at: parsed.createdAt,
        updated_at: parsed.updatedAt,
      });
    if (error) throw error;
    return parsed;
  }
  async hasDuplicateIdentity(identity: {
    vinHash?: string;
    registrationHash?: string;
  }) {
    const queries: Promise<any>[] = [];
    if (identity.vinHash)
      queries.push(
        this.db()
          .from("auto_vehicles")
          .select("id")
          .eq("vin_hash", identity.vinHash)
          .limit(1)
          .maybeSingle(),
      );
    if (identity.registrationHash)
      queries.push(
        this.db()
          .from("auto_vehicles")
          .select("id")
          .eq("registration_hash", identity.registrationHash)
          .limit(1)
          .maybeSingle(),
      );
    const results = await Promise.all(queries);
    for (const result of results) if (result.error) throw result.error;
    return results.some((result) => Boolean(result.data));
  }
  async assessVehicleRisk(candidate: {
    excludeVehicleId?: string;
    vinHash?: string;
    registrationHash?: string;
    description: string;
    mediaUrls: string[];
    mileage: number;
  }) {
    const db = this.db();
    const signals = new Set<VehiclePrivate["riskSignals"][number]>();
    const identityFilters = [
      candidate.vinHash ? `vin_hash.eq.${candidate.vinHash}` : undefined,
      candidate.registrationHash
        ? `registration_hash.eq.${candidate.registrationHash}`
        : undefined,
    ].filter(Boolean) as string[];
    if (identityFilters.length) {
      let identityQuery = db
        .from("auto_vehicles")
        .select("id, vin_hash, registration_hash, mileage_value")
        .or(identityFilters.join(","));
      if (candidate.excludeVehicleId)
        identityQuery = identityQuery.neq("id", candidate.excludeVehicleId);
      const identityRows = await identityQuery.limit(20);
      if (identityRows.error) throw identityRows.error;
      for (const row of identityRows.data || []) {
        if (candidate.vinHash && row.vin_hash === candidate.vinHash)
          signals.add("duplicate_vin");
        if (
          candidate.registrationHash &&
          row.registration_hash === candidate.registrationHash
        )
          signals.add("duplicate_registration");
        if (Number(row.mileage_value) > candidate.mileage)
          signals.add("inconsistent_mileage");
      }
    }
    if (candidate.description.trim().length >= 40) {
      let descriptionQuery = db
        .from("auto_vehicles")
        .select("id", { count: "exact", head: true })
        .eq("description_hash", fingerprint(candidate.description));
      if (candidate.excludeVehicleId)
        descriptionQuery = descriptionQuery.neq(
          "id",
          candidate.excludeVehicleId,
        );
      const duplicateDescription = await descriptionQuery;
      if (duplicateDescription.error) throw duplicateDescription.error;
      if ((duplicateDescription.count || 0) > 0)
        signals.add("reused_description");
    }
    if (candidate.mediaUrls.length) {
      let mediaQuery = db
        .from("auto_vehicles")
        .select("id", { count: "exact", head: true })
        .overlaps("media_hashes", candidate.mediaUrls.map(fingerprint));
      if (candidate.excludeVehicleId)
        mediaQuery = mediaQuery.neq("id", candidate.excludeVehicleId);
      const duplicateMedia = await mediaQuery;
      if (duplicateMedia.error) throw duplicateMedia.error;
      if ((duplicateMedia.count || 0) > 0) signals.add("duplicate_photo");
    }
    return Array.from(signals);
  }
  async countActiveVehicles(owner: {
    ownerUserId?: string;
    dealerOrganizationId?: string;
  }) {
    let query = this.db()
      .from("auto_vehicles")
      .select("id", { count: "exact", head: true })
      .in("lifecycle", ["pending_review", "published", "reserved"]);
    query = owner.ownerUserId
      ? query.eq("owner_user_id", owner.ownerUserId)
      : query.eq("dealer_organization_id", owner.dealerOrganizationId);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
  async getDraft(id: string) {
    const { data, error } = await this.db()
      .from("auto_vehicle_drafts")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? vehicleDraftSchema.parse(data.payload) : null;
  }
  async saveDraft(draft: VehicleDraft) {
    const parsed = vehicleDraftSchema.parse(draft);
    const { error } = await this.db().from("auto_vehicle_drafts").upsert({
      id: parsed.id,
      owner_user_id: parsed.ownerUserId,
      market_code: parsed.marketCode,
      schema_version: parsed.schemaVersion,
      current_step: parsed.currentStep,
      duplicate_check: parsed.duplicateCheck,
      payload: parsed,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    return parsed;
  }
  async getDraftIdentity(id: string) {
    const { data, error } = await this.db()
      .from("auto_vehicle_drafts")
      .select("vin_hash, vin_masked, registration_hash")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          vinHash: data.vin_hash || undefined,
          vinMasked: data.vin_masked || undefined,
          registrationHash: data.registration_hash || undefined,
        }
      : null;
  }
  async saveDraftIdentity(
    id: string,
    identity: {
      vinHash?: string;
      vinMasked?: string;
      registrationHash?: string;
    },
  ) {
    const { error } = await this.db()
      .from("auto_vehicle_drafts")
      .update({
        vin_hash: identity.vinHash,
        vin_masked: identity.vinMasked,
        registration_hash: identity.registrationHash,
      })
      .eq("id", id);
    if (error) throw error;
  }
  async createInventoryImport(
    job: InventoryImport,
    requestedBy: string,
    marketCode: string,
    idempotencyKey: string,
  ) {
    const db = this.db();
    const inserted = await db
      .from("auto_inventory_imports")
      .insert({
        id: job.id,
        dealer_organization_id: job.dealerOrganizationId,
        market_code: marketCode,
        requested_by: requestedBy,
        type: job.type,
        source_object_path: job.fileName,
        status: job.status,
        total_rows: job.totalRows,
        created_count: job.createdCount,
        updated_count: job.updatedCount,
        skipped_count: job.skippedCount,
        error_count: job.errorCount,
        idempotency_key: idempotencyKey,
        public_payload: job,
        requested_at: job.requestedAt,
      })
      .select("public_payload")
      .single();
    if (!inserted.error) return inserted.data.public_payload as InventoryImport;
    if (inserted.error.code !== "23505") throw inserted.error;
    const existing = await db
      .from("auto_inventory_imports")
      .select("public_payload")
      .eq("idempotency_key", idempotencyKey)
      .single();
    if (existing.error) throw existing.error;
    return existing.data.public_payload as InventoryImport;
  }
  async beginProviderEvent(event: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payloadHash: string;
  }) {
    const { error } = await this.db().from("auto_provider_events").insert({
      provider: event.provider,
      provider_event_id: event.providerEventId,
      event_type: event.eventType,
      payload_hash: event.payloadHash,
    });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  }
  async updateAddOnPurchaseFromProvider(
    purchaseId: string,
    status: "requires_action" | "paid" | "failed" | "cancelled" | "refunded",
    providerPaymentReference?: string,
  ) {
    const { error } = await this.db()
      .from("auto_add_on_purchases")
      .update({
        status,
        provider_payment_reference: providerPaymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseId);
    if (error) throw error;
  }
  async completeProviderEvent(
    providerEventId: string,
    processingError?: string,
  ) {
    const { error } = await this.db()
      .from("auto_provider_events")
      .update({
        processed_at: processingError ? null : new Date().toISOString(),
        processing_error: processingError,
      })
      .eq("provider_event_id", providerEventId);
    if (error) throw error;
  }
  async createLead(lead: AutoLead) {
    const parsed = autoLeadSchema.parse(lead);
    const { error } = await this.db().from("auto_leads").insert({
      id: parsed.id,
      vehicle_id: parsed.vehicleId,
      dealer_organization_id: parsed.dealerOrganizationId,
      requester_user_id: parsed.requesterUserId,
      contact_email: parsed.contactEmail,
      intention: parsed.intention,
      status: parsed.status,
      source: parsed.source,
      assigned_user_id: parsed.assignedUserId,
      spam_assessment: parsed.spamAssessment,
      private_payload: parsed,
      created_at: parsed.createdAt,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    return parsed;
  }
  async hasRecentDuplicateLead(vehicleId: string, contactEmail: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await this.db()
      .from("auto_leads")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", vehicleId)
      .eq("contact_email", contactEmail.trim().toLowerCase())
      .gte("created_at", since);
    if (error) throw error;
    return (count || 0) > 0;
  }
  async saveLead(lead: AutoLead) {
    const parsed = autoLeadSchema.parse(lead);
    const { error } = await this.db()
      .from("auto_leads")
      .update({
        status: parsed.status,
        assigned_user_id: parsed.assignedUserId,
        next_reminder_at: parsed.nextReminderAt,
        private_payload: parsed,
        updated_at: parsed.updatedAt,
      })
      .eq("id", parsed.id);
    if (error) throw error;
    return parsed;
  }
  async getDealerWorkspace(
    organizationId: string,
  ): Promise<DealerWorkspace | null> {
    const db = this.db();
    const [
      organization,
      locations,
      members,
      vehicles,
      leads,
      actions,
      appointments,
      transfers,
      imports,
    ] = await Promise.all([
      db
        .from("auto_dealer_organizations")
        .select("id, slug, plan_id, verification_status, public_payload")
        .eq("id", organizationId)
        .maybeSingle(),
      db
        .from("auto_dealer_locations")
        .select("public_payload")
        .eq("dealer_organization_id", organizationId)
        .order("name"),
      db
        .from("auto_dealer_members")
        .select("public_payload")
        .eq("dealer_organization_id", organizationId)
        .order("created_at"),
      db
        .from("auto_vehicles")
        .select("private_payload")
        .eq("dealer_organization_id", organizationId)
        .order("updated_at", { ascending: false }),
      db
        .from("auto_leads")
        .select("private_payload")
        .eq("dealer_organization_id", organizationId)
        .order("created_at", { ascending: false }),
      db
        .from("auto_lead_actions")
        .select("*, auto_leads!inner(dealer_organization_id)")
        .eq("auto_leads.dealer_organization_id", organizationId)
        .order("occurred_at", { ascending: false }),
      db
        .from("auto_appointments")
        .select("*, auto_leads!inner(dealer_organization_id)")
        .eq("auto_leads.dealer_organization_id", organizationId)
        .order("starts_at"),
      db
        .from("auto_stock_transfers")
        .select("public_payload")
        .eq("dealer_organization_id", organizationId)
        .order("requested_at", { ascending: false })
        .limit(20),
      db
        .from("auto_inventory_imports")
        .select("public_payload")
        .eq("dealer_organization_id", organizationId)
        .order("requested_at", { ascending: false })
        .limit(20),
    ]);
    if (organization.error) throw organization.error;
    if (!organization.data) return null;
    for (const result of [
      locations,
      members,
      vehicles,
      leads,
      actions,
      appointments,
      transfers,
      imports,
    ])
      if (result.error) throw result.error;
    const vehicleRows: VehiclePrivate[] = (vehicles.data || []).map(
      (row: any) => vehiclePrivateSchema.parse(row.private_payload),
    );
    const leadRows: AutoLead[] = (leads.data || []).map((row: any) =>
      autoLeadSchema.parse(row.private_payload),
    );
    const payload = organization.data.public_payload || {};
    return {
      organization: {
        id: organization.data.id,
        name: payload.name || payload.displayName || "Concession automobile",
        slug: organization.data.slug,
        logoUrl: payload.logoUrl,
        verificationStatus: organization.data.verification_status,
        planId: organization.data.plan_id,
      },
      locations: (locations.data || []).map((row: any) => row.public_payload),
      members: (members.data || []).map((row: any) => row.public_payload),
      vehicles: vehicleRows,
      leads: leadRows,
      leadActions: (actions.data || []).map((row: any) => ({
        id: row.id,
        leadId: row.lead_id,
        actorUserId: row.actor_user_id,
        type: row.type,
        note: row.note || undefined,
        fromStatus: row.from_status || undefined,
        toStatus: row.to_status || undefined,
        occurredAt: row.occurred_at,
      })),
      appointments: (appointments.data || []).map((row: any) => ({
        id: row.id,
        leadId: row.lead_id,
        dealerLocationId: row.dealer_location_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        timezone: row.timezone,
        type: row.type,
        status: row.status,
      })),
      stockTransfers: (transfers.data || []).map((row: any) =>
        dealerStockTransferSchema.parse(row.public_payload),
      ),
      imports: (imports.data || []).map((row: any) => row.public_payload),
      usage: {
        activeVehicles: vehicleRows.filter(
          (row) => row.lifecycle === "published",
        ).length,
        remainingVehicleSlots: 0,
        remainingPromotionCredits: 0,
        medianResponseMinutes: 0,
      },
      analytics: {
        views30d: 0,
        leads30d: leadRows.length,
        appointments30d: (appointments.data || []).length,
        sold30d: vehicleRows.filter((row) => row.lifecycle === "sold").length,
        conversionRatePercent: 0,
      },
      vehicleMetrics: vehicleRows.map((vehicle) => ({
        vehicleId: vehicle.id,
        views30d: 0,
        leads30d: leadRows.filter((lead) => lead.vehicleId === vehicle.id)
          .length,
        appointments30d: (appointments.data || []).filter((appointment: any) =>
          leadRows.some(
            (lead) =>
              lead.id === appointment.lead_id && lead.vehicleId === vehicle.id,
          ),
        ).length,
      })),
    };
  }
  async getAdminOverview(marketCode: string): Promise<AutoAdminOverview> {
    const [catalog, metrics, imports, flags] = await Promise.all([
      this.getCatalog(marketCode, true),
      this.db().rpc("get_auto_admin_metrics", { p_market_code: marketCode }),
      this.db()
        .from("auto_inventory_imports")
        .select("public_payload")
        .eq("market_code", marketCode)
        .order("requested_at", { ascending: false })
        .limit(10),
      this.db()
        .from("auto_vehicles")
        .select("private_payload")
        .neq("risk_signals", "{}")
        .limit(20),
    ]);
    if (metrics.error) throw metrics.error;
    return {
      catalog,
      metrics: metrics.data,
      recentImports: (imports.data || []).map((r: any) => r.public_payload),
      flaggedVehicles: (flags.data || []).map((r: any) => r.private_payload),
    };
  }
}
