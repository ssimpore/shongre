import type {
  AccountStatus,
  AccountType,
  Capability,
  ProfessionalVertical,
  StaffRole,
  StaffStatus,
} from "@shongre/contracts/access-control";
import type { CountryConfig } from "@shongre/contracts";

export type UserRole =
  | "guest"
  | "individual_buyer"
  | "individual_seller"
  | "pro_seller"
  | "moderator"
  | "admin"
  | string;

export interface UserProfile {
  id: string;
  slug: string;
  email: string;
  name: string;
  accountType: AccountType;
  professionalVertical?: ProfessionalVertical;
  staffStatus?: StaffStatus;
  staffRole?: StaffRole;
  primaryRole: string;
  role: UserRole;
  sellerType?: "individual" | "pro";
  status: AccountStatus;
  customPermissions?: Capability[];
  revokedPermissions?: Capability[];
  capabilityOverrideVersion?: number;
  /** Read projection only; organization entitlements remain authoritative. */
  enabledProducts?: readonly ("marketplace" | "prospects" | "facturation")[];
  avatarUrl?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  country: string;
  bio?: string;
  isVerified: boolean;
  isIdentityVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isBusinessVerified?: boolean;
  rating: number;
  reviewCount: number;
  responseRatePercent: number;
  responseTimeText?: string;
  createdAt?: string;
}

/**
 * Deliberately small marketplace projection. Authentication, staff roles,
 * contact details, account state and individual verification dimensions are
 * private account data and must never be serialized by a public route.
 */
export interface PublicSellerProfile {
  id: string;
  slug: string;
  name: string;
  accountType: "individual" | "professional";
  sellerType: "individual" | "pro";
  avatarUrl?: string;
  city?: string;
  country: string;
  bio?: string;
  isVerified: boolean;
  isBusinessVerified: boolean;
  rating: number;
  reviewCount: number;
  responseRatePercent: number;
  responseTimeText?: string;
  createdAt?: string;
}

export type ListingStatus =
  | "draft"
  | "published"
  | "reserved"
  | "sold"
  | "archived"
  | "rejected"
  | "flagged";

export type DeliveryType =
  | "hand_delivery"
  | "relay_point"
  | "home_delivery"
  | "cocolis"
  | "express"
  | "digital";

export type ListingMarketPublicationStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "suspended"
  | "rejected"
  | "expired";

export interface ListingMarketPublication {
  marketCode: string;
  status: ListingMarketPublicationStatus;
  isPrimary: boolean;
  priceMinor: number;
  currency: string;
  localizedContent?: Record<string, unknown>;
  availableServices?: Record<string, unknown>;
  complianceState: "pending" | "approved" | "restricted" | "rejected";
  publishedAt?: string;
  sortDate: string;
  promotionState?: "inactive" | "active";
  promotionType?: Listing["promotionType"];
  promotionSource?: Listing["promotionSource"];
  promotionSourceId?: string;
  promotionLabel?: string;
  promotionStartAt?: string;
  promotionEndAt?: string;
  promotedAt?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  storeId?: string;
  /** Canonical ownership. Legacy sellerId remains the authorized publishing actor. */
  publisherType?: "private" | "professional";
  publisherUserId?: string;
  publisherOrganizationId?: string;
  publisherBranchId?: string;
  publisherVerificationStatus?:
    | "unverified"
    | "email_verified"
    | "phone_verified"
    | "identity_verified"
    | "business_verified"
    | "suspended";
  publisherStatus?: "active" | "suspended" | "deleted";
  publicationOfferId?: string;
  subscriptionId?: string;
  entitlementSnapshot?: Record<string, string | number | boolean | string[]>;
  seller?: UserProfile;
  categoryId: string;
  listingTypeId?: string;
  listingIntent?: import("@shongre/contracts").TaxonomyV1ListingIntent;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  status: ListingStatus;
  condition: string;
  brand?: string;
  model?: string;
  marketCode: string;
  marketCodes?: string[];
  marketPublications?: ListingMarketPublication[];
  city: string;
  postalCode: string;
  department?: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  administrativeArea?: string;
  normalizedAddress?: string;
  /**
   * The most revealing precision a public reader may receive for this listing.
   * The stored coordinate is the seller's real one; this decides what is
   * published from it. Rows default to `approximate` in the database.
   */
  locationPrecision?: import("@shongre/contracts/geospatial").LocationPrecision;
  locationSource?: import("@shongre/contracts/geospatial").LocationSource;
  /**
   * Kilometres from the origin a radius search supplied, measured by PostGIS on
   * the authoritative point. Present only on rows a spatial query returned.
   */
  distanceKm?: number;
  geocodingProvider?: string;
  geocodedAt?: string;
  locationUpdatedAt?: string;
  allowedDelivery: DeliveryType[];
  shippingCost?: number;
  fulfillmentModel?: import("@shongre/contracts/digital-products").FulfillmentType;
  digitalFulfillmentVersionId?: string;
  productVersion?: string;
  images: string[];
  isUrgent?: boolean;
  isFeatured?: boolean;
  urgentExpiresAt?: string;
  featuredExpiresAt?: string;
  bumpedAt?: string;
  promotionState?:
    | "inactive"
    | "scheduled"
    | "active"
    | "expired"
    | "cancelled"
    | "refunded"
    | "failed";
  promotionType?:
    | "urgent_badge"
    | "search_bump"
    | "featured"
    | "top_placement"
    | "sponsored_search"
    | "homepage_spotlight"
    | "category_spotlight"
    | "local_spotlight"
    | "seller_spotlight";
  promotionSource?: "purchase" | "subscription_credit" | "admin_grant";
  promotionSourceId?: string;
  promotionLabel?: string;
  promotionStartAt?: string;
  promotionEndAt?: string;
  publishedAt?: string;
  materiallyUpdatedAt?: string;
  organicFreshnessAt?: string;
  promotedAt?: string;
  externalStockId?: string;
  duplicateGroupId?: string;
  discovery?: import("@shongre/contracts").DiscoveryPresentation;
  viewCount: number;
  favoriteCount: number;
  safetyRiskScore?: number;
  attributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type PublicListingMarketPublication = Omit<
  ListingMarketPublication,
  "promotionSource" | "promotionSourceId"
>;

export type PublicListing = Omit<
  Listing,
  | "seller"
  | "publisherStatus"
  | "publicationOfferId"
  | "subscriptionId"
  | "entitlementSnapshot"
  | "promotionSource"
  | "promotionSourceId"
  | "externalStockId"
  | "duplicateGroupId"
  | "safetyRiskScore"
  | "digitalFulfillmentVersionId"
  | "marketPublications"
> & {
  seller?: PublicSellerProfile;
  taxonomy?: import("@shongre/contracts/openapi").components["schemas"]["ListingTaxonomyProjection"];
  /** Backend-resolved source kind plus a one-way public proof identifier. */
  promotionSource?: Listing["promotionSource"];
  promotionSourceId?: string;
  marketPublications?: PublicListingMarketPublication[];
  fulfillmentTypes: import("@shongre/contracts/digital-products").FulfillmentType[];
  requiresPhysicalDelivery: boolean;
  /**
   * How precise the published coordinate is, and therefore how it may be drawn.
   *
   * `approximate` is a deterministically displaced point — a disc, not a pin.
   * `city` and `postal_code` are administrative centroids. `hidden` publishes
   * no coordinate at all. `exact` is reserved for listings whose policy allows
   * it, which never includes a private seller's home.
   */
  locationPrecision?: import("@shongre/contracts/geospatial").LocationPrecision;
  /**
   * Kilometres from the origin the caller searched from, when they supplied
   * one. Measured on the authoritative point, so it does not drift from the
   * radius that selected the listing even though the published point is
   * displaced.
   */
  distanceKm?: number;
};

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  /** Internal expansion from the published taxonomy; never accepted from HTTP. */
  categoryIds?: readonly string[];
  categorySlug?: string;
  subCategorySlug?: string;
  marketCode?: string;
  city?: string;
  postalCode?: string;
  /**
   * Where the searcher is, when they told us.
   *
   * A radius without a centre is meaningless and a centre without a radius is
   * only a sort origin, so the two travel together and are validated together
   * at the HTTP boundary. Both are pushed into PostGIS rather than filtered in
   * application code: `ST_DWithin` uses the GiST index, and reading the market
   * into memory to measure distances does not.
   */
  center?: import("@shongre/contracts/geospatial").GeoCoordinate;
  radiusKm?: number;
  /** The visible map, for a "search this area" request. */
  boundingBox?: import("@shongre/contracts/geospatial").GeoBoundingBox;
  department?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  deliveryType?: DeliveryType;
  isUrgent?: boolean;
  isPro?: boolean;
  sellerType?: "all" | "private" | "professional" | "individual" | "pro";
  verifiedPublishersOnly?: boolean;
  sellerId?: string;
  publisherOrganizationId?: string;
  attributes?: Record<string, any>;
  sortBy?:
    | "recent"
    | "date_desc"
    | "price_asc"
    | "price_desc"
    | "relevance"
    | "distance";
  page?: number;
  limit?: number;
  /** Opaque discovery cursor. Callers must not parse or synthesize it. */
  cursor?: string;
  conditions?: string[];
  deliveryAvailable?: boolean;
  onlinePaymentAvailable?: boolean;
  onlyDeals?: boolean;
  publishedToday?: boolean;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  transactionType: "DIRECT_PURCHASE" | "RESERVATION";
  listingId: string;
  listing?: Partial<PublicListing>;
  buyerId: string;
  buyer?: PublicSellerProfile;
  sellerId: string;
  seller?: PublicSellerProfile;
  taxonomy?: import("@shongre/contracts/openapi").components["schemas"]["ListingTaxonomyProjection"];
  status:
    | "initiated"
    | "payment_pending"
    | "escrow_funded"
    | "shipped"
    | "pin_pending"
    | "disputed"
    | "completed"
    | "refund_pending"
    | "refunded"
    | "cancelled";
  itemAmount: number;
  itemAmountMinor?: number;
  protectionFee: number;
  protectionFeeMinor?: number;
  shippingFee: number;
  shippingFeeMinor?: number;
  totalCharged: number;
  totalChargedMinor?: number;
  escrowSecuredAmount: number;
  escrowSecuredAmountMinor?: number;
  currency: string;
  commissionCalculationId?: string;
  platformCommissionMinor?: number;
  sellerPayableMinor?: number;
  commissionSnapshotHash?: string;
  depositAmount?: number;
  remainingBalance?: number;
  deliveryMethod: DeliveryType;
  fulfillmentModel?: import("@shongre/contracts/digital-products").FulfillmentType;
  digitalFulfillmentVersionId?: string;
  productVersion?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  handoverCodeRequired?: boolean;
  isPinVerified?: boolean;
  paymentMethod: string;
  carrierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  disputeReason?: string;
  disputeDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  listing?: Partial<Listing>;
  buyerId: string;
  buyer?: Partial<UserProfile>;
  sellerId: string;
  seller?: Partial<UserProfile>;
  lastMessageText?: string;
  lastMessageAt: string;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  isOffer?: boolean;
  offerPrice?: number;
  offerId?: string;
  offerAmountMinor?: number;
  offerCurrency?: string;
  offerExpiresAt?: string;
  offerStatus?:
    "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired";
  isPickupProposal?: boolean;
  pickupDetails?: Record<string, any>;
  createdAt: string;
}

export interface MessagePage {
  items: Message[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
}

export interface ConversationPage {
  items: Conversation[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  category?: string;
  title: string;
  body: string;
  marketCode?: string;
  linkUrl?: string;
  isRead: boolean;
  inAppVisible?: boolean;
  createdAt: string;
}

export type ReviewItem =
  import("@shongre/contracts/openapi").components["schemas"]["MarketplaceReview"];

export interface Category {
  id: string;
  slug: string;
  name: string;
  labels?: Record<string, string>;
  shortLabels?: Record<string, string>;
  shortLabel?: string;
  parentId?: string | null;
  iconName?: string;
  sortOrder?: number;
  isActive?: boolean;
  subcategories?: Category[];
}

export interface CountryMarketDefinition extends CountryConfig {
  /** Backwards-compatible alias while commercial modules migrate to defaultLocale. */
  locale: string;
  currencySymbol: string;
  protectionFeeRate: number;
  protectionFixedFee: number;
  freeListingsLimit: number;
  reservationDepositRateBps: number;
  reservationDepositMinimumMinor: number;
  reservationDepositMaximumMinor: number;
  allowedDeliveryMethods: DeliveryType[];
  isBaseMarket?: boolean;
  isActive?: boolean;
  version?: number;
  updatedAt?: string;
}
