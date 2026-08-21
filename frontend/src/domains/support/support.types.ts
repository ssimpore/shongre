/**
 * SHONGRE CANONICAL SUPPORT & CONTACT TYPES
 * Authoritative domain declarations for customer support requests,
 * help topics, categories, reasons, attachments, and timeline events.
 */

export type SupportCategory =
  | "account"
  | "listing"
  | "purchase"
  | "sale"
  | "reservation"
  | "payment"
  | "refund"
  | "delivery"
  | "messaging"
  | "safety"
  | "verification"
  | "pro_account"
  | "subscription"
  | "billing"
  | "technical"
  | "privacy"
  | "other";

export type SupportRequestStatus =
  "submitted" | "in_progress" | "waiting_for_user" | "resolved" | "closed";

export type SupportPriority = "low" | "normal" | "high" | "urgent";

export interface SupportAttachment {
  id: string;
  type: "image" | "document";
  fileName: string;
  fileSize?: number;
  url: string;
}

export interface ListingSupportContext {
  type: "listing";
  listingId: string;
  listingTitle?: string;
  listingPhotoUrl?: string;
  price?: number;
  currency?: string;
  sellerId?: string;
  sellerName?: string;
}

export interface TransactionSupportContext {
  type: "transaction";
  transactionId: string;
  orderNumber?: string;
  listingId?: string;
  listingTitle?: string;
  listingPhotoUrl?: string;
  amount?: number;
  currency?: string;
  flowType?: "direct_purchase" | "reservation";
  counterpartName?: string;
}

export interface ConversationSupportContext {
  type: "conversation";
  conversationId: string;
  counterpartId?: string;
  counterpartName?: string;
}

export interface SubscriptionSupportContext {
  type: "subscription";
  planId: string;
  planName: string;
}

export interface AccountSupportContext {
  type: "account";
  userId?: string;
  email?: string;
}

export type SupportContext =
  | ListingSupportContext
  | TransactionSupportContext
  | ConversationSupportContext
  | SubscriptionSupportContext
  | AccountSupportContext;

export interface SupportTimelineMessage {
  id: string;
  authorType: "user" | "agent" | "system";
  authorName: string;
  content: string;
  createdAt: string;
  attachments?: SupportAttachment[];
}

export interface SupportRequest {
  id: string;
  reference: string;
  requesterId?: string;
  requesterName: string;
  requesterEmail: string;
  marketCode: string;
  category: SupportCategory;
  reason: string;
  subject: string;
  description: string;
  context?: SupportContext;
  attachments?: SupportAttachment[];
  status: SupportRequestStatus;
  priority: SupportPriority;
  messages: SupportTimelineMessage[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  resolvedAt?: string;
}

export interface CreateSupportRequestInput {
  requesterId?: string;
  requesterName: string;
  requesterEmail: string;
  marketCode?: string;
  category: SupportCategory;
  reason: string;
  subject: string;
  description: string;
  context?: SupportContext;
  attachments?: SupportAttachment[];
  priority?: SupportPriority;
}

export interface SupportRequestQuery {
  requesterId?: string;
  status?: SupportRequestStatus | "all";
  category?: SupportCategory;
  limit?: number;
  offset?: number;
}
