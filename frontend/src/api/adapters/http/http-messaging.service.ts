import {
  CreateOrGetConversationInput,
  MessagingServiceContract,
  SendMessageInput,
} from "../../contracts/messaging.contract";
import { apiOperation } from "./generated-api-operation";
import type {
  Conversation,
  ListingStatus,
  Message,
  MessageType,
  SellerType,
} from "../../../types";

interface BackendParticipant {
  id?: string;
  name?: string;
  avatarUrl?: string;
  accountType?: "individual" | "professional";
  sellerType?: "individual" | "pro";
}

interface BackendConversation {
  id: string;
  listingId: string;
  listing?: {
    title?: string;
    price?: number;
    status?: string;
    images?: string[];
  };
  buyerId: string;
  buyer?: BackendParticipant;
  sellerId: string;
  seller?: BackendParticipant;
  lastMessageText?: string;
  lastMessageAt: string;
  unreadCount?: number;
  createdAt: string;
}

interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  isOffer?: boolean;
  offerPrice?: number;
  offerId?: string;
  offerAmountMinor?: number;
  offerCurrency?: string;
  offerStatus?: Message["offerStatus"];
  offerExpiresAt?: string;
  isPickupProposal?: boolean;
  createdAt: string;
}

interface BackendMessagePage {
  items: BackendMessage[];
  pageInfo: { hasNextPage: boolean; nextCursor?: string };
}

const mapListingStatus = (status: string | undefined): ListingStatus => {
  if (status === "reserved") return "reserved";
  if (status === "sold") return "sold";
  if (status === "archived") return "archived";
  if (status === "draft") return "draft";
  return "active";
};

const mapMessageType = (message: BackendMessage): MessageType => {
  if (message.isOffer) return "offer";
  if (message.isPickupProposal) return "reservation";
  if (message.attachments?.length) return "image";
  return "text";
};

const mapMessage = (message: BackendMessage): Message => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  senderName: "Utilisateur Shongre",
  content: message.text,
  type: mapMessageType(message),
  offerAmount: message.offerPrice,
  offerId: message.offerId || (message.isOffer ? message.id : undefined),
  offerAmountMinor:
    message.offerAmountMinor ??
    (message.offerPrice !== undefined
      ? Math.round(message.offerPrice * 100)
      : undefined),
  offerCurrency: message.offerCurrency,
  offerStatus: message.offerStatus,
  offerExpiresAt: message.offerExpiresAt,
  attachmentUrl: message.attachments?.[0],
  attachmentType: message.attachments?.length ? "image" : undefined,
  createdAt: message.createdAt,
  isRead: false,
});

const mapConversation = (conversation: BackendConversation): Conversation => ({
  id: conversation.id,
  listingId: conversation.listingId,
  listingTitle: conversation.listing?.title || "Annonce",
  listingPrice: Number(conversation.listing?.price || 0),
  listingPhotoUrl: conversation.listing?.images?.[0] || "",
  listingStatus: mapListingStatus(conversation.listing?.status),
  buyerId: conversation.buyerId,
  buyerName: conversation.buyer?.name || "Acheteur",
  buyerAvatarUrl: conversation.buyer?.avatarUrl,
  sellerId: conversation.sellerId,
  sellerName: conversation.seller?.name || "Vendeur",
  sellerAvatarUrl: conversation.seller?.avatarUrl,
  sellerType: (conversation.seller?.sellerType ||
    (conversation.seller?.accountType === "professional"
      ? "pro"
      : "individual")) as SellerType,
  lastMessage: conversation.lastMessageText || "Nouvelle conversation",
  lastMessageAt: conversation.lastMessageAt,
  unreadCount: conversation.unreadCount || 0,
  status: "active",
});

export class HttpMessagingService implements MessagingServiceContract {
  async updatePresence(
    heartbeat: import("@shongre/shared/presence").PresenceHeartbeat,
    signal?: AbortSignal,
  ) {
    return apiOperation("postMessagingPresence", { body: heartbeat, signal });
  }

  async getPresence(conversationIds: readonly string[], signal?: AbortSignal) {
    return apiOperation("getMessagingPresence", {
      query: { conversationIds: conversationIds.join(",") },
      signal,
    });
  }
  async getUserConversations(): Promise<Conversation[]> {
    const page = await apiOperation<
      {
        items: BackendConversation[];
        pageInfo: { hasNextPage: boolean; nextCursor?: string };
      },
      "getMessagingConversations"
    >("getMessagingConversations", { query: { limit: 100 } });
    return page.items.map(mapConversation);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const conversation = await apiOperation<
      BackendConversation,
      "getMessagingConversationsById"
    >("getMessagingConversationsById", { path: { id: id } });
    const messages = await this.getMessages(id);
    return { ...mapConversation(conversation), messages };
  }

  async getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Message[]> {
    const page = await apiOperation<
      BackendMessagePage,
      "getMessagingConversationsByIdMessages"
    >("getMessagingConversationsByIdMessages", {
      path: { id: conversationId },
      query: { cursor, limit: 50 },
    });
    return page.items.map(mapMessage);
  }

  async createOrGetConversation(
    input: CreateOrGetConversationInput,
  ): Promise<Conversation> {
    const conversation = await apiOperation<
      BackendConversation,
      "postMessagingConversations"
    >("postMessagingConversations", {
      body: {
        listingId: input.listingId,
        initialMessage: input.initialMessage,
      },
    });
    return mapConversation(conversation);
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const message = await apiOperation<
      BackendMessage,
      "postMessagingConversationsByIdMessages"
    >("postMessagingConversationsByIdMessages", {
      path: { id: input.conversationId },
      body: {
        text: input.text,
        attachments: input.attachments,
        offerPrice: input.offerPrice,
      },
    });
    return mapMessage(message);
  }

  async makeOffer(conversationId: string, amount: number): Promise<Message> {
    const message = await apiOperation<BackendMessage, "postMessagingOffer">(
      "postMessagingOffer",
      {
        body: {
          conversationId,
          amountMinor: Math.round(amount * 100),
        },
      },
    );
    return mapMessage(message);
  }

  async respondToOffer(offerId: string, accept: boolean): Promise<Message> {
    const message = await apiOperation<
      BackendMessage,
      "postMessagingOfferResponse"
    >("postMessagingOfferResponse", { body: { offerId, accept } });
    return mapMessage(message);
  }

  async withdrawOffer(offerId: string): Promise<Message> {
    const message = await apiOperation<
      BackendMessage,
      "postMessagingOffersIdWithdraw"
    >("postMessagingOffersIdWithdraw", { path: { id: offerId }, body: {} });
    return mapMessage(message);
  }

  async schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message> {
    const message = await apiOperation<
      BackendMessage,
      "postMessagingSchedulePickup"
    >("postMessagingSchedulePickup", {
      body: { conversationId, date, timeSlot, address },
    });
    return mapMessage(message);
  }

  async markAsRead(conversationId: string): Promise<void> {
    await apiOperation<void, "postMessagingRead">("postMessagingRead", {
      body: { conversationId },
    });
  }

  async blockUser(targetUserId: string): Promise<void> {
    await apiOperation<void, "postMessagingBlock">("postMessagingBlock", {
      body: { targetUserId },
    });
  }

  async unblockUser(targetUserId: string): Promise<void> {
    await apiOperation<void, "postMessagingUnblock">("postMessagingUnblock", {
      body: { targetUserId },
    });
  }

  async getBlockedUserIds(): Promise<string[]> {
    const response = await apiOperation<
      { userIds: string[] },
      "getMessagingBlocked"
    >("getMessagingBlocked", {});
    return response.userIds;
  }
}

export const httpMessagingService = new HttpMessagingService();
