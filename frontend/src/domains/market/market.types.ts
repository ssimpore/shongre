/**
 * Multi-Country / Multi-Market Core Domain Types
 */

export type MarketStatus =
  | "draft"
  | "configured"
  | "coming_soon"
  | "private_beta"
  | "beta"
  | "active"
  | "paused"
  | "disabled"
  | "unsupported"
  | "archived";

type SettingSource = "LOCAL" | "PLATFORM_DEFAULT";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends unknown[]
    ? T[P]
    : T[P] extends readonly unknown[]
      ? T[P]
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

export interface MarketCity {
  name: string;
  postalCode: string;
  department?: string;
  region: string;
  isPopular?: boolean;
}

interface MarketRegion {
  name: string;
  code: string;
  cities: MarketCity[];
}

export interface MarketGeography {
  allCountryEnabled: boolean;
  regions: MarketRegion[];
  popularCities: MarketCity[];
  priorityLaunchZones?: string[];
}

interface GeneralMarketConfig {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone?: string;
  launchState: "full" | "selected_cities";
}

interface LocalizationMarketConfig {
  defaultLocale: string;
  supportedLocales: string[];
  defaultCurrency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  dateTimeFormat: string;
  phonePrefix: string;
  phonePlaceholder: string;
  phoneRegex: string;
  postalCodePlaceholder: string;
  postalCodeRegex: string;
}

interface ListingsMarketConfig {
  maxActiveListingsIndividual: number;
  maxActiveListingsProFree: number;
  maxPhotosIndividual: number;
  maxPhotosPro: number;
  expirationDays: number;
  allowFreeDonations: boolean;
  allowPriceNegotiation: boolean;
  allowInstantBuy: boolean;
}

interface SearchMarketConfig {
  /** Ordered major-unit price stops used by the public range filter. */
  priceFilterStopsMajor: number[];
}

interface PaymentsMarketConfig {
  enabled: boolean;
  provider: "mangopay_escrow" | "stripe_connect" | "none";
  supportedMethods: {
    card: boolean;
    applePay: boolean;
    googlePay: boolean;
    sepa: boolean;
  };
  buyerProtectionFeePercent: number; // e.g. 0.04 for 4%
  buyerProtectionFixedFee: number; // in market currency, e.g. 0.70
  minTransactionAmount: number;
  maxTransactionAmount: number;
}

interface ReservationMarketConfig {
  enabled: boolean;
  sellerConfirmationTimeoutHours: number;
  buyerInspectionTimeoutHours: number;
  autoCompleteDays: number;
  requirePinForHandDelivery: boolean;
}

interface CarrierConfig {
  enabled: boolean;
  label: string;
  defaultFee: number;
  trackingSupported: boolean;
}

interface DeliveryMarketConfig {
  enabled: boolean;
  handDeliveryEnabled: boolean;
  carriers: {
    mondialRelay: CarrierConfig;
    colissimo: CarrierConfig;
    chronopost: CarrierConfig;
    customCarrier: CarrierConfig;
  };
}

interface BoostPricingConfig {
  urgent: number;
  highlight: number;
  top_of_list: number;
  gallery_boost: number;
  spotlight: number;
}

interface ProPlanTierConfig {
  priceMonthly: number;
  maxActiveListings: number;
  photosPerListing: number;
  storefrontCustomization: boolean;
  prioritySupport: boolean;
  bulkImportExport: boolean;
  automaticRelisting: boolean;
}

interface MonetizationMarketConfig {
  payoutInstantFeePercent: number; // e.g. 0.01
  payoutInstantFixedFee: number; // e.g. 0.50
  boostPricing: BoostPricingConfig;
  plans: {
    free: ProPlanTierConfig;
    starter: ProPlanTierConfig;
    business: ProPlanTierConfig;
    enterprise: ProPlanTierConfig;
  };
}

interface RequiredVerificationDocument {
  id: string;
  label: string;
  description: string;
}

interface ProMarketConfig {
  businessIdentifierLabel: string; // e.g. "Numéro SIRET (ou SIREN)"
  businessIdentifierHelper: string;
  businessIdentifierRegex: string;
  businessIdentifierFormatPlaceholder: string;
  secondaryIdentifierLabel?: string;
  vatNumberFormatPlaceholder: string;
  vatNumberRegex: string;
  supportedLegalForms: string[];
  requiredVerificationDocuments: RequiredVerificationDocument[];
  requireKbis: boolean;
}

interface TaxesMarketConfig {
  taxEnabled: boolean;
  vatRateStandard: number; // e.g. 0.20 for FR, 0.21 for BE, 0.081 for CH
  pricesTaxInclusive: boolean;
}

interface LegalMarketConfig {
  termsUrl: string;
  privacyUrl: string;
  cookiePolicyUrl: string;
  buyerProtectionTermsUrl: string;
  proTermsUrl: string;
  requiresLocalReview: boolean;
}

interface FeaturesMarketConfig {
  reviewsEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiSafetyAuditEnabled: boolean;
  savedSearchesEnabled: boolean;
  recentSearchesLimit: number;
  sellerFollowEnabled: boolean;
  proStorefrontsEnabled: boolean;
  disputeEscalationEnabled: boolean;
}

interface TaxonomyMarketConfig {
  disabledCategorySlugs: string[];
  disabledSubCategorySlugs: string[];
}

/**
 * Complete Market Configuration Schema
 */
export interface MarketConfiguration {
  general: GeneralMarketConfig;
  localization: LocalizationMarketConfig;
  listings: ListingsMarketConfig;
  search: SearchMarketConfig;
  payments: PaymentsMarketConfig;
  reservation: ReservationMarketConfig;
  delivery: DeliveryMarketConfig;
  monetization: MonetizationMarketConfig;
  pro: ProMarketConfig;
  taxes: TaxesMarketConfig;
  legal: LegalMarketConfig;
  features: FeaturesMarketConfig;
  taxonomy: TaxonomyMarketConfig;
}

export type MarketOverrides = DeepPartial<MarketConfiguration>;

/**
 * Authoritative Market Entity
 */
export interface Market {
  id: string;
  code: string; // 'FR', 'BE', 'ES', 'CH' (ISO 3166-1 alpha-2)
  countryCode: string; // 'FR', 'BE', 'ES', 'CH'
  name: string; // 'France', 'Belgique', 'Espagne', 'Suisse'
  flag: string; // '🇫🇷', '🇧🇪', '🇪🇸', '🇨🇭'
  status: MarketStatus;
  isDefault: boolean; // France is the ONLY default (isDefault: true)
  defaultLocale: string;
  supportedLocales: string[];
  currency: string;
  supportedCurrencies: string[];
  currencySymbol: string;
  timezone: string;
  routing?: {
    canonicalDomainMode: "france" | "international";
    basePath: string;
    gatewayVisible: boolean;
    seoIndexable: boolean;
  };

  geography: MarketGeography;
  /** Complete explicit policy. Missing fields never resolve from another market. */
  configuration: MarketConfiguration;

  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Provenance resolution result for a single setting
 */
export interface SettingResolution<T = any> {
  value: T;
  source: SettingSource;
  sourceMarketCode: string;
  isInherited: boolean;
  overrideDefined: boolean;
  baselineReferenceValue: T;
}

/**
 * Compatibility metrics used by the existing admin presentation. Explicit
 * market policies always report 100% locally configured.
 */
export interface MarketInheritanceMetrics {
  marketCode: string;
  totalFieldsCount: number;
  inheritedFieldsCount: number;
  overriddenFieldsCount: number;
  percentInherited: number;
  percentOverridden: number;
}
