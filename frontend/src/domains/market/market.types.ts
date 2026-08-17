/**
 * Multi-Country / Multi-Market Core Domain Types
 */

export type MarketStatus =
  | 'draft'
  | 'configured'
  | 'coming_soon'
  | 'active'
  | 'paused'
  | 'archived';

export type SettingSource = 'FR' | 'LOCAL' | 'PLATFORM_DEFAULT';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? T[P]
    : T[P] extends readonly (infer U)[]
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

export interface MarketRegion {
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

export interface GeneralMarketConfig {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone?: string;
  launchState: 'full' | 'selected_cities';
}

export interface LocalizationMarketConfig {
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

export interface ListingsMarketConfig {
  maxActiveListingsIndividual: number;
  maxActiveListingsProFree: number;
  maxPhotosIndividual: number;
  maxPhotosPro: number;
  expirationDays: number;
  allowFreeDonations: boolean;
  allowPriceNegotiation: boolean;
  allowInstantBuy: boolean;
}

export interface PaymentsMarketConfig {
  enabled: boolean;
  provider: 'mangopay_escrow' | 'stripe_connect' | 'none';
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

export interface ReservationMarketConfig {
  enabled: boolean;
  sellerConfirmationTimeoutHours: number;
  buyerInspectionTimeoutHours: number;
  autoCompleteDays: number;
  requirePinForHandDelivery: boolean;
}

export interface CarrierConfig {
  enabled: boolean;
  label: string;
  defaultFee: number;
  trackingSupported: boolean;
}

export interface DeliveryMarketConfig {
  enabled: boolean;
  handDeliveryEnabled: boolean;
  carriers: {
    mondialRelay: CarrierConfig;
    colissimo: CarrierConfig;
    chronopost: CarrierConfig;
    customCarrier: CarrierConfig;
  };
}

export interface BoostPricingConfig {
  urgent: number;
  highlight: number;
  top_of_list: number;
  gallery_boost: number;
  spotlight: number;
}

export interface ProPlanTierConfig {
  priceMonthly: number;
  maxActiveListings: number;
  photosPerListing: number;
  storefrontCustomization: boolean;
  prioritySupport: boolean;
  bulkImportExport: boolean;
  automaticRelisting: boolean;
}

export interface MonetizationMarketConfig {
  proCommissionRate: number; // e.g. 0.03 for 3%
  individualCommissionRate: number; // e.g. 0.00
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

export interface RequiredVerificationDocument {
  id: string;
  label: string;
  description: string;
}

export interface ProMarketConfig {
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

export interface TaxesMarketConfig {
  taxEnabled: boolean;
  vatRateStandard: number; // e.g. 0.20 for FR, 0.21 for BE, 0.081 for CH
  pricesTaxInclusive: boolean;
}

export interface LegalMarketConfig {
  termsUrl: string;
  privacyUrl: string;
  cookiePolicyUrl: string;
  buyerProtectionTermsUrl: string;
  proTermsUrl: string;
  requiresLocalReview: boolean;
}

export interface FeaturesMarketConfig {
  reviewsEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiSafetyAuditEnabled: boolean;
  savedSearchesEnabled: boolean;
  sellerFollowEnabled: boolean;
  proStorefrontsEnabled: boolean;
  disputeEscalationEnabled: boolean;
}

export interface TaxonomyMarketConfig {
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
  currencySymbol: string;
  timezone: string;
  
  geography: MarketGeography;
  overrides: MarketOverrides; // Delta overrides relative to France
  
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
  frenchReferenceValue: T;
}

/**
 * Summary metrics of inheritance for a given market
 */
export interface MarketInheritanceMetrics {
  marketCode: string;
  totalFieldsCount: number;
  inheritedFieldsCount: number;
  overriddenFieldsCount: number;
  percentInherited: number;
  percentOverridden: number;
}
