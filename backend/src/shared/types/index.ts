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
  accountType: "individual" | "professional" | "internal";
  primaryRole: string;
  role: UserRole;
  sellerType?: "individual" | "pro";
  status:
    | "active"
    | "suspended"
    | "pending_verification"
    | "banned"
    | "archived"
    | "deleted";
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

export type ListingStatus =
  | "draft"
  | "published"
  | "reserved"
  | "sold"
  | "archived"
  | "rejected"
  | "flagged";

export type DeliveryType =
  "hand_delivery" | "relay_point" | "home_delivery" | "cocolis" | "express";

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
  city: string;
  postalCode: string;
  department?: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  allowedDelivery: DeliveryType[];
  shippingCost?: number;
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

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  marketCode?: string;
  city?: string;
  postalCode?: string;
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
}

export interface Transaction {
  id: string;
  orderNumber: string;
  transactionType: "DIRECT_PURCHASE" | "RESERVATION";
  listingId: string;
  listing?: Partial<Listing>;
  buyerId: string;
  buyer?: Partial<UserProfile>;
  sellerId: string;
  seller?: Partial<UserProfile>;
  status:
    | "initiated"
    | "escrow_funded"
    | "shipped"
    | "pin_pending"
    | "disputed"
    | "completed"
    | "refunded"
    | "cancelled";
  itemAmount: number;
  protectionFee: number;
  shippingFee: number;
  totalCharged: number;
  escrowSecuredAmount: number;
  depositAmount?: number;
  remainingBalance?: number;
  deliveryMethod: DeliveryType;
  shippingAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  handoverPin?: string;
  isPinVerified?: boolean;
  paymentMethod: string;
  paymentIntentId?: string;
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
  offerStatus?: "pending" | "accepted" | "declined" | "expired";
  isPickupProposal?: boolean;
  pickupDetails?: Record<string, any>;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  targetUserId: string;
  authorId: string;
  authorName?: string;
  rating: number;
  comment: string;
  listingTitle?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  shortLabel?: string;
  parentId?: string | null;
  iconName?: string;
  sortOrder?: number;
  isActive?: boolean;
  subcategories?: Category[];
}

export interface CountryMarketDefinition {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  protectionFeeRate: number;
  protectionFixedFee: number;
  freeListingsLimit: number;
  allowedDeliveryMethods: DeliveryType[];
  isBaseMarket?: boolean;
  isActive?: boolean;
}
