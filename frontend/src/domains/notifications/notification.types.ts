/**
 * SHONGRE CANONICAL NOTIFICATION TYPES
 * Authoritative domain models for notifications, categories, events,
 * preferences, channels, priorities, and real-time subscription types.
 */

export type NotificationCategory =
  | 'messages'
  | 'transactions'
  | 'listings'
  | 'delivery'
  | 'reviews'
  | 'monetization'
  | 'account'
  | 'security'
  | 'moderation'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type NotificationType =
  // Messaging
  | 'message.received'
  // Listing lifecycle
  | 'listing.published'
  | 'listing.requires_changes'
  | 'listing.rejected'
  | 'listing.expiring'
  | 'listing.expired'
  | 'listing.sold'
  | 'favorite.price_dropped'
  | 'saved_search.match'
  // Reservation lifecycle
  | 'reservation.requested'
  | 'reservation.accepted'
  | 'reservation.rejected'
  | 'reservation.expiring'
  | 'reservation.cancelled'
  // Direct Purchase & Order lifecycle
  | 'order.created'
  | 'order.confirmed'
  | 'order.cancelled'
  | 'order.completed'
  // Escrow & Payments
  | 'payment.secured'
  | 'payment.failed'
  | 'payment.released'
  | 'payment.refunded'
  // Delivery & Pickup
  | 'fulfillment.pickup_scheduled'
  | 'fulfillment.shipped'
  | 'fulfillment.delivered'
  | 'fulfillment.receipt_required'
  // Reviews
  | 'review.available'
  | 'review.received'
  // Seller verification & Pro
  | 'seller.verification_required'
  | 'seller.verified'
  | 'subscription.started'
  | 'subscription.renewal_upcoming'
  | 'subscription.payment_failed'
  | 'subscription.cancelled'
  // Promotions
  | 'promotion.started'
  | 'promotion.expiring'
  | 'promotion.ended'
  // Account & Security
  | 'security.password_changed'
  | 'security.new_login'
  // Moderation
  | 'moderation.report_assigned'
  | 'moderation.listing_flagged'
  | 'moderation.action_required';

export interface ListingNotificationContext {
  type: 'listing';
  listingId: string;
  listingTitle?: string;
  listingPhotoUrl?: string;
  price?: number;
  currency?: string;
}

export interface ConversationNotificationContext {
  type: 'conversation';
  conversationId: string;
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  listingId?: string;
  listingTitle?: string;
  previewText?: string;
}

export interface TransactionNotificationContext {
  type: 'transaction';
  transactionId: string;
  orderNumber?: string;
  listingId?: string;
  listingTitle?: string;
  listingPhotoUrl?: string;
  amount?: number;
  currency?: string;
  flowType?: 'direct_purchase' | 'reservation';
}

export interface SubscriptionNotificationContext {
  type: 'subscription';
  planId: string;
  planName: string;
  amount?: number;
  renewalDate?: string;
}

export interface AccountNotificationContext {
  type: 'account';
  userId: string;
  reason?: string;
}

export interface ModerationNotificationContext {
  type: 'moderation';
  reportId?: string;
  targetType?: string;
  targetId?: string;
}

export type NotificationContext =
  | ListingNotificationContext
  | ConversationNotificationContext
  | TransactionNotificationContext
  | SubscriptionNotificationContext
  | AccountNotificationContext
  | ModerationNotificationContext;

export interface NotificationAction {
  id: string;
  label: string;
  destination: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isExternal?: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  recipientId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  priority: NotificationPriority;
  context?: NotificationContext;
  actions?: NotificationAction[];
  status: NotificationStatus;
  isRead: boolean;
  expiresAt?: string;
}

export interface CategoryChannelPreference {
  inApp: boolean;
  email: boolean;
  push: boolean;
  isMandatory?: boolean;
}

export interface NotificationPreferences {
  userId: string;
  messages: CategoryChannelPreference;
  transactions: CategoryChannelPreference;
  listings: CategoryChannelPreference;
  delivery: CategoryChannelPreference;
  reviews: CategoryChannelPreference;
  promotions: CategoryChannelPreference;
  security: CategoryChannelPreference;
  marketing: CategoryChannelPreference;
  updatedAt: string;
}

export type NotificationFilterTab = 'all' | 'unread' | 'messages' | 'transactions' | 'listings' | 'account';

export interface NotificationQuery {
  recipientId?: string;
  status?: 'unread' | 'read' | 'all';
  category?: NotificationCategory;
  limit?: number;
  offset?: number;
}

export interface NotificationPageResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface RealtimeNotificationEvent {
  type: 'notification.created' | 'notification.read' | 'notification.all_read' | 'notification.deleted';
  recipientId: string;
  payload: any;
  timestamp: string;
}

export type NotificationRealtimeHandler = (event: RealtimeNotificationEvent) => void;
