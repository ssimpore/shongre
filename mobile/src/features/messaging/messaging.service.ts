import type { operations } from "@shongre/contracts/openapi";
import { apiOperation } from "@/api/generated-api-operation";

type ConversationWireResponse =
  operations["getMessagingConversations"]["responses"][200]["content"]["application/json"];
type ConversationWireItem = NonNullable<ConversationWireResponse>;
type ConversationRequest =
  operations["postMessagingConversations"]["requestBody"]["content"]["application/json"];
type MessageWireResponse =
  operations["getMessagingConversationsByIdMessages"]["responses"][200]["content"]["application/json"];
type MessageRequest =
  operations["postMessagingConversationsByIdMessages"]["requestBody"]["content"]["application/json"];
type OfferRequest =
  operations["postMessagingOffer"]["requestBody"]["content"]["application/json"];
type MarkReadRequest =
  operations["postMessagingRead"]["requestBody"]["content"]["application/json"];

export interface MobileConversation {
  id: string;
  listingId: string;
  marketCode: string;
  buyerId: string;
  sellerId: string;
  participantName: string;
  listingTitle: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface MobileMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  offer?: { amountMinor: number; currency: string; status: string };
}

interface BackendConversation {
  id: string;
  listingId: string;
  listing?: { title?: string; marketCode?: string };
  buyerId: string;
  buyer?: { name?: string };
  sellerId: string;
  seller?: { name?: string };
  lastMessageText?: string;
  lastMessageAt: string;
  unreadCount?: number;
  marketCode?: string;
}

interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isOffer?: boolean;
  offerAmountMinor?: number;
  offerCurrency?: string;
  offerStatus?: string;
}

function conversationPage(response: ConversationWireResponse): {
  items: BackendConversation[];
} {
  return response as ConversationWireItem & { items: BackendConversation[] };
}

function messagePage(response: MessageWireResponse): {
  items: BackendMessage[];
} {
  return response as NonNullable<MessageWireResponse> & {
    items: BackendMessage[];
  };
}

export interface MessagingService {
  list(userId: string, marketCode: string): Promise<MobileConversation[]>;
  messages(
    conversationId: string,
    userId: string,
    marketCode: string,
  ): Promise<MobileMessage[]>;
  createForListing(input: {
    listingId: string;
    marketCode: string;
    userId: string;
  }): Promise<MobileConversation>;
  send(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    text: string;
  }): Promise<MobileMessage>;
  offer(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    amountMinor: number;
  }): Promise<MobileMessage>;
  markRead(
    conversationId: string,
    userId: string,
    marketCode: string,
  ): Promise<void>;
}

const mapMessage = (message: BackendMessage): MobileMessage => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  text: message.text,
  createdAt: message.createdAt,
  ...(message.isOffer && message.offerAmountMinor && message.offerCurrency
    ? {
        offer: {
          amountMinor: message.offerAmountMinor,
          currency: message.offerCurrency,
          status: message.offerStatus || "pending",
        },
      }
    : {}),
});

const mapConversation = (
  conversation: BackendConversation,
  userId: string,
  marketCode: string,
): MobileConversation => ({
  id: conversation.id,
  listingId: conversation.listingId,
  marketCode:
    conversation.marketCode || conversation.listing?.marketCode || marketCode,
  buyerId: conversation.buyerId,
  sellerId: conversation.sellerId,
  participantName:
    conversation.buyerId === userId
      ? conversation.seller?.name || "Vendeur Shongre"
      : conversation.buyer?.name || "Acheteur Shongre",
  listingTitle: conversation.listing?.title || "Annonce Shongre",
  lastMessageText: conversation.lastMessageText || "Conversation ouverte",
  lastMessageAt: conversation.lastMessageAt,
  unreadCount: conversation.unreadCount || 0,
});

export class HttpMessagingService implements MessagingService {
  async list(
    userId: string,
    marketCode: string,
  ): Promise<MobileConversation[]> {
    const page = conversationPage(
      await apiOperation(
        "getMessagingConversations",
        { query: { limit: 50 } },
        marketCode,
      ),
    );
    return page.items.map((item) => mapConversation(item, userId, marketCode));
  }

  async messages(
    conversationId: string,
    _userId: string,
    marketCode: string,
  ): Promise<MobileMessage[]> {
    const page = messagePage(
      await apiOperation(
        "getMessagingConversationsByIdMessages",
        { path: { id: conversationId }, query: { limit: 100 } },
        marketCode,
      ),
    );
    return page.items.map(mapMessage);
  }

  async createForListing(input: {
    listingId: string;
    marketCode: string;
    userId: string;
  }): Promise<MobileConversation> {
    const payload: ConversationRequest = { listingId: input.listingId };
    const conversation = (await apiOperation(
      "postMessagingConversations",
      { body: payload },
      input.marketCode,
    )) as unknown as BackendConversation;
    return mapConversation(conversation, input.userId, input.marketCode);
  }

  async send(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    text: string;
  }): Promise<MobileMessage> {
    const payload: MessageRequest = { text: input.text };
    return mapMessage(
      (await apiOperation(
        "postMessagingConversationsByIdMessages",
        { path: { id: input.conversationId }, body: payload },
        input.marketCode,
      )) as unknown as BackendMessage,
    );
  }

  async offer(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    amountMinor: number;
  }): Promise<MobileMessage> {
    const payload: OfferRequest = {
      conversationId: input.conversationId,
      amountMinor: input.amountMinor,
    };
    return mapMessage(
      (await apiOperation(
        "postMessagingOffer",
        { body: payload },
        input.marketCode,
      )) as unknown as BackendMessage,
    );
  }

  async markRead(
    conversationId: string,
    _userId: string,
    marketCode: string,
  ): Promise<void> {
    const payload: MarkReadRequest = { conversationId };
    await apiOperation("postMessagingRead", { body: payload }, marketCode);
  }
}

export const messagingService: MessagingService = new HttpMessagingService();
