import { Conversation, Message } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { randomUUID } from "node:crypto";
import { databaseFailure } from "./repository-error.js";

export interface IMessagingRepository {
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<Conversation>;
  saveMessage(message: Message): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  blockUser(userId: string, targetUserId: string): Promise<void>;
  unblockUser(userId: string, targetUserId: string): Promise<void>;
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

  async getMessages(conversationId: string): Promise<Message[]> {
    const list = this.messages.get(conversationId);
    return list ? list.map((m) => ({ ...m })) : [];
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
  private mapRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
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
        .select("*, listings(*), buyer:buyer_id(*), seller:seller_id(*)")
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
        .select("*, listings(*), buyer:buyer_id(*), seller:seller_id(*)")
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
      .upsert(payload as any)
      .select()
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

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error || !data) databaseFailure("messaging.getMessages", error);
      return data.map((r: any) => this.mapRowToMessage(r));
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
