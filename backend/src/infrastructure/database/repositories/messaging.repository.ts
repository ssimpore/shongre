import {
  Conversation,
  Message,
  MessagePage,
  UserProfile,
} from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { randomUUID } from "node:crypto";
import { databaseFailure } from "./repository-error.js";
import { AppError } from "../../../shared/errors/app-error.js";

interface MessagePageOptions {
  cursor?: string;
  limit?: number;
}

interface DecodedMessageCursor {
  createdAt: string;
  id: string;
}

export interface CreateMarketplaceOfferInput {
  conversationId: string;
  actorId: string;
  amountMinor: number;
  currency: string;
  messageText: string;
  expiresAt: string;
  parentOfferId?: string;
}

export interface MarketplaceOfferTransitionResult {
  offerMessage: Message;
  eventMessage?: Message;
}

const encodeMessageCursor = (message: Pick<Message, "createdAt" | "id">) =>
  Buffer.from(
    JSON.stringify({ createdAt: message.createdAt, id: message.id }),
    "utf8",
  ).toString("base64url");

const decodeMessageCursor = (
  cursor: string | undefined,
): DecodedMessageCursor | undefined => {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<DecodedMessageCursor>;
    if (
      typeof value.id !== "string" ||
      !value.id ||
      typeof value.createdAt !== "string" ||
      !Number.isFinite(Date.parse(value.createdAt))
    ) {
      throw new Error("invalid cursor payload");
    }
    return { id: value.id, createdAt: value.createdAt };
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le curseur de messages est invalide.",
    });
  }
};

const resolveMessageLimit = (value: number | undefined) =>
  Math.max(1, Math.min(100, Math.trunc(value || 50)));

export interface IMessagingRepository {
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<Conversation>;
  saveMessage(message: Message): Promise<Message>;
  createMarketplaceOffer(input: CreateMarketplaceOfferInput): Promise<Message>;
  respondToMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    decision: "accepted" | "declined";
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult>;
  withdrawMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult>;
  getMessages(
    conversationId: string,
    options?: MessagePageOptions,
  ): Promise<MessagePage>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  blockUser(userId: string, targetUserId: string): Promise<void>;
  unblockUser(userId: string, targetUserId: string): Promise<void>;
  getBlockedUserIds(userId: string): Promise<string[]>;
  isBlockedBetween(firstUserId: string, secondUserId: string): Promise<boolean>;
}

export const CANONICAL_DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    listingId: "list_1",
    buyerId: "user_thomas",
    sellerId: "user_camille",
    lastMessageText: "Bonjour, le vélo est-il toujours disponible ?",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 1,
    createdAt: new Date().toISOString(),
  },
];

export class DemoMessagingRepository implements IMessagingRepository {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map(); // conversationId -> messages
  private blockedPairs = new Set<string>();

  constructor(initialConvs: Conversation[] = CANONICAL_DEMO_CONVERSATIONS) {
    this.reset(initialConvs);
  }

  reset(initialConvs: Conversation[] = CANONICAL_DEMO_CONVERSATIONS) {
    this.conversations.clear();
    this.messages.clear();
    this.blockedPairs.clear();
    initialConvs.forEach((c) => this.conversations.set(c.id, { ...c }));
    this.messages.set("conv_1", [
      {
        id: "msg_init_1",
        conversationId: "conv_1",
        senderId: "user_thomas",
        text: "Bonjour, le vélo est-il toujours disponible ?",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .map((c) => ({ ...c }));
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const conv = this.conversations.get(id);
    return conv ? { ...conv } : null;
  }

  async createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<Conversation> {
    const existing = Array.from(this.conversations.values()).find(
      (c) =>
        c.listingId === listingId &&
        c.buyerId === buyerId &&
        c.sellerId === sellerId,
    );
    if (existing) return { ...existing };

    const newConv: Conversation = {
      id: randomUUID(),
      listingId,
      buyerId,
      sellerId,
      lastMessageText: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.conversations.set(newConv.id, newConv);
    this.messages.set(newConv.id, []);
    return { ...newConv };
  }

  async saveMessage(message: Message): Promise<Message> {
    let list = this.messages.get(message.conversationId);
    if (!list) {
      list = [];
      this.messages.set(message.conversationId, list);
    }
    list.push({ ...message });

    const conv = this.conversations.get(message.conversationId);
    if (conv) {
      conv.lastMessageText = message.text;
      conv.lastMessageAt = message.createdAt;
    }

    return { ...message };
  }

  async createMarketplaceOffer(
    input: CreateMarketplaceOfferInput,
  ): Promise<Message> {
    const conversation = this.conversations.get(input.conversationId);
    if (!conversation) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    }
    if (
      conversation.buyerId !== input.actorId &&
      conversation.sellerId !== input.actorId
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Accès interdit à cette conversation.",
      });
    }
    const now = new Date().toISOString();
    const messages = this.messages.get(input.conversationId) || [];
    for (const message of messages) {
      if (
        message.isOffer &&
        message.offerStatus === "pending" &&
        message.offerExpiresAt &&
        message.offerExpiresAt <= now
      ) {
        message.offerStatus = "expired";
      }
    }
    const pending = messages.find(
      (message) => message.isOffer && message.offerStatus === "pending",
    );
    if (pending && pending.id !== input.parentOfferId) {
      throw new AppError({
        code: "CONFLICT",
        message: "Une offre est déjà en attente dans cette conversation.",
      });
    }
    if (input.parentOfferId) {
      if (!pending || pending.senderId === input.actorId) {
        throw new AppError({
          code: "FORBIDDEN",
          message: "Seul le destinataire peut faire une contre-offre.",
        });
      }
      pending.offerStatus = "countered";
    }
    const offer: Message = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: input.actorId,
      text: input.messageText,
      isOffer: true,
      offerPrice: input.amountMinor / 100,
      offerAmountMinor: input.amountMinor,
      offerCurrency: input.currency,
      offerStatus: "pending",
      offerExpiresAt: input.expiresAt,
      createdAt: now,
    };
    offer.offerId = offer.id;
    return this.saveMessage(offer);
  }

  async respondToMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    decision: "accepted" | "declined";
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult> {
    const offer = this.findDemoOffer(input.offerId);
    const conversation = this.conversations.get(offer.conversationId)!;
    const recipientId =
      offer.senderId === conversation.buyerId
        ? conversation.sellerId
        : conversation.buyerId;
    if (recipientId !== input.actorId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul le destinataire peut répondre à cette offre.",
      });
    }
    if (offer.offerStatus !== "pending") {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette offre n’est plus en attente.",
      });
    }
    if (
      offer.offerExpiresAt &&
      offer.offerExpiresAt <= new Date().toISOString()
    ) {
      offer.offerStatus = "expired";
      return { offerMessage: { ...offer } };
    }
    offer.offerStatus = input.decision;
    const eventMessage = await this.saveMessage({
      id: randomUUID(),
      conversationId: offer.conversationId,
      senderId: input.actorId,
      text: input.messageText,
      createdAt: new Date().toISOString(),
    });
    return { offerMessage: { ...offer }, eventMessage };
  }

  async withdrawMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult> {
    const offer = this.findDemoOffer(input.offerId);
    if (offer.senderId !== input.actorId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul l’auteur peut retirer cette offre.",
      });
    }
    if (offer.offerStatus !== "pending") {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette offre n’est plus en attente.",
      });
    }
    offer.offerStatus = "withdrawn";
    const eventMessage = await this.saveMessage({
      id: randomUUID(),
      conversationId: offer.conversationId,
      senderId: input.actorId,
      text: input.messageText,
      createdAt: new Date().toISOString(),
    });
    return { offerMessage: { ...offer }, eventMessage };
  }

  private findDemoOffer(offerId: string): Message {
    for (const messages of this.messages.values()) {
      const offer = messages.find(
        (message) => message.id === offerId && message.isOffer,
      );
      if (offer) return offer;
    }
    throw new AppError({ code: "NOT_FOUND", message: "Offre introuvable." });
  }

  async getMessages(
    conversationId: string,
    options: MessagePageOptions = {},
  ): Promise<MessagePage> {
    const cursor = decodeMessageCursor(options.cursor);
    const limit = resolveMessageLimit(options.limit);
    const ordered = [...(this.messages.get(conversationId) || [])].sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
    const eligible = cursor
      ? ordered.filter(
          (message) =>
            message.createdAt < cursor.createdAt ||
            (message.createdAt === cursor.createdAt && message.id < cursor.id),
        )
      : ordered;
    const page = eligible.slice(0, limit + 1);
    const hasNextPage = page.length > limit;
    const items = page.slice(0, limit);
    const oldest = items.at(-1);
    return {
      items: items.reverse().map((message) => ({ ...message })),
      pageInfo: {
        hasNextPage,
        ...(hasNextPage && oldest
          ? { nextCursor: encodeMessageCursor(oldest) }
          : {}),
      },
    };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.unreadCount = 0;
    }
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    this.blockedPairs.add(`${userId}:${targetUserId}`);
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    this.blockedPairs.delete(`${userId}:${targetUserId}`);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return Array.from(this.blockedPairs)
      .filter((pair) => pair.startsWith(`${userId}:`))
      .map((pair) => pair.slice(userId.length + 1));
  }

  async isBlockedBetween(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    return (
      this.blockedPairs.has(`${firstUserId}:${secondUserId}`) ||
      this.blockedPairs.has(`${secondUserId}:${firstUserId}`)
    );
  }
}

export class PostgresMessagingRepository implements IMessagingRepository {
  private static readonly CONVERSATION_PROJECTION =
    "id, listing_id, buyer_id, seller_id, last_message_text, last_message_at, created_at, listings:listing_id(id,title,price,currency,status,images), buyer:buyer_id(id,name,avatar_url,account_family,is_verified), seller:seller_id(id,name,avatar_url,account_family,is_verified)";

  private mapRowToConversation(row: any): Conversation {
    const mapParticipant = (profile: any): Partial<UserProfile> | undefined =>
      profile
        ? {
            id: profile.id,
            name: profile.name,
            avatarUrl: profile.avatar_url || undefined,
            accountType:
              profile.account_family === "professional"
                ? "professional"
                : "individual",
            sellerType:
              profile.account_family === "professional" ? "pro" : "individual",
            isVerified: Boolean(profile.is_verified),
          }
        : undefined;
    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      listing: row.listings
        ? {
            id: row.listings.id,
            title: row.listings.title,
            price: Number(row.listings.price || 0),
            currency: row.listings.currency || undefined,
            status: row.listings.status,
            images: Array.isArray(row.listings.images)
              ? row.listings.images
              : [],
          }
        : undefined,
      buyer: mapParticipant(row.buyer),
      seller: mapParticipant(row.seller),
      lastMessageText: row.last_message_text || undefined,
      lastMessageAt: row.last_message_at || row.created_at,
      createdAt: row.created_at,
    };
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.text,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      isOffer: Boolean(row.is_offer),
      offerPrice: row.offer_price ? Number(row.offer_price) : undefined,
      offerId: row.offer_id || undefined,
      offerAmountMinor:
        row.offer_amount_minor !== null && row.offer_amount_minor !== undefined
          ? Number(row.offer_amount_minor)
          : undefined,
      offerCurrency: row.offer_currency || undefined,
      offerExpiresAt: row.offer_expires_at || undefined,
      offerStatus: row.offer_status || undefined,
      isPickupProposal: Boolean(row.is_pickup_proposal),
      pickupDetails: row.pickup_details || undefined,
      createdAt: row.created_at,
    };
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(PostgresMessagingRepository.CONVERSATION_PROJECTION)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (error || !data)
        databaseFailure("messaging.getUserConversations", error);
      return data.map((r: any) => this.mapRowToConversation(r));
    } catch (error) {
      databaseFailure("messaging.getUserConversations", error);
    }
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(PostgresMessagingRepository.CONVERSATION_PROJECTION)
        .eq("id", id)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("messaging.getConversationById", error);
      }
      if (!data) return null;
      return this.mapRowToConversation(data);
    } catch (error) {
      databaseFailure("messaging.getConversationById", error);
    }
  }

  async createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<Conversation> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      last_message_text: "",
      last_message_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from("conversations")
      .upsert(payload as any, {
        onConflict: "listing_id,buyer_id,seller_id",
      })
      .select(PostgresMessagingRepository.CONVERSATION_PROJECTION)
      .single() as any);
    if (error || !data) {
      throw new Error(`Failed to create conversation: ${error?.message}`);
    }
    return this.mapRowToConversation(data);
  }

  async saveMessage(message: Message): Promise<Message> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: message.id.includes("-") ? message.id : undefined,
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      text: message.text,
      attachments: message.attachments || [],
      is_offer: Boolean(message.isOffer),
      offer_price: message.offerPrice || null,
      offer_status: message.offerStatus || null,
      offer_id: message.offerId || null,
      offer_amount_minor: message.offerAmountMinor || null,
      offer_currency: message.offerCurrency || null,
      offer_expires_at: message.offerExpiresAt || null,
      is_pickup_proposal: Boolean(message.isPickupProposal),
      pickup_details: message.pickupDetails || null,
      created_at: message.createdAt,
    };

    const { data, error } = await (supabase
      .from("messages")
      .insert(payload as any)
      .select()
      .single() as any);
    if (error || !data) {
      throw new Error(`Failed to save message: ${error?.message}`);
    }

    // Update parent conversation last_message
    const { error: conversationError } = await (
      supabase.from("conversations" as any) as any
    )
      .update({
        last_message_text: message.text,
        last_message_at: message.createdAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.conversationId);
    if (conversationError)
      databaseFailure(
        "messaging.updateConversationAfterMessage",
        conversationError,
      );

    return this.mapRowToMessage(data);
  }

  async createMarketplaceOffer(
    input: CreateMarketplaceOfferInput,
  ): Promise<Message> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "create_marketplace_offer",
      {
        p_conversation_id: input.conversationId,
        p_actor_id: input.actorId,
        p_amount_minor: input.amountMinor,
        p_currency: input.currency,
        p_message_text: input.messageText,
        p_expires_at: input.expiresAt,
        p_parent_offer_id: input.parentOfferId || null,
      },
    );
    if (error || !data?.offer_message) {
      this.marketplaceOfferFailure("create", error);
    }
    return this.mapRowToMessage(data.offer_message);
  }

  async respondToMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    decision: "accepted" | "declined";
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "respond_marketplace_offer",
      {
        p_offer_id: input.offerId,
        p_actor_id: input.actorId,
        p_decision: input.decision,
        p_message_text: input.messageText,
      },
    );
    if (error || !data?.offer_message) {
      this.marketplaceOfferFailure("respond", error);
    }
    return {
      offerMessage: this.mapRowToMessage(data.offer_message),
      eventMessage: data.event_message
        ? this.mapRowToMessage(data.event_message)
        : undefined,
    };
  }

  async withdrawMarketplaceOffer(input: {
    offerId: string;
    actorId: string;
    messageText: string;
  }): Promise<MarketplaceOfferTransitionResult> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "withdraw_marketplace_offer",
      {
        p_offer_id: input.offerId,
        p_actor_id: input.actorId,
        p_message_text: input.messageText,
      },
    );
    if (error || !data?.offer_message) {
      this.marketplaceOfferFailure("withdraw", error);
    }
    return {
      offerMessage: this.mapRowToMessage(data.offer_message),
      eventMessage: data.event_message
        ? this.mapRowToMessage(data.event_message)
        : undefined,
    };
  }

  private marketplaceOfferFailure(
    operation: string,
    error: { code?: string; message?: string } | null,
  ): never {
    if (error?.code === "42501") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Action interdite sur cette offre.",
      });
    }
    if (error?.code === "P0002") {
      throw new AppError({ code: "NOT_FOUND", message: "Offre introuvable." });
    }
    if (error?.code === "23505" || error?.code === "23514") {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette offre n’est plus modifiable.",
      });
    }
    databaseFailure(`messaging.offer.${operation}`, error);
  }

  async getMessages(
    conversationId: string,
    options: MessagePageOptions = {},
  ): Promise<MessagePage> {
    try {
      const supabase = getSupabaseAdminClient();
      const cursor = decodeMessageCursor(options.cursor);
      const limit = resolveMessageLimit(options.limit);
      let query = supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, text, attachments, is_offer, offer_price, offer_status, offer_id, offer_amount_minor, offer_currency, offer_expires_at, is_pickup_proposal, pickup_details, created_at",
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        );
      }
      const { data, error } = await query.limit(limit + 1);
      if (error || !data) databaseFailure("messaging.getMessages", error);
      const page = data.map((row: any) => this.mapRowToMessage(row));
      const hasNextPage = page.length > limit;
      const items = page.slice(0, limit);
      const oldest = items.at(-1);
      return {
        items: items.reverse(),
        pageInfo: {
          hasNextPage,
          ...(hasNextPage && oldest
            ? { nextCursor: encodeMessageCursor(oldest) }
            : {}),
        },
      };
    } catch (error) {
      databaseFailure("messaging.getMessages", error);
    }
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await (supabase as any).rpc("mark_conversation_read", {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });
    if (error) databaseFailure("messaging.markAsRead", error);
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("blocked_users").upsert({
      blocker_id: userId,
      blocked_id: targetUserId,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to block user: ${error.message}`);
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", targetUserId);
    if (error) throw new Error(`Failed to unblock user: ${error.message}`);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("messaging.getBlockedUserIds", error);
      return data.map((row: any) => String(row.blocked_id));
    } catch (error) {
      databaseFailure("messaging.getBlockedUserIds", error);
    }
  }

  async isBlockedBetween(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocker_id")
      .or(
        `and(blocker_id.eq.${firstUserId},blocked_id.eq.${secondUserId}),and(blocker_id.eq.${secondUserId},blocked_id.eq.${firstUserId})`,
      )
      .limit(1);
    if (error) throw new Error(`Failed to check user block: ${error.message}`);
    return Boolean(data?.length);
  }
}
