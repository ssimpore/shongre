import type {
  AccountStatus,
  ProfessionalVerification,
  IdentityVerification,
  BankPayoutVerification,
  EmailVerification,
  PhoneVerification,
  UserSession,
  AuthSecurityEvent,
  MFASettings,
  LegalConsent,
  AuthErrorCode,
  AuthResult,
} from "./auth.types";
import type {
  AccountType as CanonicalAccountType,
  Capability,
  PlatformRole as SharedPlatformRole,
  ProfessionalVertical,
  StaffRole,
} from "@shongre/contracts/access-control";

export type {
  AccountStatus,
  ProfessionalVerification,
  IdentityVerification,
  BankPayoutVerification,
  EmailVerification,
  PhoneVerification,
  UserSession,
  AuthSecurityEvent,
  MFASettings,
  LegalConsent,
  AuthErrorCode,
  AuthResult,
};

export * from "../domains/market/market.types";
export * from "../domains/verification/verification.types";

export type AccountType = CanonicalAccountType;
export type { ProfessionalVertical, StaffRole };

export type PlatformRole = Exclude<
  SharedPlatformRole,
  "individual_buyer" | "individual_seller"
>;

// Compatibility alias with existing code
export type UserRole =
  | "guest"
  | "individual_buyer"
  | "individual_seller"
  | "pro_seller"
  | "moderator"
  | "admin"
  | PlatformRole;

export type SellerType = "individual" | "pro";

export interface MarketScope {
  countries: string[]; // e.g. ['FR'], ['BE'], ['*'] for global
  regions?: string[];
}

export type Permission = Capability;

export type SecurityAuditAction =
  | "MARKET_CONFIG_UPDATE"
  | "AUTO_FLAG_SUSPICIOUS_PRICE"
  | "role_assigned"
  | "role_removed"
  | "user_suspended"
  | "user_reactivated"
  | "verification_approved"
  | "verification_rejected"
  | "listing_moderated"
  | "market_scope_updated"
  | "plan_modified"
  | "permission_overridden"
  | "listing_hidden"
  | "listing_restored"
  | "password_reset_completed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "account_type_upgraded_to_pro"
  | "account_deleted"
  | "email_verified"
  | "phone_verified"
  | "provider_configured"
  | "provider_enabled"
  | "provider_disabled"
  | "provider_market_override_set"
  | "provider_market_override_reset"
  | "provider_priority_changed"
  | "provider_fallback_changed"
  | "provider_credential_status_updated";

/**
 * Human labels for audit actions.
 *
 * The raw union members are storage keys, not copy. Rendering them directly put
 * `verification_approved` in front of staff as the primary label of every log
 * row, with the readable French `details` demoted underneath. Read through
 * `auditActionLabel` so a missing entry degrades to something legible rather
 * than to a snake_case identifier.
 */
export const SECURITY_AUDIT_ACTION_LABELS: Record<SecurityAuditAction, string> =
  {
    MARKET_CONFIG_UPDATE: "Configuration du marché modifiée",
    AUTO_FLAG_SUSPICIOUS_PRICE: "Prix suspect signalé automatiquement",
    role_assigned: "Rôle attribué",
    role_removed: "Rôle retiré",
    user_suspended: "Compte suspendu",
    user_reactivated: "Compte réactivé",
    verification_approved: "Vérification approuvée",
    verification_rejected: "Vérification refusée",
    listing_moderated: "Annonce modérée",
    market_scope_updated: "Périmètre de marché modifié",
    plan_modified: "Forfait modifié",
    permission_overridden: "Permission surchargée",
    listing_hidden: "Annonce masquée",
    listing_restored: "Annonce restaurée",
    password_reset_completed: "Mot de passe réinitialisé",
    mfa_enabled: "Double authentification activée",
    mfa_disabled: "Double authentification désactivée",
    account_type_upgraded_to_pro: "Compte passé en Pro",
    account_deleted: "Compte supprimé",
    email_verified: "Email vérifié",
    phone_verified: "Téléphone vérifié",
    provider_configured: "Fournisseur configuré",
    provider_enabled: "Fournisseur activé",
    provider_disabled: "Fournisseur désactivé",
    provider_market_override_set: "Surcharge marché appliquée",
    provider_market_override_reset: "Surcharge marché réinitialisée",
    provider_priority_changed: "Priorité fournisseur modifiée",
    provider_fallback_changed: "Repli fournisseur modifié",
    provider_credential_status_updated: "Identifiants fournisseur mis à jour",
  };

/** Falls back to a de-slugified label so an unmapped action never renders raw. */
export function auditActionLabel(action: SecurityAuditAction | string): string {
  const known = SECURITY_AUDIT_ACTION_LABELS[action as SecurityAuditAction];
  if (known) return known;
  const spaced = String(action).replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: PlatformRole | string;
  targetId?: string;
  targetName?: string;
  action: SecurityAuditAction;
  details: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  market?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  accountType?: AccountType;
  professionalVertical?: ProfessionalVertical;
  staffRole?: StaffRole;
  primaryRole?: PlatformRole;
  roles?: PlatformRole[];
  role: UserRole;
  sellerType: SellerType;
  status?: AccountStatus;
  isSuspended?: boolean;
  isDeactivated?: boolean;
  suspendedReason?: string;
  suspendedAt?: string;

  // Verification
  isVerified: boolean;
  isIdentityVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  mfaEnabled?: boolean;
  professionalVerification?: ProfessionalVerification;
  identityVerification?: IdentityVerification;
  bankPayoutVerification?: BankPayoutVerification;

  // Market Scoping
  marketScope?: MarketScope;
  country?: string; // e.g. 'FR', 'BE', 'CH', 'ES'
  city: string;
  postalCode: string;
  department?: string;
  region?: string;

  // Direct permission grants / revokes
  customPermissions?: Permission[];
  revokedPermissions?: Permission[];

  // Profile Details
  slug?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  rating: number;
  reviewCount: number;
  responseRatePercent: number;
  responseTimeText: string;
  bio?: string;

  // Authentication & Security
  passwordHash?: string;
  mfa?: MFASettings;
  legalConsent?: LegalConsent;
  sessions?: UserSession[];

  // Professional fields
  companyName?: string;
  sirenSiret?: string;
  siret?: string;
  vatNumber?: string;
  legalForm?: string; // SARL, SAS, Auto-entrepreneur, etc.
  storeSlug?: string;
  storeBannerUrl?: string;
  storeOpeningHours?: string;
  businessAddress?: string;
  deliveryZones?: string[];
  websiteUrl?: string;
  activePlanId?: "free" | "pro_starter" | "pro_business" | "pro_enterprise";
  services?: string[];
  returnPolicy?: string;
  featuredListingIds?: string[];
  defaultPublicationMarkets?: string[];
}

export type ListingCondition =
  | "new_with_tag"
  | "new_without_tag"
  | "very_good"
  | "good"
  | "fair"
  | "for_parts"
  | "not_applicable";

export type ListingStatus =
  | "active"
  | "draft"
  | "pending_review"
  | "reserved"
  | "sold"
  | "expired"
  | "archived";

export interface ListingDraft extends Partial<Listing> {
  step?: number;
  acceptsOnlinePayment?: boolean;
  boostPackage?: string;
  photos?: any[];
}

export type DeliveryType =
  | "hand_delivery"
  | "relay_point"
  | "home_delivery"
  | "custom_carrier"
  | "cocolis"
  | "express";

export interface DeliveryOption {
  type: DeliveryType;
  available: boolean;
  price?: number; // In EUR, 0 for free
  courierName?: string; // e.g. "Mondial Relay", "Colissimo", "Chronopost"
}

export interface ListingAttributeValue {
  key: string;
  label: string;
  value: string | number | boolean | string[];
}

export interface ListingPhoto {
  id: string;
  url: string;
  isCover: boolean;
  alt?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number; // in EUR (0 for free/don)
  isNegotiable: boolean;
  isFreeDonation: boolean;
  categorySlug: string;
  subCategorySlug: string;
  categoryLabel: string;
  subCategoryLabel: string;
  condition: ListingCondition;
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
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
  publisherOrganizationName?: string;
  publisherOrganizationLogoUrl?: string;
  publisherBranchName?: string;
  sellerAvatarUrl?: string;
  sellerRating: number;
  sellerReviewCount: number;
  sellerIsVerified: boolean;
  sellerCity: string;
  sellerPostalCode: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  latitude?: number;
  longitude?: number;
  photos: ListingPhoto[];
  coverImageUrl: string;
  deliveryOptions: DeliveryOption[];
  isOnlinePaymentAvailable: boolean;
  isReservable?: boolean;
  reservationType?: "instant" | "request";
  activeReservationId?: string;
  attributes: Record<string, any>;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  viewsCount: number;
  viewCount?: number;
  favoritesCount: number;
  contactCount: number;
  isBoosted?: boolean;
  boostType?:
    "urgent" | "highlight" | "top_of_list" | "gallery_boost" | "spotlight";
  boostExpiresAt?: string;
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
  marketCode?: string; // Primary market code e.g. 'FR'
  marketCodes?: string[]; // All markets in which this listing is published e.g. ['FR', 'BE']
  marketPublications?: Array<{
    marketCode: string;
    status:
      "active" | "pending" | "suspended" | "rejected" | "draft" | "paused";
    isPrimary?: boolean;
    publishedAt?: string;
    customPrice?: number;
    currency?: string;
    complianceChecked?: boolean;
    complianceIssues?: string[];
  }>;
  currency?: string; // e.g. 'EUR', 'CHF'
  originalPrice?: number; // for discounts/bons-plans
  stock?: number; // Inventory count for Pro listings (defaults to 1 for unique items)
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** Canonical full label */
  label?: string;
  /** Optional compact frontend alias for constrained UI surfaces */
  shortLabel?: string;
  iconName: string;
  description: string;
  accentColor?: string;
  subCategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
  /** Canonical full label */
  label?: string;
  /** Optional compact frontend alias for constrained UI surfaces */
  shortLabel?: string;
  parentSlug: string;
  iconName?: string;
  accentColor?: string;
  attributesSchema: CategoryAttributeSchema[];
}

export type AttributeInputType =
  | "select"
  | "text"
  | "textarea"
  | "multi_select"
  | "number"
  | "radio"
  | "checkbox_group"
  | "boolean"
  | "year"
  | "date";

export interface CategoryAttributeSchema {
  key: string;
  label: string;
  type: AttributeInputType;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  dependsOn?: { key: string; value: string };
  showInFilters: boolean;
  showInCardPreview?: boolean;
}

export interface LocationSelection {
  city: string;
  postalCode: string;
  department?: string;
  region?: string;
  radiusKm: number; // 0 for exact city, or 5, 10, 20, 30, 50, 100
  label: string;
}

export interface SearchFilters {
  query?: string;
  categorySlug?: string;
  subCategorySlug?: string;
  city?: string;
  postalCode?: string;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  conditions?: ListingCondition[];
  sellerType?: "all" | "individual" | "pro";
  deliveryAvailable?: boolean;
  onlinePaymentAvailable?: boolean;
  onlyDeals?: boolean;
  publishedToday?: boolean;
  attributes?: Record<
    string,
    string | string[] | number | boolean | { min?: number; max?: number }
  >;
  sortBy?: "date_desc" | "price_asc" | "price_desc" | "relevance" | "distance";
  marketCode?: string; // Scopes search to active market (e.g. 'FR', 'BE', 'ES', 'CH')
  page?: number;
  limit?: number;
}

export interface SavedSearch {
  id: string;
  title: string;
  filters: SearchFilters;
  createdAt: string;
  hasNotifications: boolean;
  matchCount: number;
}

export interface RecentSearch {
  id: string;
  title: string;
  locationLabel?: string;
  categorySlug?: string;
  query?: string;
  to: string;
  createdAt?: string;
}

export type MessageType =
  | "text"
  | "image"
  | "file"
  | "offer"
  | "offer_accepted"
  | "offer_declined"
  | "reservation"
  | "system";
export type OfferStatus = "pending" | "accepted" | "declined" | "countered";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  offerAmount?: number;
  attachmentUrl?: string;
  attachmentType?: "image" | "file";
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingPhotoUrl: string;
  listingStatus: ListingStatus;
  buyerId: string;
  buyerName: string;
  buyerAvatarUrl?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl?: string;
  sellerType: SellerType;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "active" | "archived" | "blocked";
  messages?: Message[];
  currentOffer?: {
    amount: number;
    status: OfferStatus;
    offeredBy: string;
  };
  pickupDetails?: {
    scheduledDate?: string;
    scheduledTimeSlot?: string;
    address?: string;
    status: "pending" | "agreed" | "completed";
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | "message"
    | "offer"
    | "listing_approved"
    | "listing_sold"
    | "price_drop"
    | "saved_search"
    | "system";
  linkUrl?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export type TransactionStatus =
  | "initiated"
  | "offer_accepted"
  | "payment_pending"
  | "payment_escrowed"
  | "escrow_funded"
  | "pin_pending"
  | "refund_pending"
  | "escrow_secured"
  | "pending_seller_confirmation"
  | "seller_confirmed"
  | "seller_rejected"
  | "ready_for_pickup"
  | "pickup_scheduled"
  | "shipped"
  | "delivered"
  | "handover_confirmed"
  | "completed"
  | "cancelled"
  | "cancelled_by_buyer"
  | "cancelled_by_seller"
  | "expired"
  | "disputed"
  | "refunded";

export interface TransactionStatusHistoryEntry {
  status: TransactionStatus;
  timestamp: string;
  actorId: string;
  actorName: string;
  note?: string;
}

export interface TransactionPaymentDetails {
  intentId: string;
  provider: "mangopay_escrow" | "stripe_connect";
  paymentMethod: "card" | "apple_pay" | "google_pay" | "sepa";
  cardBrand?: string;
  cardLast4?: string;
  escrowStatus:
    "pending" | "held" | "released" | "refunded" | "partially_refunded";
  authorizedAt: string;
  capturedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
}

export interface TransactionPickupDetails {
  scheduledDate?: string;
  meetingPlace?: string;
  meetingAddress?: string;
  notes?: string;
  sellerPhone?: string;
  buyerPhone?: string;
}

export interface TransactionDispute {
  id: string;
  openedBy: string;
  openedByName: string;
  role: "buyer" | "seller";
  reason: string;
  description: string;
  evidenceUrls?: string[];
  status:
    "open" | "under_review" | "resolved_refund" | "resolved_payout" | "closed";
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  resolutionAction?:
    "full_refund" | "partial_refund" | "seller_payout" | "closed";
  refundAmount?: number;
}

export interface Transaction {
  id: string;
  code?: string; // e.g. SHG-849201
  marketCode?: string; // e.g. 'FR', 'BE', 'ES', 'CH'
  currency?: string; // e.g. 'EUR', 'CHF'
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingPhotoUrl: string;
  listingCoverImageUrl?: string;
  categorySlug?: string;
  buyerId: string;
  buyerName: string;
  buyerAvatarUrl?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl?: string;
  sellerType?: SellerType;
  amount: number;
  protectionFee: number;
  shippingFee: number;
  totalAmount: number;
  sellerPayoutAmount?: number;
  platformCommission?: number;
  commissionBaseAmount?: number;
  commissionTaxAmount?: number;
  commissionAdjustmentAmount?: number;
  commissionExplanation?: string;
  deliveryMethod: DeliveryType;
  carrierName?: string;
  deliveryAddress?: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
    relayPointName?: string;
    relayPointId?: string;
  };
  pickupDetails?: TransactionPickupDetails;
  verificationCode?: string; // 6-digit PIN for hand delivery verification
  verificationCodeStatus?: "pending" | "verified";
  status: TransactionStatus;
  statusHistory?: TransactionStatusHistoryEntry[];
  payment?: TransactionPaymentDetails;
  sellerConfirmationDeadline?: string;
  buyerInspectionDeadline?: string;
  sellerConfirmedAt?: string;
  sellerRejectedAt?: string;
  rejectionReason?: string;
  shippedAt?: string;
  deliveredAt?: string;
  handoverConfirmedAt?: string;
  completedAt?: string;
  trackingNumber?: string;
  pickupDate?: string;
  dispute?: TransactionDispute;
  reviewId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerEarningsSummary {
  availableBalance: number; // Funds ready for bank payout
  escrowHeldBalance: number; // Funds pending delivery / confirmation
  totalEarnings: number; // Lifetime earnings
  pendingPayoutsCount: number;
  completedTransactionsCount: number;
}

export interface SellerPayoutRequest {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  fee: number;
  netAmount: number;
  payoutType: "standard" | "instant";
  ibanLast4: string;
  bankName: string;
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
}

export interface ReviewItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  targetUserId: string;
  rating: number; // 1 to 5
  comment: string;
  listingTitle: string;
  createdAt: string;
}
