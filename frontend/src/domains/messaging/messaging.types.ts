/**
 * SHONGRE CANONICAL MESSAGING TYPES
 * Core domain declarations for conversations, messages, timeline events,
 * participants, real-time subscriptions, and delivery statuses.
 */

import {  ListingStatus, DeliveryType } from '../../types';

export type ConversationType = 'listing' | 'transaction' | 'support' | 'general';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageContentType = 'text' | 'image' | 'file' | 'offer' | 'offer_accepted' | 'offer_declined' | 'reservation' | 'system';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  accountType?: 'individual' | 'pro';
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface ListingConversationContext {
  type: 'listing';
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingPhotoUrl?: string;
  listingStatus: ListingStatus;
  categorySlug?: string;
  sellerId: string;
  sellerName: string;
  sellerType?: 'individual' | 'pro';
}

export interface TransactionConversationContext {
  type: 'transaction';
  transactionId: string;
  listingId: string;
  orderNumber?: string;
  amount: number;
  escrowStatus: 'pending' | 'secured' | 'released' | 'refunded';
  fulfillmentMode: DeliveryType;
  carrierName?: string;
  trackingNumber?: string;
  scheduledPickup?: {
    date: string;
    timeSlot: string;
    address: string;
  };
}

export interface SupportConversationContext {
  type: 'support';
  ticketId: string;
  category: string;
  priority: 'low' | 'normal' | 'urgent';
}

export type ConversationContext =
  | ListingConversationContext
  | TransactionConversationContext
  | SupportConversationContext;

export interface BaseTimelineItem {
  id: string;
  conversationId: string;
  createdAt: string;
}

export interface UserTimelineMessage extends BaseTimelineItem {
  itemType: 'message';
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  contentType: MessageContentType;
  status: MessageDeliveryStatus;
  clientMessageId?: string;
  attachment?: MessageAttachment;
  offerAmount?: number;
  isRead: boolean;
}

export interface SystemTimelineEvent extends BaseTimelineItem {
  itemType: 'system_event';
  eventType:
    | 'conversation_created'
    | 'offer_proposed'
    | 'offer_accepted'
    | 'offer_declined'
    | 'reservation_confirmed'
    | 'escrow_secured'
    | 'pickup_scheduled'
    | 'item_shipped'
    | 'handover_completed'
    | 'transaction_completed'
    | 'funds_released'
    | 'dispute_opened'
    | 'safety_notice';
  title: string;
  description: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

export type TimelineItem = UserTimelineMessage | SystemTimelineEvent;

export interface ConversationPreview {
  id: string;
  type: ConversationType;
  counterpart: ConversationParticipant;
  context?: ConversationContext;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageStatus?: MessageDeliveryStatus;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isBlocked?: boolean;
  status: 'active' | 'blocked' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ConversationCapabilities {
  canRead: boolean;
  canSend: boolean;
  canAttach: boolean;
  canMakeOffer: boolean;
  canSchedulePickup: boolean;
  canBlock: boolean;
  canUnblock: boolean;
  canReport: boolean;
  isBlockedByViewer: boolean;
  isBlockedByCounterpart: boolean;
  disabledReason?: string;
}

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface TypingState {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export type InboxFilterTab = 'all' | 'unread' | 'purchases' | 'sales' | 'transactions';

export interface MessagingRealtimeEvent {
  type: 'new_message' | 'system_event' | 'message_status_updated' | 'typing' | 'conversation_read' | 'presence';
  conversationId: string;
  payload: any;
  timestamp: string;
}

export type RealtimeEventHandler = (event: MessagingRealtimeEvent) => void;
