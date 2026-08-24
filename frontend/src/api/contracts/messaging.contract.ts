import { Conversation, Message } from "../../types";

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  offerPrice?: number;
}

export interface CreateOrGetConversationInput {
  listingId: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  initialMessage?: string;
}

export interface MessagingServiceContract {
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  getMessages(conversationId: string, cursor?: string): Promise<Message[]>;
  createOrGetConversation(
    input: CreateOrGetConversationInput,
  ): Promise<Conversation>;
  sendMessage(input: SendMessageInput): Promise<Message>;
  makeOffer(
    conversationId: string,
    senderId: string,
    senderName: string,
    amount: number,
  ): Promise<Message>;
  respondToOffer(
    conversationId: string,
    userId: string,
    userName: string,
    accept: boolean,
  ): Promise<Message>;
  schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  blockUser(userId: string, targetUserId: string): Promise<void>;
  unblockUser(userId: string, targetUserId: string): Promise<void>;
  getBlockedUserIds(userId: string): Promise<string[]>;
}
