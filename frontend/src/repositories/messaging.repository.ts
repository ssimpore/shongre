import { Conversation, Message } from '../types';
import { storageService } from '../services/storage.service';

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
    type?: Message['type'],
    offerAmount?: number,
    attachmentUrl?: string,
    attachmentType?: 'image' | 'file'
  ): Promise<Message>;
  createConversation(listingId: string, buyerId: string, sellerId: string, initialMessage: string): Promise<Conversation>;
  createOrGetConversation(paramsOrListingId: string | CreateOrGetConversationParams, buyerId?: string, sellerId?: string, initialMessage?: string): Promise<Conversation>;
  makeOffer(conversationId: string, senderId: string, senderName: string, amount: number): Promise<Message>;
  sendOffer(paramsOrConversationId: string | SendOfferParams, senderId?: string, senderName?: string, amount?: number): Promise<Message>;
  respondOffer(conversationId: string, senderId: string, senderName: string, accept: boolean): Promise<Message>;
  respondToOffer(conversationId: string, senderId: string, senderName: string, accept: boolean): Promise<Message>;
  schedulePickup(conversationId: string, date: string, timeSlot: string, address: string): Promise<void>;
  markAsRead(conversationId: string, userId?: string): Promise<void>;
}

export class MockMessagingRepository implements IMessagingRepository {
  async getConversations(userId: string): Promise<Conversation[]> {
    const list = storageService.getConversations();
    const result = list.filter((c) => c.buyerId === userId || c.sellerId === userId);
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
    type: Message['type'] = 'text',
    offerAmount?: number,
    attachmentUrl?: string,
    attachmentType?: 'image' | 'file'
  ): Promise<Message> {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
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

  async createConversation(listingId: string, buyerId: string, sellerId: string, initialMessage: string): Promise<Conversation> {
    const listingData = storageService.getListings().find((l) => l.id === listingId);
    const currentUser = storageService.getCurrentUser();

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      listingId,
      listingTitle: listingData ? listingData.title : 'Annonce Shongre',
      listingPrice: listingData ? listingData.price : 0,
      listingPhotoUrl: listingData ? listingData.coverImageUrl : '',
      listingStatus: 'active',
      buyerId,
      buyerName: currentUser ? currentUser.name : 'Acheteur Shongre',
      buyerAvatarUrl: currentUser?.avatarUrl,
      sellerId,
      sellerName: listingData ? listingData.sellerName : 'Vendeur',
      sellerAvatarUrl: listingData?.sellerAvatarUrl,
      sellerType: listingData?.sellerType || 'individual',
      lastMessage: initialMessage,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      status: 'active',
    };

    const convs = storageService.getConversations();
    convs.unshift(newConv);
    storageService.saveConversations(convs);

    // Initial message
    if (initialMessage) {
      await this.sendMessage(newConv.id, buyerId, currentUser?.name || 'Acheteur', initialMessage);
    }

    newConv.messages = storageService.getMessages(newConv.id);
    return newConv;
  }

  async createOrGetConversation(
    paramsOrListingId: string | CreateOrGetConversationParams,
    buyerId?: string,
    sellerId?: string,
    initialMessage = 'Bonjour, je suis intéressé par votre annonce.'
  ): Promise<Conversation> {
    let actualListingId: string;
    let actualBuyerId: string;
    let actualSellerId: string;
    let actualInitialMessage: string;

    if (typeof paramsOrListingId === 'object') {
      actualListingId = paramsOrListingId.listingId;
      actualBuyerId = paramsOrListingId.buyerId;
      actualSellerId = paramsOrListingId.sellerId;
      actualInitialMessage = paramsOrListingId.initialMessage || initialMessage;
    } else {
      actualListingId = paramsOrListingId;
      actualBuyerId = buyerId || 'guest-user';
      actualSellerId = sellerId || 'seller-pro-1';
      actualInitialMessage = initialMessage;
    }

    const convs = storageService.getConversations();
    const existing = convs.find((c) => c.listingId === actualListingId && c.buyerId === actualBuyerId);
    if (existing) {
      if (actualInitialMessage && actualInitialMessage.trim()) {
        const currentUser = storageService.getCurrentUser();
        await this.sendMessage(existing.id, actualBuyerId, currentUser?.name || 'Acheteur', actualInitialMessage);
      }
      return {
        ...existing,
        messages: storageService.getMessages(existing.id),
      };
    }
    return this.createConversation(actualListingId, actualBuyerId, actualSellerId, actualInitialMessage);
  }

  async makeOffer(conversationId: string, senderId: string, senderName: string, amount: number): Promise<Message> {
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.currentOffer = {
        amount,
        status: 'pending',
        offeredBy: senderId,
      };
      storageService.saveConversations(convs);
    }
    return this.sendMessage(
      conversationId,
      senderId,
      senderName,
      `A proposé une offre d'achat à ${amount} €`,
      'offer',
      amount
    );
  }

  async sendOffer(
    paramsOrConversationId: string | SendOfferParams,
    senderId?: string,
    senderName?: string,
    amount?: number
  ): Promise<Message> {
    if (typeof paramsOrConversationId === 'object') {
      return this.makeOffer(
        paramsOrConversationId.conversationId,
        paramsOrConversationId.senderId,
        paramsOrConversationId.senderName,
        paramsOrConversationId.amount
      );
    }
    return this.makeOffer(
      paramsOrConversationId,
      senderId || 'user-thomas',
      senderName || 'Thomas Laurent',
      amount || 0
    );
  }

  async respondOffer(conversationId: string, senderId: string, senderName: string, accept: boolean): Promise<Message> {
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv && conv.currentOffer) {
      conv.currentOffer.status = accept ? 'accepted' : 'declined';
      storageService.saveConversations(convs);
    }
    const type = accept ? 'offer_accepted' : 'offer_declined';
    const content = accept
      ? `A accepté votre offre de ${conv?.currentOffer?.amount || ''} € ! Vous pouvez maintenant finaliser l'achat ou planifier le retrait.`
      : `A refusé l'offre de ${conv?.currentOffer?.amount || ''} €.`;

    return this.sendMessage(conversationId, senderId, senderName, content, type);
  }

  async respondToOffer(conversationId: string, senderId: string, senderName: string, accept: boolean): Promise<Message> {
    return this.respondOffer(conversationId, senderId, senderName, accept);
  }

  async schedulePickup(conversationId: string, date: string, timeSlot: string, address: string): Promise<void> {
    const convs = storageService.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.pickupDetails = {
        scheduledDate: date,
        scheduledTimeSlot: timeSlot,
        address,
        status: 'agreed',
      };
      storageService.saveConversations(convs);
    }
    await this.sendMessage(
      conversationId,
      'system',
      'Shongre Système',
      `Rendez-vous de remise en main propre convenu pour le ${date} (${timeSlot}) à l'adresse : ${address}`,
      'system'
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

export const messagingRepository: IMessagingRepository = new MockMessagingRepository();
