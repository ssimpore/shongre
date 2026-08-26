import {
  Market,
  MarketConfiguration,
  MarketOverrides,
} from "./market.types";
import { deepMergeOverrides } from "./market.resolver";
import {
  PRICE_FILTER_STOPS_MAJOR_DEFAULT,
  RECENT_SEARCHES_LIMIT_DEFAULT,
} from "./market.constants";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import {
  getDemoDeliveryAmountMinor,
  getDemoTaxRateBps,
  getDemoTransactionCommercials,
} from "../monetization/demo-commercial-catalog";
import { COUNTRY_REGISTRY, getCountryConfig } from "@shongre/contracts";

const commercialProduct = (id: string) =>
  BASELINE_MONETIZATION_CATALOG.products.find((product) => product.id === id)!;
const productPrice = (
  id: string,
  period: "once" | "month" | "year" = "once",
) => {
  const product = commercialProduct(id);
  if (!isCommercialProductPurchasable(product)) return 0;
  return (
    (
      product.prices.find((price) => price.billingPeriod === period) ||
      product.prices[0]
    ).amount.amountMinor / 100
  );
};
const productEntitlement = (id: string, key: string) =>
  commercialProduct(id).entitlements.find(
    (entry) => entry.key === key && isCommercialEntitlementOperational(entry),
  )?.value;
const planNumber = (id: string, key: string) => {
  const value = productEntitlement(id, key);
  return typeof value === "number" ? value : 0;
};
const planBoolean = (id: string, key: string) =>
  Boolean(productEntitlement(id, key));
const FR_INDIVIDUAL_COMMERCIALS = getDemoTransactionCommercials(
  "FR",
  "individual",
);
const FR_PRO_COMMERCIALS = getDemoTransactionCommercials("FR", "pro");

/**
 * Initial policy for the configured default market. France owns these values;
 * they are not an implicit fallback for an unknown market code.
 */
export const DEFAULT_MARKET_POLICY_CONFIG: MarketConfiguration = {
  general: {
    name: "France Métropolitaine",
    tagline: "La référence des annonces sécurisées et de la seconde main",
    supportEmail: "support@shongre.fr",
    supportPhone: "+33 1 89 20 40 00",
    launchState: "full",
  },
  localization: {
    defaultLocale: "fr-FR",
    supportedLocales: ["fr-FR", "en-US"],
    defaultCurrency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    dateFormat: "dd/MM/yyyy",
    dateTimeFormat: "dd/MM/yyyy HH:mm",
    phonePrefix: "+33",
    phonePlaceholder: "06 12 34 56 78",
    phoneRegex: "^(?:(?:\\+|00)33|0)[1-9](?:[\\s.-]*\\d{2}){4}$",
    postalCodePlaceholder: "75001",
    postalCodeRegex: "^[0-9]{5}$",
  },
  listings: {
    maxActiveListingsIndividual: planNumber(
      "listing.standard.individual",
      "maxActiveListings",
    ),
    maxActiveListingsProFree: planNumber(
      "listing.standard.individual",
      "maxActiveListings",
    ),
    maxPhotosIndividual: planNumber(
      "listing.standard.individual",
      "maxPhotosPerListing",
    ),
    maxPhotosPro: planNumber("plan.pro.business", "maxPhotosPerListing"),
    expirationDays:
      commercialProduct("listing.standard.individual").prices[0].durationDays ||
      0,
    allowFreeDonations: true,
    allowPriceNegotiation: true,
    allowInstantBuy: true,
  },
  search: {
    priceFilterStopsMajor: [...PRICE_FILTER_STOPS_MAJOR_DEFAULT],
  },
  payments: {
    enabled: true,
    provider: "stripe_connect",
    supportedMethods: {
      card: true,
      applePay: true,
      googlePay: true,
      sepa: true,
    },
    buyerProtectionFeePercent:
      FR_INDIVIDUAL_COMMERCIALS.protectionRateBps / 10_000,
    buyerProtectionFixedFee:
      FR_INDIVIDUAL_COMMERCIALS.protectionFixedMinor / 100,
    minTransactionAmount: FR_INDIVIDUAL_COMMERCIALS.minimumAmountMinor / 100,
    maxTransactionAmount:
      (FR_INDIVIDUAL_COMMERCIALS.maximumAmountMinor || 0) / 100,
  },
  reservation: {
    enabled: true,
    sellerConfirmationTimeoutHours: 48,
    buyerInspectionTimeoutHours: 48,
    autoCompleteDays: 3,
    requirePinForHandDelivery: true,
  },
  delivery: {
    enabled: true,
    handDeliveryEnabled: true,
    carriers: {
      mondialRelay: {
        enabled: true,
        label: "Mondial Relay (Point Relais)",
        defaultFee: getDemoDeliveryAmountMinor("relay_point") / 100,
        trackingSupported: true,
      },
      colissimo: {
        enabled: true,
        label: "Colissimo Domicile",
        defaultFee: getDemoDeliveryAmountMinor("home") / 100,
        trackingSupported: true,
      },
      chronopost: {
        enabled: true,
        label: "Chronopost Express 24h",
        defaultFee: getDemoDeliveryAmountMinor("express") / 100,
        trackingSupported: true,
      },
      customCarrier: {
        enabled: false,
        label: "Transporteur sur devis",
        defaultFee: getDemoDeliveryAmountMinor("bulky") / 100,
        trackingSupported: false,
      },
    },
  },
  monetization: {
    payoutInstantFeePercent: FR_PRO_COMMERCIALS.instantPayoutRateBps / 10_000,
    payoutInstantFixedFee: FR_PRO_COMMERCIALS.instantPayoutFixedMinor / 100,
    boostPricing: {
      urgent: productPrice("premium.urgent"),
      highlight: productPrice("premium.spotlight"),
      top_of_list: productPrice("premium.search_bump"),
      gallery_boost: productPrice("premium.visibility_bundle"),
      spotlight: productPrice("premium.highlight"),
    },
    plans: {
      free: {
        priceMonthly: productPrice("plan.pro.free"),
        maxActiveListings: planNumber("plan.pro.free", "maxActiveListings"),
        photosPerListing: planNumber("plan.pro.free", "maxPhotosPerListing"),
        storefrontCustomization: planBoolean("plan.pro.free", "storeEnabled"),
        prioritySupport: planBoolean("plan.pro.free", "prioritySupport"),
        bulkImportExport: planBoolean("plan.pro.free", "bulkPublish"),
        automaticRelisting: planBoolean("plan.pro.free", "automaticRelisting"),
      },
      starter: {
        priceMonthly: productPrice("plan.pro.business", "month"),
        maxActiveListings: planNumber("plan.pro.business", "maxActiveListings"),
        photosPerListing: planNumber(
          "plan.pro.business",
          "maxPhotosPerListing",
        ),
        storefrontCustomization: planBoolean(
          "plan.pro.business",
          "storeEnabled",
        ),
        prioritySupport: planBoolean("plan.pro.business", "prioritySupport"),
        bulkImportExport: planBoolean("plan.pro.business", "bulkPublish"),
        automaticRelisting: planBoolean(
          "plan.pro.business",
          "automaticRelisting",
        ),
      },
      business: {
        priceMonthly: productPrice("plan.pro.business", "month"),
        maxActiveListings: planNumber("plan.pro.business", "maxActiveListings"),
        photosPerListing: planNumber(
          "plan.pro.business",
          "maxPhotosPerListing",
        ),
        storefrontCustomization: planBoolean(
          "plan.pro.business",
          "storeEnabled",
        ),
        prioritySupport: planBoolean("plan.pro.business", "prioritySupport"),
        bulkImportExport: planBoolean("plan.pro.business", "bulkPublish"),
        automaticRelisting: planBoolean(
          "plan.pro.business",
          "automaticRelisting",
        ),
      },
      enterprise: {
        priceMonthly: productPrice("plan.pro.business", "month"),
        maxActiveListings: planNumber("plan.pro.business", "maxActiveListings"),
        photosPerListing: planNumber(
          "plan.pro.business",
          "maxPhotosPerListing",
        ),
        storefrontCustomization: planBoolean(
          "plan.pro.business",
          "storeEnabled",
        ),
        prioritySupport: planBoolean("plan.pro.business", "prioritySupport"),
        bulkImportExport: planBoolean("plan.pro.business", "bulkPublish"),
        automaticRelisting: planBoolean(
          "plan.pro.business",
          "automaticRelisting",
        ),
      },
    },
  },
  pro: {
    businessIdentifierLabel: "Numéro SIRET (ou SIREN)",
    businessIdentifierHelper:
      "14 chiffres pour le SIRET (ou 9 chiffres pour le SIREN). Ex : 849 204 892 00018",
    businessIdentifierRegex:
      "^(?:\\d{9}|\\d{14}|\\d{3}\\s\\d{3}\\s\\d{3}(?:\\s\\d{5})?)$",
    businessIdentifierFormatPlaceholder: "849 204 892 00018",
    secondaryIdentifierLabel: "Code NAF / APE",
    vatNumberFormatPlaceholder: "FR 84 849204892",
    vatNumberRegex: "^FR\\s?[0-9A-Z]{2}\\s?[0-9]{9}$",
    supportedLegalForms: [
      "Micro-entreprise / Auto-entrepreneur",
      "SAS / SASU",
      "SARL / EURL",
      "EI / EIRL",
      "SA",
      "Association loi 1901",
      "Autre statut professionnel",
    ],
    requiredVerificationDocuments: [
      {
        id: "kbis",
        label: "Extrait Kbis ou Avis SIRENE (INSEE)",
        description:
          "Datant de moins de 3 mois certifiant l'immatriculation au RCS ou RM",
      },
      {
        id: "id_rep",
        label: "Pièce d'identité du représentant légal",
        description: "CNI recto-verso ou passeport en cours de validité",
      },
    ],
    requireKbis: true,
  },
  taxes: {
    taxEnabled: true,
    vatRateStandard: getDemoTaxRateBps("FR") / 10_000,
    pricesTaxInclusive: true,
  },
  legal: {
    termsUrl: "/cgu",
    privacyUrl: "/confidentialite",
    cookiePolicyUrl: "/cookies",
    buyerProtectionTermsUrl: "/protection-acheteurs",
    proTermsUrl: "/conditions-pro",
    requiresLocalReview: false,
  },
  features: {
    reviewsEnabled: true,
    aiAssistantEnabled: true,
    aiSafetyAuditEnabled: true,
    savedSearchesEnabled: true,
    recentSearchesLimit: RECENT_SEARCHES_LIMIT_DEFAULT,
    sellerFollowEnabled: true,
    proStorefrontsEnabled: true,
    disputeEscalationEnabled: true,
  },
  taxonomy: {
    disabledCategorySlugs: [],
    disabledSubCategorySlugs: [],
  },
};

type SeedMarket = Omit<Market, "configuration"> & {
  overrides: MarketOverrides;
};

const unavailableCarrier = (label: string) => ({
  enabled: false,
  label,
  defaultFee: 0,
  trackingSupported: false,
});

/** Complete fail-closed policy for a market that has not been configured. */
export function createSafeMarketPolicy(input: {
  name: string;
  defaultLocale: string;
  supportedLocales: string[];
  currency: string;
  currencySymbol: string;
  timezone: string;
  phonePrefix?: string;
  supportEmail?: string;
  tagline?: string;
}): MarketConfiguration {
  const emptyPlan = {
    priceMonthly: 0,
    maxActiveListings: 0,
    photosPerListing: 0,
    storefrontCustomization: false,
    prioritySupport: false,
    bulkImportExport: false,
    automaticRelisting: false,
  };
  return {
    general: {
      name: input.name,
      tagline: input.tagline || "Marché en cours de configuration",
      supportEmail: input.supportEmail || "support@shongre.com",
      launchState: "selected_cities",
    },
    localization: {
      defaultLocale: input.defaultLocale,
      supportedLocales: [...input.supportedLocales],
      defaultCurrency: input.currency,
      currencySymbol: input.currencySymbol,
      timezone: input.timezone,
      dateFormat: "yyyy-MM-dd",
      dateTimeFormat: "yyyy-MM-dd HH:mm",
      phonePrefix: input.phonePrefix || "",
      phonePlaceholder: "À configurer",
      phoneRegex: "(?!)",
      postalCodePlaceholder: "À configurer",
      postalCodeRegex: "(?!)",
    },
    listings: {
      maxActiveListingsIndividual: 0,
      maxActiveListingsProFree: 0,
      maxPhotosIndividual: 0,
      maxPhotosPro: 0,
      expirationDays: 0,
      allowFreeDonations: false,
      allowPriceNegotiation: false,
      allowInstantBuy: false,
    },
    search: { priceFilterStopsMajor: [] },
    payments: {
      enabled: false,
      provider: "none",
      supportedMethods: {
        card: false,
        applePay: false,
        googlePay: false,
        sepa: false,
      },
      buyerProtectionFeePercent: 0,
      buyerProtectionFixedFee: 0,
      minTransactionAmount: 0,
      maxTransactionAmount: 0,
    },
    reservation: {
      enabled: false,
      sellerConfirmationTimeoutHours: 0,
      buyerInspectionTimeoutHours: 0,
      autoCompleteDays: 0,
      requirePinForHandDelivery: false,
    },
    delivery: {
      enabled: false,
      handDeliveryEnabled: false,
      carriers: {
        mondialRelay: unavailableCarrier("Point relais non configuré"),
        colissimo: unavailableCarrier("Livraison non configurée"),
        chronopost: unavailableCarrier("Express non configuré"),
        customCarrier: unavailableCarrier("Transporteur non configuré"),
      },
    },
    monetization: {
      payoutInstantFeePercent: 0,
      payoutInstantFixedFee: 0,
      boostPricing: {
        urgent: 0,
        highlight: 0,
        top_of_list: 0,
        gallery_boost: 0,
        spotlight: 0,
      },
      plans: {
        free: { ...emptyPlan },
        starter: { ...emptyPlan },
        business: { ...emptyPlan },
        enterprise: { ...emptyPlan },
      },
    },
    pro: {
      businessIdentifierLabel: "Identifiant professionnel à configurer",
      businessIdentifierHelper: "Validation locale indisponible",
      businessIdentifierRegex: "(?!)",
      businessIdentifierFormatPlaceholder: "À configurer",
      vatNumberFormatPlaceholder: "À configurer",
      vatNumberRegex: "(?!)",
      supportedLegalForms: [],
      requiredVerificationDocuments: [],
      requireKbis: false,
    },
    taxes: {
      taxEnabled: false,
      vatRateStandard: 0,
      pricesTaxInclusive: false,
    },
    legal: {
      termsUrl: "",
      privacyUrl: "",
      cookiePolicyUrl: "",
      buyerProtectionTermsUrl: "",
      proTermsUrl: "",
      requiresLocalReview: true,
    },
    features: {
      reviewsEnabled: false,
      aiAssistantEnabled: false,
      aiSafetyAuditEnabled: false,
      savedSearchesEnabled: false,
      recentSearchesLimit: 0,
      sellerFollowEnabled: false,
      proStorefrontsEnabled: false,
      disputeEscalationEnabled: false,
    },
    taxonomy: {
      disabledCategorySlugs: [],
      disabledSubCategorySlugs: [],
    },
  };
}

/**
 * Initial Seed Markets Setup
 */
const CONFIGURED_MARKETS: SeedMarket[] = [
  // 1. FRANCE (Reference Market - Exactly one default)
  {
    id: "market-fr",
    code: "FR",
    countryCode: "FR",
    name: "France",
    flag: "🇫🇷",
    status: "active",
    isDefault: true,
    defaultLocale: "fr-FR",
    supportedLocales: ["fr-FR", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    geography: {
      allCountryEnabled: true,
      regions: [
        {
          name: "Île-de-France",
          code: "IDF",
          cities: [
            {
              name: "Paris",
              postalCode: "75000",
              region: "Île-de-France",
              isPopular: true,
            },
            {
              name: "Boulogne-Billancourt",
              postalCode: "92100",
              region: "Île-de-France",
              isPopular: true,
            },
            {
              name: "Saint-Denis",
              postalCode: "93200",
              region: "Île-de-France",
            },
            {
              name: "Versailles",
              postalCode: "78000",
              region: "Île-de-France",
            },
          ],
        },
        {
          name: "Auvergne-Rhône-Alpes",
          code: "ARA",
          cities: [
            {
              name: "Lyon",
              postalCode: "69000",
              region: "Auvergne-Rhône-Alpes",
              isPopular: true,
            },
            {
              name: "Grenoble",
              postalCode: "38000",
              region: "Auvergne-Rhône-Alpes",
              isPopular: true,
            },
            {
              name: "Saint-Étienne",
              postalCode: "42000",
              region: "Auvergne-Rhône-Alpes",
            },
            {
              name: "Annecy",
              postalCode: "74000",
              region: "Auvergne-Rhône-Alpes",
            },
          ],
        },
        {
          name: "Provence-Alpes-Côte d'Azur",
          code: "PACA",
          cities: [
            {
              name: "Marseille",
              postalCode: "13000",
              region: "Provence-Alpes-Côte d'Azur",
              isPopular: true,
            },
            {
              name: "Nice",
              postalCode: "06000",
              region: "Provence-Alpes-Côte d'Azur",
              isPopular: true,
            },
            {
              name: "Toulon",
              postalCode: "83000",
              region: "Provence-Alpes-Côte d'Azur",
            },
            {
              name: "Aix-en-Provence",
              postalCode: "13100",
              region: "Provence-Alpes-Côte d'Azur",
            },
          ],
        },
        {
          name: "Nouvelle-Aquitaine",
          code: "NAQ",
          cities: [
            {
              name: "Bordeaux",
              postalCode: "33000",
              region: "Nouvelle-Aquitaine",
              isPopular: true,
            },
            {
              name: "Limoges",
              postalCode: "87000",
              region: "Nouvelle-Aquitaine",
            },
            {
              name: "Poitiers",
              postalCode: "86000",
              region: "Nouvelle-Aquitaine",
            },
          ],
        },
        {
          name: "Occitanie",
          code: "OCC",
          cities: [
            {
              name: "Toulouse",
              postalCode: "31000",
              region: "Occitanie",
              isPopular: true,
            },
            {
              name: "Montpellier",
              postalCode: "34000",
              region: "Occitanie",
              isPopular: true,
            },
            { name: "Nîmes", postalCode: "30000", region: "Occitanie" },
          ],
        },
        {
          name: "Hauts-de-France",
          code: "HDF",
          cities: [
            {
              name: "Lille",
              postalCode: "59000",
              region: "Hauts-de-France",
              isPopular: true,
            },
            { name: "Amiens", postalCode: "80000", region: "Hauts-de-France" },
            { name: "Roubaix", postalCode: "59100", region: "Hauts-de-France" },
          ],
        },
      ],
      popularCities: [
        {
          name: "Paris",
          postalCode: "75000",
          department: "75 - Paris",
          region: "Île-de-France",
        },
        {
          name: "Lyon",
          postalCode: "69000",
          department: "69 - Rhône",
          region: "Auvergne-Rhône-Alpes",
        },
        {
          name: "Marseille",
          postalCode: "13000",
          department: "13 - Bouches-du-Rhône",
          region: "Provence-Alpes-Côte d'Azur",
        },
        {
          name: "Toulouse",
          postalCode: "31000",
          department: "31 - Haute-Garonne",
          region: "Occitanie",
        },
        {
          name: "Bordeaux",
          postalCode: "33000",
          department: "33 - Gironde",
          region: "Nouvelle-Aquitaine",
        },
        {
          name: "Nantes",
          postalCode: "44000",
          department: "44 - Loire-Atlantique",
          region: "Pays de la Loire",
        },
        {
          name: "Lille",
          postalCode: "59000",
          department: "59 - Nord",
          region: "Hauts-de-France",
        },
        {
          name: "Strasbourg",
          postalCode: "67000",
          department: "67 - Bas-Rhin",
          region: "Grand Est",
        },
        {
          name: "Rennes",
          postalCode: "35000",
          department: "35 - Ille-et-Vilaine",
          region: "Bretagne",
        },
        {
          name: "Nice",
          postalCode: "06000",
          department: "06 - Alpes-Maritimes",
          region: "Provence-Alpes-Côte d'Azur",
        },
        {
          name: "Montpellier",
          postalCode: "34000",
          department: "34 - Hérault",
          region: "Occitanie",
        },
      ],
    },
    overrides: {}, // Materializes the reviewed policy for the default market.
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2026-08-16T22:00:00Z",
    version: 1,
  },

  // 2. BELGIUM (active, with a complete policy materialized at bootstrap)
  {
    id: "market-be",
    code: "BE",
    countryCode: "BE",
    name: "Belgique",
    flag: "🇧🇪",
    status: "active",
    isDefault: false,
    defaultLocale: "fr-BE",
    supportedLocales: ["fr-BE", "nl-BE", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Brussels",
    geography: {
      allCountryEnabled: true,
      regions: [
        {
          name: "Région de Bruxelles-Capitale",
          code: "BRU",
          cities: [
            {
              name: "Bruxelles",
              postalCode: "1000",
              region: "Bruxelles-Capitale",
              isPopular: true,
            },
            {
              name: "Ixelles",
              postalCode: "1050",
              region: "Bruxelles-Capitale",
              isPopular: true,
            },
            {
              name: "Schaerbeek",
              postalCode: "1030",
              region: "Bruxelles-Capitale",
            },
            { name: "Uccle", postalCode: "1180", region: "Bruxelles-Capitale" },
          ],
        },
        {
          name: "Wallonie",
          code: "WAL",
          cities: [
            {
              name: "Liège",
              postalCode: "4000",
              region: "Wallonie",
              isPopular: true,
            },
            {
              name: "Namur",
              postalCode: "5000",
              region: "Wallonie",
              isPopular: true,
            },
            {
              name: "Charleroi",
              postalCode: "6000",
              region: "Wallonie",
              isPopular: true,
            },
            { name: "Mons", postalCode: "7000", region: "Wallonie" },
          ],
        },
        {
          name: "Flandre",
          code: "VLG",
          cities: [
            {
              name: "Anvers (Antwerpen)",
              postalCode: "2000",
              region: "Flandre",
              isPopular: true,
            },
            {
              name: "Gand (Gent)",
              postalCode: "9000",
              region: "Flandre",
              isPopular: true,
            },
            { name: "Bruges (Brugge)", postalCode: "8000", region: "Flandre" },
            { name: "Louvain (Leuven)", postalCode: "3000", region: "Flandre" },
          ],
        },
      ],
      popularCities: [
        { name: "Bruxelles", postalCode: "1000", region: "Bruxelles-Capitale" },
        { name: "Liège", postalCode: "4000", region: "Wallonie" },
        { name: "Namur", postalCode: "5000", region: "Wallonie" },
        { name: "Anvers", postalCode: "2000", region: "Flandre" },
        { name: "Gand", postalCode: "9000", region: "Flandre" },
        { name: "Charleroi", postalCode: "6000", region: "Wallonie" },
      ],
    },
    overrides: {
      general: {
        name: "Belgique (Wallonie & Flandre)",
        supportEmail: "support@shongre.be",
      },
      localization: {
        defaultLocale: "fr-BE",
        supportedLocales: ["fr-BE", "nl-BE", "en-US"],
        phonePrefix: "+32",
        phonePlaceholder: "0470 12 34 56",
        phoneRegex: "^(?:(?:\\+|00)32|0)[1-9]\\d{7,8}$",
        postalCodePlaceholder: "1000",
        postalCodeRegex: "^[1-9][0-9]{3}$",
      },
      taxes: {
        vatRateStandard: getDemoTaxRateBps("BE") / 10_000,
      },
      payments: {
        buyerProtectionFixedFee:
          getDemoTransactionCommercials("BE", "individual")
            .protectionFixedMinor / 100,
        buyerProtectionFeePercent:
          getDemoTransactionCommercials("BE", "individual").protectionRateBps /
          10_000,
      },
      pro: {
        businessIdentifierLabel: "Numéro d'entreprise (BCE / KBO)",
        businessIdentifierHelper: "10 chiffres. Ex : 0849.204.892",
        businessIdentifierRegex: "^(?:BE\\s?)?0?\\d{9,10}$",
        businessIdentifierFormatPlaceholder: "0849.204.892",
        vatNumberFormatPlaceholder: "BE 0849.204.892",
        vatNumberRegex: "^BE\\s?0?\\d{9,10}$",
        supportedLegalForms: [
          "Indépendant à titre principal / complémentaire",
          "SRL (Société à Responsabilité Limitée)",
          "SA (Société Anonyme)",
          "SC (Société Coopérative)",
          "ASBL",
        ],
        requiredVerificationDocuments: [
          {
            id: "bce_extract",
            label: "Extrait Banque-Carrefour des Entreprises (BCE)",
            description:
              "Attestation officielle récente certifiant l'inscription",
          },
        ],
      },
    },
    createdAt: "2023-06-15T00:00:00Z",
    updatedAt: "2026-08-16T22:00:00Z",
    version: 1,
  },

  // 3. SPAIN (Coming Soon / Draft - Overrides reservation: disabled as explicit false test)
  {
    id: "market-es",
    code: "ES",
    countryCode: "ES",
    name: "Espagne",
    flag: "🇪🇸",
    status: "coming_soon",
    isDefault: false,
    defaultLocale: "es-ES",
    supportedLocales: ["es-ES", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Madrid",
    geography: {
      allCountryEnabled: true,
      regions: [
        {
          name: "Comunidad de Madrid",
          code: "MAD",
          cities: [
            {
              name: "Madrid",
              postalCode: "28001",
              region: "Comunidad de Madrid",
              isPopular: true,
            },
            {
              name: "Móstoles",
              postalCode: "28931",
              region: "Comunidad de Madrid",
            },
          ],
        },
        {
          name: "Cataluña",
          code: "CAT",
          cities: [
            {
              name: "Barcelona",
              postalCode: "08001",
              region: "Cataluña",
              isPopular: true,
            },
            {
              name: "Hospitalet de Llobregat",
              postalCode: "08901",
              region: "Cataluña",
            },
          ],
        },
        {
          name: "Andalucía",
          code: "AND",
          cities: [
            {
              name: "Sevilla",
              postalCode: "41001",
              region: "Andalucía",
              isPopular: true,
            },
            {
              name: "Málaga",
              postalCode: "29001",
              region: "Andalucía",
              isPopular: true,
            },
          ],
        },
      ],
      popularCities: [
        { name: "Madrid", postalCode: "28001", region: "Comunidad de Madrid" },
        { name: "Barcelona", postalCode: "08001", region: "Cataluña" },
        {
          name: "Valencia",
          postalCode: "46001",
          region: "Comunidad Valenciana",
        },
        { name: "Sevilla", postalCode: "41001", region: "Andalucía" },
        { name: "Málaga", postalCode: "29001", region: "Andalucía" },
      ],
    },
    overrides: {
      general: {
        name: "Espagne (Península Ibérica)",
        supportEmail: "soporte@shongre.es",
      },
      localization: {
        defaultLocale: "es-ES",
        supportedLocales: ["es-ES", "en-US"],
        phonePrefix: "+34",
        phonePlaceholder: "612 34 56 78",
        phoneRegex: "^(?:(?:\\+|00)34|0)?[6789]\\d{8}$",
        postalCodePlaceholder: "28001",
        postalCodeRegex: "^[0-9]{5}$",
      },
      taxes: {
        vatRateStandard: getDemoTaxRateBps("ES") / 10_000,
      },
      reservation: {
        enabled: false, // Explicit false: tests that false does NOT fall back to true
      },
      pro: {
        businessIdentifierLabel: "Número CIF / NIF / NIE",
        businessIdentifierHelper: "Format CIF (ex: B12345678) ou NIF",
        businessIdentifierRegex: "^[A-HJ-NP-SUVW]\\d{7}[0-9A-J]$",
        businessIdentifierFormatPlaceholder: "B-12345678",
        vatNumberFormatPlaceholder: "ES B12345678",
        vatNumberRegex: "^ES[A-HJ-NP-SUVW0-9]\\d{7}[0-9A-J]$",
        supportedLegalForms: [
          "Autónomo / Trabajador por cuenta propia",
          "SL (Sociedad Limitada)",
          "SA (Sociedad Anónima)",
          "Comunidad de Bienes",
        ],
        requiredVerificationDocuments: [
          {
            id: "cif_extract",
            label: "Tarjeta acreditativa del NIF (Agencia Tributaria)",
            description: "Documento expedido por la AEAT",
          },
        ],
      },
    },
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2026-08-16T22:00:00Z",
    version: 1,
  },

  // 4. SWITZERLAND (Paused - Custom currency CHF, VAT 8.1%, IDE identifier)
  {
    id: "market-ch",
    code: "CH",
    countryCode: "CH",
    name: "Suisse",
    flag: "🇨🇭",
    status: "paused",
    isDefault: false,
    defaultLocale: "fr-CH",
    supportedLocales: ["fr-CH", "de-CH", "it-CH", "en-US"],
    currency: "CHF",
    currencySymbol: "CHF",
    timezone: "Europe/Zurich",
    geography: {
      allCountryEnabled: true,
      regions: [
        {
          name: "Genève",
          code: "GE",
          cities: [
            {
              name: "Genève",
              postalCode: "1200",
              region: "Genève",
              isPopular: true,
            },
            { name: "Vernier", postalCode: "1214", region: "Genève" },
          ],
        },
        {
          name: "Vaud",
          code: "VD",
          cities: [
            {
              name: "Lausanne",
              postalCode: "1000",
              region: "Vaud",
              isPopular: true,
            },
            { name: "Montreux", postalCode: "1820", region: "Vaud" },
          ],
        },
        {
          name: "Zürich",
          code: "ZH",
          cities: [
            {
              name: "Zürich",
              postalCode: "8000",
              region: "Zürich",
              isPopular: true,
            },
            { name: "Winterthur", postalCode: "8400", region: "Zürich" },
          ],
        },
      ],
      popularCities: [
        { name: "Genève", postalCode: "1200", region: "Genève" },
        { name: "Lausanne", postalCode: "1000", region: "Vaud" },
        { name: "Zürich", postalCode: "8000", region: "Zürich" },
        { name: "Bâle", postalCode: "4000", region: "Bâle" },
        { name: "Berne", postalCode: "3000", region: "Berne" },
      ],
    },
    overrides: {
      general: {
        name: "Suisse (Confédération Helvétique)",
        supportEmail: "support@shongre.ch",
      },
      localization: {
        defaultLocale: "fr-CH",
        supportedLocales: ["fr-CH", "de-CH", "it-CH", "en-US"],
        defaultCurrency: "CHF",
        currencySymbol: "CHF",
        timezone: "Europe/Zurich",
        phonePrefix: "+41",
        phonePlaceholder: "079 123 45 67",
        phoneRegex: "^(?:(?:\\+|00)41|0)[1-9]\\d{8}$",
        postalCodePlaceholder: "1201",
        postalCodeRegex: "^[1-9][0-9]{3}$",
      },
      payments: {
        buyerProtectionFixedFee:
          getDemoTransactionCommercials("CH", "individual")
            .protectionFixedMinor / 100,
        buyerProtectionFeePercent:
          getDemoTransactionCommercials("CH", "individual").protectionRateBps /
          10_000,
      },
      taxes: {
        vatRateStandard: getDemoTaxRateBps("CH") / 10_000,
      },
      pro: {
        businessIdentifierLabel: "Numéro IDE / UID",
        businessIdentifierHelper: "Format CHE-123.456.789",
        businessIdentifierRegex:
          "^(?:CHE[-.\\s]?)?\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{3}(?:\\s?(?:TVA|MWST|IVA))?$",
        businessIdentifierFormatPlaceholder: "CHE-849.204.892 TVA",
        vatNumberFormatPlaceholder: "CHE-849.204.892 TVA",
        vatNumberRegex:
          "^(?:CHE[-.\\s]?)?\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{3}(?:\\s?(?:TVA|MWST|IVA))?$",
        supportedLegalForms: [
          "Raison individuelle (Indépendant)",
          "Sàrl (Société à responsabilité limitée)",
          "SA (Société Anonyme)",
          "Société en nom collectif",
          "Association",
        ],
        requiredVerificationDocuments: [
          {
            id: "rc_extract",
            label: "Extrait du Registre du Commerce (RC)",
            description: "Extrait certifié conforme récent",
          },
        ],
      },
    },
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2026-08-16T22:00:00Z",
    version: 1,
  },

  // 5. LUXEMBOURG (Active - EUR, VAT 17%, RCS Luxembourg)
  {
    id: "market-lu",
    code: "LU",
    countryCode: "LU",
    name: "Luxembourg",
    flag: "🇱🇺",
    status: "active",
    isDefault: false,
    defaultLocale: "fr-LU",
    supportedLocales: ["fr-LU", "de-LU", "lb-LU", "en-US"],
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Luxembourg",
    geography: {
      allCountryEnabled: true,
      regions: [
        {
          name: "Canton de Luxembourg",
          code: "LUX",
          cities: [
            {
              name: "Luxembourg-Ville",
              postalCode: "L-1110",
              region: "Luxembourg",
              isPopular: true,
            },
            { name: "Strassen", postalCode: "L-8001", region: "Luxembourg" },
            { name: "Hesperange", postalCode: "L-5801", region: "Luxembourg" },
          ],
        },
        {
          name: "Canton d'Esch-sur-Alzette",
          code: "ESC",
          cities: [
            {
              name: "Esch-sur-Alzette",
              postalCode: "L-4001",
              region: "Esch-sur-Alzette",
              isPopular: true,
            },
            {
              name: "Differdange",
              postalCode: "L-4501",
              region: "Esch-sur-Alzette",
            },
            {
              name: "Dudelange",
              postalCode: "L-3401",
              region: "Esch-sur-Alzette",
            },
          ],
        },
      ],
      popularCities: [
        {
          name: "Luxembourg-Ville",
          postalCode: "L-1110",
          region: "Luxembourg",
        },
        {
          name: "Esch-sur-Alzette",
          postalCode: "L-4001",
          region: "Esch-sur-Alzette",
        },
        {
          name: "Differdange",
          postalCode: "L-4501",
          region: "Esch-sur-Alzette",
        },
        { name: "Dudelange", postalCode: "L-3401", region: "Esch-sur-Alzette" },
      ],
    },
    overrides: {
      general: {
        name: "Grand-Duché de Luxembourg",
        supportEmail: "support@shongre.lu",
      },
      localization: {
        defaultLocale: "fr-LU",
        supportedLocales: ["fr-LU", "de-LU", "lb-LU", "en-US"],
        phonePrefix: "+352",
        phonePlaceholder: "621 123 456",
        phoneRegex: "^(?:(?:\\+|00)352)?[2-9]\\d{5,8}$",
        postalCodePlaceholder: "L-1110",
        postalCodeRegex: "^(?:L-)?\\d{4}$",
      },
      taxes: {
        vatRateStandard: getDemoTaxRateBps("LU") / 10_000,
      },
      pro: {
        businessIdentifierLabel: "Numéro RCS Luxembourg",
        businessIdentifierHelper: "Format B123456 ou matricule national",
        businessIdentifierRegex: "^(?:[A-Z]\\s?\\d{4,7}|\\d{11})$",
        businessIdentifierFormatPlaceholder: "B 123456",
        vatNumberFormatPlaceholder: "LU 12345678",
        vatNumberRegex: "^LU\\s?[0-9]{8}$",
        supportedLegalForms: [
          "Indépendant / Personne physique",
          "SARL (Société à responsabilité limitée)",
          "SARL-S (SARL simplifiée)",
          "SA (Société Anonyme)",
          "SENC (Société en nom collectif)",
          "ASBL",
        ],
        requiredVerificationDocuments: [
          {
            id: "rcs_extract",
            label: "Extrait du Registre de Commerce et des Sociétés (RCS)",
            description: "Extrait certifié du LBR récent",
          },
        ],
      },
    },
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2026-08-16T22:00:00Z",
    version: 1,
  },
];

const statusFromRegistry = (
  status: (typeof COUNTRY_REGISTRY)[number]["launchStatus"],
): Market["status"] => {
  return status;
};

const marketFromCountryRegistry = (
  country: (typeof COUNTRY_REGISTRY)[number],
): Market => ({
  id: `market-${country.slug}`,
  code: country.code,
  countryCode: country.code,
  name: country.name,
  flag: country.flag,
  status: statusFromRegistry(country.launchStatus),
  isDefault: country.isDefault,
  defaultLocale: country.defaultLocale,
  supportedLocales: [...country.supportedLocales],
  currency: country.currency,
  currencySymbol: country.currencySymbol || country.currency,
  timezone: country.timezone,
  routing: {
    primaryDomain: country.primaryDomain,
    basePath: country.basePath,
    gatewayVisible: country.gatewayVisible,
    seoIndexable: country.seo.indexable,
  },
  geography: {
    allCountryEnabled: true,
    regions: [],
    popularCities: [],
  },
  configuration: createSafeMarketPolicy({
    name: country.name,
    defaultLocale: country.defaultLocale,
    supportedLocales: [...country.supportedLocales],
    currency: country.currency,
    currencySymbol: country.currencySymbol || country.currency,
    timezone: country.timezone,
    phonePrefix: country.phoneCountryCode,
    supportEmail: `support@${country.primaryDomain}`,
    tagline: country.launchContent.description,
  }),
  createdAt: "2026-08-25T00:00:00Z",
  updatedAt: "2026-08-25T00:00:00Z",
  version: 1,
});

/**
 * Detailed market policies are materialized once as complete local policies,
 * while stable identity,
 * launch state, locale, currency and routing always come from the shared
 * country registry. This keeps the existing rich fixtures without allowing
 * them to become a second country registry.
 */
export const INITIAL_MARKETS: Market[] = [
  ...CONFIGURED_MARKETS.map((seed) => {
    const { overrides, ...market } = seed;
    const country = getCountryConfig(market.code);
    const configuration = deepMergeOverrides(
      DEFAULT_MARKET_POLICY_CONFIG,
      overrides,
    );
    if (!country) return { ...market, configuration };
    return {
      ...market,
      name: country.name,
      flag: country.flag,
      status: statusFromRegistry(country.launchStatus),
      defaultLocale: country.defaultLocale,
      supportedLocales: [...country.supportedLocales],
      currency: country.currency,
      currencySymbol: country.currencySymbol || country.currency,
      timezone: country.timezone,
      configuration,
    };
  }),
  ...COUNTRY_REGISTRY.filter(
    (country) =>
      country.enabled &&
      !CONFIGURED_MARKETS.some((market) => market.code === country.code),
  ).map(marketFromCountryRegistry),
];
