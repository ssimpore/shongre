import { Conversation, Message } from "../types";
import { storageService } from "../services/storage.service";
import { OFFER_INPUT_CONSTRAINTS } from "../domains/messaging/messaging.types";
import { deterministicRuntimeId } from "../utilities/deterministic-id";

export interface CreateOrGetConversationParams {
  listingId: string;
  buyerId: string;
  sellerId: string;
  buyerName?: string;
  sellerName?: string;
  initialMessage?: string;
}

export interface SendOfferParams {
  conversationId: string;
  senderId: string;
  senderName: string;
  amount: number;
}

export interface IMessagingRepository {
  getConversations(userId: string): Promise<Conversation[]>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type?: Message["type"],
    offerAmount?: number,
    attachmentUrl?: string,
    attachmentType?: "image" | "file",
  ): Promise<Message>;
  createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
    initialMessage: string,
  ): Promise<Conversation>;
  createOrGetConversation(
    paramsOrListingId: string | CreateOrGetConversationParams,
    buyerId?: string,
    sellerId?: string,
    initialMessage?: string,
  ): Promise<Conversation>;
  makeOffer(
    conversationId: string,
    senderId: string,
    senderName: string,
    amount: number,
  ): Promise<Message>;
  sendOffer(
    paramsOrConversationId: string | SendOfferParams,
    senderId?: string,
    senderName?: string,
    amount?: number,
  ): Promise<Message>;
  respondOffer(
    offerId: string,
    senderId: string,
    senderName: string,
    accept: boolean,
  ): Promise<Message>;
  respondToOffer(
    offerId: string,
    senderId: string,
    senderName: string,
    accept: boolean,
  ): Promise<Message>;
  withdrawOffer(offerId: string, senderId: string): Promise<Message>;
  schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<void>;
  markAsRead(conversationId: string, userId?: string): Promise<void>;
}

export class MockMessagingRepository implements IMessagingRepository {
  async getConversations(userId: string): Promise<Conversation[]> {
    const list = storageService.getConversations();
    const result = list.filter(
      (c) => c.buyerId === userId || c.sellerId === userId,
    );
    return result.map((c) => ({
      ...c,
      messages: storageService.getMessages(c.id),
    }));
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.getConversations(userId);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const list = storageService.getConversations();
    const conv = list.find((c) => c.id === id);
    if (!conv) return null;
    return {
      ...conv,
      messages: storageService.getMessages(conv.id),
    };
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return storageService.getMessages(conversationId);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: Message["type"] = "text",
    offerAmount?: number,
    attachmentUrl?: string,
    attachmentType?: "image" | "file",
  ): Promise<Message> {
    const newMsg: Message = {
      id: deterministicRuntimeId("msg", [conversationId, senderId, type]),
      conversationId,
      senderId,
      senderName,
      content,
      type,
      offerAmount,
      attachmentUrl,
      attachmentType,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    storageService.saveMessage(conversationId, newMsg);
    return newMsg;
  }

  async createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string,
    initialMessage: string,
  ): Promise<Conversation> {
    const listingData = storageService
      .getListings()
      .find((l) => l.id === listingId);
    const currentUser = storageService.getCurrentUser();

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      listingId,
      listingTitle: listingData ? listingData.title : "Annonce Shongre",
      listingPrice: listingData ? listingData.price : 0,
      listingPhotoUrl: listingData ? listingData.coverImageUrl : "",
      listingStatus: "active",
      buyerId,
      buyerName: currentUser ? currentUser.name : "Acheteur Shongre",
      buyerAvatarUrl: currentUser?.avatarUrl,
      sellerId,
      sellerName: listingData ? listingData.sellerName : "Vendeur",
      sellerAvatarUrl: listingData?.sellerAvatarUrl,
      sellerType: listingData?.sellerType || "individual",
      lastMessage: initialMessage,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      status: "active",
    };

    const convs = storageService.getConversations();
    convs.unshift(newConv);
    storageService.saveConversations(convs);

    // Initial message
    if (initialMessage) {
      await this.sendMessage(
        newConv.id,
        buyerId,
        currentUser?.name || "Acheteur",
        initialMessage,
      );
    }

    newConv.messages = storageService.getMessages(newConv.id);
    return newConv;
  }

  async createOrGetConversation(
    paramsOrListingId: string | CreateOrGetConversationParams,
    buyerId?: string,
    sellerId?: string,
    initialMessage = "Bonjour, je suis intéressé par votre annonce.",
  ): Promise<Conversation> {
    let actualListingId: string;
    let actualBuyerId: string;
    let actualSellerId: string;
    let actualInitialMessage: string;

    if (typeof paramsOrListingId === "object") {
      actualListingId = paramsOrListingId.listingId;
      actualBuyerId = paramsOrListingId.buyerId;
      actualSellerId = paramsOrListingId.sellerId;
      actualInitialMessage = paramsOrListingId.initialMessage || initialMessage;
    } else {
      actualListingId = paramsOrListingId;
      actualBuyerId = buyerId || "guest-user";
      actualSellerId = sellerId || "seller-pro-1";
      actualInitialMessage = initialMessage;
    }

    const convs = storageService.getConversations();
    const existing = convs.find(
      (c) => c.listingId === actualListingId && c.buyerId === actualBuyerId,
    );
    if (existing) {
      if (actualInitialMessage && actualInitialMessage.trim()) {
        const currentUser = storageService.getCurrentUser();
        await this.sendMessage(
          existing.id,
          actualBuyerId,
          currentUser?.name || "Acheteur",
          actualInitialMessage,
        );
      }
      return {
        ...existing,
        messages: storageService.getMessages(existing.id),
      };
    }
    return this.createConversation(
      actualListingId,
      actualBuyerId,
      actualSellerId,
      actualInitialMessage,
    );
  }

  async makeOffer(
    conversationId: string,
    senderId: string,
    senderName: string,
    amount: number,
  ): Promise<Message> {
    if (
      !Number.isFinite(amount) ||
      amount < OFFER_INPUT_CONSTRAINTS.minimumMajor
    )
      throw new Error("Le montant de l’offre est invalide.");
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (!conv || (conv.buyerId !== senderId && conv.sellerId !== senderId)) {
      throw new Error("Accès interdit à cette conversation.");
    }
    const now = new Date();
    const messages = storageService.getMessages(conversationId);
    const pending = messages.find((message) => {
      if (message.type !== "offer" || message.offerStatus !== "pending") {
        return false;
      }
      if (
        message.offerExpiresAt &&
        message.offerExpiresAt <= now.toISOString()
      ) {
        storageService.updateMessage(conversationId, message.id, {
          offerStatus: "expired",
        });
        return false;
      }
      return true;
    });
    if (pending) {
      throw new Error("Une offre est déjà en attente dans cette conversation.");
    }
    const message = await this.sendMessage(
      conversationId,
      senderId,
      senderName,
      `A proposé une offre d'achat à ${amount} €`,
      "offer",
      amount,
    );
    const expiresAt = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1_000,
    ).toISOString();
    const offer = storageService.updateMessage(conversationId, message.id, {
      offerId: message.id,
      offerAmountMinor: Math.round(amount * 100),
      offerCurrency: "EUR",
      offerStatus: "pending",
      offerExpiresAt: expiresAt,
    })!;
    conv.currentOffer = {
      amount,
      status: "pending",
      offeredBy: senderId,
    };
    storageService.saveConversations(convs);
    return offer;
  }

  async sendOffer(
    paramsOrConversationId: string | SendOfferParams,
    senderId?: string,
    senderName?: string,
    amount?: number,
  ): Promise<Message> {
    if (typeof paramsOrConversationId === "object") {
      return this.makeOffer(
        paramsOrConversationId.conversationId,
        paramsOrConversationId.senderId,
        paramsOrConversationId.senderName,
        paramsOrConversationId.amount,
      );
    }
    return this.makeOffer(
      paramsOrConversationId,
      senderId || "user-thomas",
      senderName || "Thomas Laurent",
      amount || 0,
    );
  }

  async respondOffer(
    offerId: string,
    senderId: string,
    senderName: string,
    accept: boolean,
  ): Promise<Message> {
    const match = this.findOffer(offerId);
    const { conversationId, offer } = match;
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (!conv) throw new Error("Conversation introuvable.");
    const recipientId =
      offer.senderId === conv.buyerId ? conv.sellerId : conv.buyerId;
    if (recipientId !== senderId) {
      throw new Error("Seul le destinataire peut répondre à cette offre.");
    }
    if (offer.offerStatus !== "pending") {
      throw new Error("Cette offre n’est plus en attente.");
    }
    if (
      offer.offerExpiresAt &&
      offer.offerExpiresAt <= new Date().toISOString()
    ) {
      storageService.updateMessage(conversationId, offer.id, {
        offerStatus: "expired",
      });
      throw new Error("Cette offre a expiré.");
    }
    const status = accept ? "accepted" : "declined";
    const updatedOffer = storageService.updateMessage(
      conversationId,
      offer.id,
      {
        offerStatus: status,
      },
    )!;
    if (conv.currentOffer) conv.currentOffer.status = status;
    storageService.saveConversations(convs);
    const type = accept ? "offer_accepted" : "offer_declined";
    const content = accept
      ? `A accepté votre offre de ${offer.offerAmount || ""} € ! Vous pouvez maintenant finaliser l'achat ou planifier le retrait.`
      : `A refusé l'offre de ${offer.offerAmount || ""} €.`;

    await this.sendMessage(conversationId, senderId, senderName, content, type);
    return updatedOffer;
  }

  async respondToOffer(
    offerId: string,
    senderId: string,
    senderName: string,
    accept: boolean,
  ): Promise<Message> {
    return this.respondOffer(offerId, senderId, senderName, accept);
  }

  async withdrawOffer(offerId: string, senderId: string): Promise<Message> {
    const { conversationId, offer } = this.findOffer(offerId);
    if (offer.senderId !== senderId) {
      throw new Error("Seul l’auteur peut retirer cette offre.");
    }
    if (offer.offerStatus !== "pending") {
      throw new Error("Cette offre n’est plus en attente.");
    }
    const updated = storageService.updateMessage(conversationId, offer.id, {
      offerStatus: "withdrawn",
    })!;
    await this.sendMessage(
      conversationId,
      senderId,
      "Utilisateur Shongre",
      "Offre de prix retirée.",
      "system",
    );
    return updated;
  }

  private findOffer(offerId: string): {
    conversationId: string;
    offer: Message;
  } {
    for (const conversation of storageService.getConversations()) {
      const offer = storageService
        .getMessages(conversation.id)
        .find((message) => message.id === offerId && message.type === "offer");
      if (offer) return { conversationId: conversation.id, offer };
    }
    throw new Error("Offre introuvable.");
  }

  async schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<void> {
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.pickupDetails = {
        scheduledDate: date,
        scheduledTimeSlot: timeSlot,
        address,
        status: "agreed",
      };
      storageService.saveConversations(convs);
    }
    await this.sendMessage(
      conversationId,
      "system",
      "Shongre Système",
      `Rendez-vous de remise en main propre convenu pour le ${date} (${timeSlot}) à l'adresse : ${address}`,
      "system",
    );
  }

  async markAsRead(conversationId: string, userId?: string): Promise<void> {
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.unreadCount = 0;
      storageService.saveConversations(convs);
    }
  }
}

export const messagingRepository: IMessagingRepository =
  new MockMessagingRepository();
