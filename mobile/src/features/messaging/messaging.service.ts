import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";
import { listingsService } from "@/features/listings/listings.service";
import { getCountryConfig } from "@shongre/contracts";

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

const DEMO_TIMESTAMPS = [
  "2026-09-03T08:42:00.000Z",
  "2026-09-03T08:43:00.000Z",
  "2026-09-03T08:44:00.000Z",
  "2026-09-03T08:45:00.000Z",
];

export class DemoMessagingService implements MessagingService {
  private conversations: MobileConversation[] = [
    {
      id: "mobile-conversation-bike",
      listingId: "list_1",
      marketCode: "FR",
      buyerId: "user_thomas",
      sellerId: "user_camille",
      participantName: "Camille Martin",
      listingTitle: "Vélo de route carbone Shimano 105",
      lastMessageText:
        "Bonjour, le vélo est toujours disponible. Souhaitez-vous venir l’essayer ?",
      lastMessageAt: DEMO_TIMESTAMPS[0],
      unreadCount: 1,
    },
  ];
  private messagesByConversation = new Map<string, MobileMessage[]>([
    [
      "mobile-conversation-bike",
      [
        {
          id: "mobile-message-bike-1",
          conversationId: "mobile-conversation-bike",
          senderId: "user_camille",
          text: "Bonjour, le vélo est toujours disponible. Souhaitez-vous venir l’essayer ?",
          createdAt: DEMO_TIMESTAMPS[0],
        },
      ],
    ],
  ]);
  private sequence = 1;

  async list(
    userId: string,
    marketCode: string,
  ): Promise<MobileConversation[]> {
    return this.conversations
      .filter(
        (item) =>
          item.marketCode === marketCode &&
          (item.buyerId === userId || item.sellerId === userId),
      )
      .map((item) => ({ ...item }));
  }

  async messages(
    conversationId: string,
    userId: string,
    marketCode: string,
  ): Promise<MobileMessage[]> {
    this.assertParticipant(conversationId, userId, marketCode);
    return (this.messagesByConversation.get(conversationId) || []).map(
      (item) => ({ ...item }),
    );
  }

  async createForListing(input: {
    listingId: string;
    marketCode: string;
    userId: string;
  }): Promise<MobileConversation> {
    const existing = this.conversations.find(
      (item) =>
        item.listingId === input.listingId &&
        item.marketCode === input.marketCode &&
        item.buyerId === input.userId,
    );
    if (existing) return { ...existing };
    const listing = (
      await listingsService.list(input.marketCode, "", "marketplace")
    ).find((item) => item.id === input.listingId);
    if (!listing) throw new Error("Annonce introuvable.");
    if (!listing.seller) throw new Error("Vendeur introuvable.");
    if (listing.seller.id === input.userId) {
      throw new Error("Vous ne pouvez pas vous contacter vous-même.");
    }
    const conversation: MobileConversation = {
      id: `mobile-conversation-${input.userId}-${input.marketCode}-${input.listingId}`,
      listingId: input.listingId,
      marketCode: input.marketCode,
      buyerId: input.userId,
      sellerId: listing.seller.id,
      participantName: listing.seller.name,
      listingTitle: listing.title,
      lastMessageText: "Conversation ouverte",
      lastMessageAt: DEMO_TIMESTAMPS[0],
      unreadCount: 0,
    };
    this.conversations.unshift(conversation);
    this.messagesByConversation.set(conversation.id, []);
    return { ...conversation };
  }

  async send(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    text: string;
  }): Promise<MobileMessage> {
    this.assertParticipant(
      input.conversationId,
      input.senderId,
      input.marketCode,
    );
    const text = input.text.trim();
    if (!text || text.length > 5_000)
      throw new Error("Le message doit contenir entre 1 et 5 000 caractères.");
    return { ...this.append(input.conversationId, input.senderId, text) };
  }

  async offer(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    amountMinor: number;
  }): Promise<MobileMessage> {
    this.assertParticipant(
      input.conversationId,
      input.senderId,
      input.marketCode,
    );
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
      throw new Error("Le montant de l’offre est invalide.");
    return {
      ...this.append(
        input.conversationId,
        input.senderId,
        "Offre de prix proposée.",
        {
          amountMinor: input.amountMinor,
          currency: getCountryConfig(input.marketCode)?.currency || "EUR",
          status: "pending",
        },
      ),
    };
  }

  async markRead(
    conversationId: string,
    userId: string,
    marketCode: string,
  ): Promise<void> {
    this.assertParticipant(conversationId, userId, marketCode).unreadCount = 0;
  }

  private append(
    conversationId: string,
    senderId: string,
    text: string,
    offer?: MobileMessage["offer"],
  ): MobileMessage {
    const createdAt = DEMO_TIMESTAMPS[this.sequence % DEMO_TIMESTAMPS.length];
    const message: MobileMessage = {
      id: `mobile-message-${this.sequence}`,
      conversationId,
      senderId,
      text,
      createdAt,
      ...(offer ? { offer } : {}),
    };
    this.sequence += 1;
    this.messagesByConversation.set(conversationId, [
      ...(this.messagesByConversation.get(conversationId) || []),
      message,
    ]);
    const conversation = this.conversations.find(
      (item) => item.id === conversationId,
    );
    if (conversation) {
      conversation.lastMessageText = text;
      conversation.lastMessageAt = createdAt;
    }
    return message;
  }

  private assertParticipant(
    conversationId: string,
    userId: string,
    marketCode: string,
  ): MobileConversation {
    const conversation = this.conversations.find(
      (item) => item.id === conversationId && item.marketCode === marketCode,
    );
    if (
      !conversation ||
      (conversation.buyerId !== userId && conversation.sellerId !== userId)
    )
      throw new Error("Conversation introuvable.");
    return conversation;
  }
}

export class HttpMessagingService implements MessagingService {
  async list(
    userId: string,
    marketCode: string,
  ): Promise<MobileConversation[]> {
    const page = await apiRequest<{ items: BackendConversation[] }>(
      "/messaging/conversations?limit=50",
      {},
      marketCode,
    );
    return page.items.map((item) => mapConversation(item, userId, marketCode));
  }
  async messages(
    conversationId: string,
    _userId: string,
    marketCode: string,
  ): Promise<MobileMessage[]> {
    const page = await apiRequest<{ items: BackendMessage[] }>(
      `/messaging/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`,
      {},
      marketCode,
    );
    return page.items.map(mapMessage);
  }
  async createForListing(input: {
    listingId: string;
    marketCode: string;
    userId: string;
  }): Promise<MobileConversation> {
    const conversation = await apiRequest<BackendConversation>(
      "/messaging/conversations",
      { method: "POST", body: JSON.stringify({ listingId: input.listingId }) },
      input.marketCode,
    );
    return mapConversation(conversation, input.userId, input.marketCode);
  }
  async send(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    text: string;
  }): Promise<MobileMessage> {
    return mapMessage(
      await apiRequest<BackendMessage>(
        `/messaging/conversations/${encodeURIComponent(input.conversationId)}/messages`,
        { method: "POST", body: JSON.stringify({ text: input.text }) },
        input.marketCode,
      ),
    );
  }
  async offer(input: {
    conversationId: string;
    senderId: string;
    marketCode: string;
    amountMinor: number;
  }): Promise<MobileMessage> {
    return mapMessage(
      await apiRequest<BackendMessage>(
        "/messaging/offer",
        {
          method: "POST",
          body: JSON.stringify({
            conversationId: input.conversationId,
            amountMinor: input.amountMinor,
          }),
        },
        input.marketCode,
      ),
    );
  }
  async markRead(
    conversationId: string,
    _userId: string,
    marketCode: string,
  ): Promise<void> {
    await apiRequest(
      "/messaging/read",
      { method: "POST", body: JSON.stringify({ conversationId }) },
      marketCode,
    );
  }
}

export const messagingService: MessagingService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoMessagingService()
    : new HttpMessagingService();
