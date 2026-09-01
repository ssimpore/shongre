/**
 * SHONGRE LISTING PUBLICATION DOMAIN TYPES
 * Defines models for dynamic publication schemas, intents, price models,
 * transaction modes, fulfillment capabilities, and draft lifecycles.
 */

import { ListingFamily, FulfillmentMode } from "../taxonomy/taxonomy.types";

export type ListingMarketStatus =
  "active" | "pending" | "suspended" | "rejected" | "draft" | "paused";

export interface ListingMarketPublication {
  marketCode: string; // e.g. 'FR', 'BE', 'CH', 'ES'
  status: ListingMarketStatus;
  isPrimary?: boolean;
  publishedAt?: string;
  customPrice?: number;
  currency?: string;
  complianceChecked?: boolean;
  complianceIssues?: string[];
  availableServices?: {
    handDelivery?: boolean;
    parcelShipping?: boolean;
    directPurchase?: boolean;
    reservation?: boolean;
  };
}

export interface MarketEligibilityResult {
  marketCode: string;
  marketName: string;
  countryCode: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  status: string;
  isDefault: boolean;
  isEligible: boolean;
  ineligibilityReason?: string;
  warnings: string[];
  features: {
    directPurchase: boolean;
    reservation: boolean;
    handDelivery: boolean;
    parcelShipping: boolean;
    crossBorderDeliverySupported: boolean;
  };
}

export interface MultiMarketValidationResult {
  isValid: boolean;
  marketResults: Record<
    string,
    {
      marketCode: string;
      marketName: string;
      flag: string;
      isValid: boolean;
      errors: ValidationError[];
      warnings: string[];
    }
  >;
  globalErrors: ValidationError[];
  globalWarnings: string[];
}

export type ListingIntent =
  | "SELL"
  | "DONATE"
  | "EXCHANGE"
  | "RENT_OUT"
  | "RENT_SEEK"
  | "SERVICE_OFFER"
  | "SERVICE_REQUEST"
  | "JOB_OFFER"
  | "JOB_SEEK"
  | "WANTED"
  | "BOOK"
  | "COURSE_OFFER"
  | "BUSINESS_SALE"
  | "NOTICE"
  // Compatibility values accepted while persisted v3 drafts are upgraded.
  | "GIVE"
  | "RENT"
  | "OFFER_SERVICE";

export type PriceModel =
  | "fixed"
  | "negotiable"
  | "free"
  | "on_request"
  | "hourly"
  | "daily"
  | "monthly"
  | "rent_plus_charges";

export type TransactionMode =
  "CONTACT_ONLY" | "DIRECT_PURCHASE" | "RESERVATION";

export type PackageSizeTier =
  | "small" // < 500g (e.g. smartphone, jewelry, t-shirt)
  | "medium" // < 2kg (e.g. shoes, tablet, small decor)
  | "large" // < 5kg (e.g. coat, small appliances, laptop)
  | "xlarge" // < 30kg (e.g. large box, bike parts, audio amp)
  | "heavy"; // > 30kg (furniture, sofa, machine)

export interface PackageSpecs {
  sizeTier: PackageSizeTier;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface SellerTransactionChoice {
  allowContact: boolean;
  allowDirectPurchase: boolean;
  allowReservation: boolean;
  reservationType?: "instant" | "request";
}

export interface SellerFulfillmentChoice {
  allowHandDelivery: boolean;
  allowParcelShipping: boolean;
  allowBulkyDelivery: boolean;
  allowSellerDelivery: boolean;
  allowStorePickup: boolean;
  packageSpecs?: PackageSpecs;
  sellerDeliveryRadiusKm?: number;
  sellerDeliveryFee?: number;
  freeDeliveryThreshold?: number;
  storePickupAddress?: string;
}

export interface PublicationPriceConfig {
  priceModel: PriceModel;
  amount: number;
  currency: string;
  originalPrice?: number;
  isNegotiable: boolean;
  isFreeDonation: boolean;
  rentalCharges?: number;
  unitTime?: "hour" | "day" | "month" | "year";
}

export interface ProInventoryData {
  sku?: string;
  internalReference?: string;
  stock: number;
  lowStockAlert?: number;
  vatRatePercent?: number;
  isVatIncluded?: boolean;
}

export interface PublicationDraftState {
  id?: string;
  marketCode: string;
  selectedMarkets?: string[]; // Multiple target publication markets e.g. ['FR', 'BE']
  marketPublications?: Record<string, Partial<ListingMarketPublication>>;
  taxonomyNodeId: string;
  listingTypeId?: string;
  taxonomyVersion?: "4.0.0";
  taxonomySlug?: string;
  listingIntent: ListingIntent;
  listingFamily?: ListingFamily;
  title: string;
  description: string;
  condition: string;
  attributes: Record<string, any>;
  photos: {
    id: string;
    url: string;
    isCover: boolean;
    alt?: string;
  }[];
  pricing: PublicationPriceConfig;
  transaction: SellerTransactionChoice;
  fulfillment: SellerFulfillmentChoice;
  fulfillmentTypes?: import("@shongre/contracts/digital-products").FulfillmentType[];
  digitalFulfillment?: import("@shongre/contracts/digital-products").DigitalFulfillmentVersionInput;
  proInventory?: ProInventoryData;
  location: {
    city: string;
    postalCode: string;
    department?: string;
    region?: string;
    countryCode: string;
    latitude?: number;
    longitude?: number;
    hideExactAddress: boolean;
  };
  boostPackage?: string;
  currentStep: number;
  updatedAt: string;
}

export interface TransactionCapabilitiesResult {
  canContact: boolean;
  canDirectPurchase: boolean;
  canReserve: boolean;
  defaultModes: TransactionMode[];
  directPurchaseDisabledReason?: string;
  reservationDisabledReason?: string;
}

export interface FulfillmentCapabilitiesResult {
  allowHandDelivery: boolean;
  allowParcelShipping: boolean;
  allowBulkyDelivery: boolean;
  allowSellerDelivery: boolean;
  allowStorePickup: boolean;
  allowDigital: boolean;
  allowService: boolean;
  allowedModes: FulfillmentMode[];
}

export interface DeliveryQuote {
  id: string;
  provider:
    | "mondial_relay"
    | "colissimo"
    | "chronopost"
    | "cocolis"
    | "hand_delivery"
    | "store_pickup"
    | "seller_delivery";
  code: string;
  title: string;
  description: string;
  deliveryType:
    | "relay_point"
    | "home_delivery"
    | "express"
    | "hand_delivery"
    | "store_pickup";
  price: number;
  currency: string;
  estimatedDeliveryDays: string;
  isGuaranteed: boolean;
  trackingAvailable: boolean;
}

export interface OrderPricingBreakdown {
  itemSubtotal: number;
  quantity: number;
  deliveryFee: number;
  buyerServiceFee: number;
  sellerCommission: number;
  discount: number;
  tax: number;
  buyerTotal: number;
  sellerNet: number;
  currency: string;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
