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

interface SupportAttachment {
  id: string;
  type: "image" | "document";
  fileName: string;
  fileSize?: number;
  url: string;
}

interface ListingSupportContext {
  type: "listing";
  listingId: string;
  listingTitle?: string;
  listingPhotoUrl?: string;
  price?: number;
  currency?: string;
  sellerId?: string;
  sellerName?: string;
}

interface TransactionSupportContext {
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

interface ConversationSupportContext {
  type: "conversation";
  conversationId: string;
  counterpartId?: string;
  counterpartName?: string;
}

interface SubscriptionSupportContext {
  type: "subscription";
  planId: string;
  planName: string;
}

interface AccountSupportContext {
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
