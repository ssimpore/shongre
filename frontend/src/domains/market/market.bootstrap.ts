import {
  listPublicCountries,
  publicMarketExperience,
} from "@shongre/contracts/market-country";
import type { Market, MarketConfiguration } from "./market.types";
import { PRICE_FILTER_STOPS_MAJOR_DEFAULT } from "./market.constants";

const EMPTY_PLAN = Object.freeze({
  priceMonthly: 0,
  maxActiveListings: 0,
  photosPerListing: 0,
  storefrontCustomization: false,
  prioritySupport: false,
  bulkImportExport: false,
  automaticRelisting: false,
});

function bootstrapConfiguration(
  country: ReturnType<typeof listPublicCountries>[number],
): MarketConfiguration {
  return {
    general: {
      name: country.name,
      tagline: country.launchContent.title,
      supportEmail: "support@shongre.com",
      launchState:
        publicMarketExperience(country) === "active"
          ? "full"
          : "selected_cities",
    },
    localization: {
      defaultLocale: country.defaultLocale,
      supportedLocales: [...country.supportedLocales],
      defaultCurrency: country.currency,
      currencySymbol: country.currencySymbol || country.currency,
      timezone: country.timezone,
      dateFormat: "dd/MM/yyyy",
      dateTimeFormat: "dd/MM/yyyy HH:mm",
      phonePrefix: "",
      phonePlaceholder: "",
      phoneRegex: "^$",
      postalCodePlaceholder: "",
      postalCodeRegex: "^$",
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
    search: { priceFilterStopsMajor: [...PRICE_FILTER_STOPS_MAJOR_DEFAULT] },
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
        mondialRelay: {
          enabled: false,
          label: "",
          defaultFee: 0,
          trackingSupported: false,
        },
        colissimo: {
          enabled: false,
          label: "",
          defaultFee: 0,
          trackingSupported: false,
        },
        chronopost: {
          enabled: false,
          label: "",
          defaultFee: 0,
          trackingSupported: false,
        },
        customCarrier: {
          enabled: false,
          label: "",
          defaultFee: 0,
          trackingSupported: false,
        },
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
        free: { ...EMPTY_PLAN },
        starter: { ...EMPTY_PLAN },
        business: { ...EMPTY_PLAN },
        enterprise: { ...EMPTY_PLAN },
      },
    },
    pro: {
      businessIdentifierLabel: "",
      businessIdentifierHelper: "",
      businessIdentifierRegex: "^$",
      businessIdentifierFormatPlaceholder: "",
      vatNumberFormatPlaceholder: "",
      vatNumberRegex: "^$",
      supportedLegalForms: [],
      requiredVerificationDocuments: [],
      requireKbis: false,
    },
    taxes: {
      taxEnabled: false,
      vatRateStandard: 0,
      pricesTaxInclusive: true,
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
 * Server-safe, fail-closed shell data. The HTTP service replaces the current
 * market with its authoritative API projection after hydration.
 */
export const BOOTSTRAP_MARKETS: Market[] = listPublicCountries().map(
  (country) => ({
    id: country.marketId,
    code: country.code,
    countryCode: country.countryCode,
    name: country.name,
    flag: country.flag,
    status:
      publicMarketExperience(country) === "active" ? "active" : "coming_soon",
    isDefault: country.isDefault,
    defaultLocale: country.defaultLocale,
    supportedLocales: [...country.supportedLocales],
    currency: country.currency,
    supportedCurrencies: [...country.supportedCurrencies],
    currencySymbol: country.currencySymbol || country.currency,
    timezone: country.timezone,
    routing: {
      canonicalDomainMode: country.canonicalDomainMode,
      basePath: country.basePath,
      gatewayVisible: country.gatewayVisible,
      seoIndexable: country.seo.indexable,
    },
    geography: {
      allCountryEnabled: true,
      regions: [],
      popularCities: [],
    },
    configuration: bootstrapConfiguration(country),
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    version: 0,
  }),
);
