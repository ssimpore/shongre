import { Conversation, Message } from "../../types";
import type {
  PresenceHeartbeat,
  ConversationPresencePage,
} from "@shongre/shared/presence";

export const MESSAGE_INPUT_CONSTRAINTS = {
  maxLength: 2000,
} as const;

export interface SendMessageInput {
  conversationId: string;
  text: string;
  attachments?: string[];
  offerPrice?: number;
}

export interface CreateOrGetConversationInput {
  listingId: string;
  initialMessage?: string;
}

export interface MessagingServiceContract {
  updatePresence(
    heartbeat: PresenceHeartbeat,
    signal?: AbortSignal,
  ): Promise<{ updated: boolean }>;
  getPresence(
    conversationIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<ConversationPresencePage>;
  getUserConversations(): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  getMessages(conversationId: string, cursor?: string): Promise<Message[]>;
  createOrGetConversation(
    input: CreateOrGetConversationInput,
  ): Promise<Conversation>;
  sendMessage(input: SendMessageInput): Promise<Message>;
  /** `amount` is in major units of the listing's `currency`. */
  makeOffer(
    conversationId: string,
    amount: number,
    currency: string,
  ): Promise<Message>;
  respondToOffer(offerId: string, accept: boolean): Promise<Message>;
  withdrawOffer(offerId: string): Promise<Message>;
  schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message>;
  markAsRead(conversationId: string): Promise<void>;
  blockUser(targetUserId: string): Promise<void>;
  unblockUser(targetUserId: string): Promise<void>;
  getBlockedUserIds(): Promise<string[]>;
}
