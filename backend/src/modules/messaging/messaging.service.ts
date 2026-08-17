import { Conversation, Message } from '../../shared/types/index.js';
import { realtimeBroadcaster } from '../../infrastructure/realtime/realtime-broadcaster.js';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  offerPrice?: number;
}

export class MessagingService {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return [];
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return null;
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const message: Message = {
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      conversationId: input.conversationId,
      senderId: input.senderId,
      text: input.text,
      attachments: input.attachments || [],
      offerPrice: input.offerPrice,
      isOffer: Boolean(input.offerPrice),
      offerStatus: input.offerPrice ? 'pending' : undefined,
      createdAt: new Date().toISOString(),
    };

    await realtimeBroadcaster.broadcastEvent(`conversation:${input.conversationId}`, 'new_message', message);
    return message;
  }

  async makeOffer(conversationId: string, senderId: string, senderName: string, amount: number): Promise<Message> {
    return this.sendMessage({
      conversationId,
      senderId,
      text: `${senderName} propose une offre de prix à ${amount} €`,
      offerPrice: amount,
    });
  }

  async respondToOffer(conversationId: string, userId: string, userName: string, accept: boolean): Promise<Message> {
    return this.sendMessage({
      conversationId,
      senderId: userId,
      text: accept ? `${userName} a accepté l'offre de prix.` : `${userName} a décliné l'offre de prix.`,
    });
  }

  async schedulePickup(conversationId: string, date: string, timeSlot: string, address: string): Promise<Message> {
    return this.sendMessage({
      conversationId,
      senderId: 'system',
      text: `Rendez-vous de remise en main propre proposé pour le ${date} (${timeSlot}) à ${address}`,
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {}

  async blockUser(userId: string, targetUserId: string): Promise<void> {}
}

export const messagingService = new MessagingService();
