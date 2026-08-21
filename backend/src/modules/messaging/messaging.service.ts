import { Conversation, Message } from '../../shared/types/index.js';
import { IMessagingRepository, repositories } from '../../infrastructure/database/repositories/index.js';
import { realtimeBroadcaster } from '../../infrastructure/realtime/realtime-broadcaster.js';
import { AppError } from '../../shared/errors/app-error.js';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  offerPrice?: number;
}

export class MessagingService {
  constructor(private messagingRepo: IMessagingRepository = repositories.messaging) {}

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.messagingRepo.getUserConversations(userId);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.messagingRepo.getConversationById(id);
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    await this.assertInteractionAllowed(input.conversationId, input.senderId);
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

    const saved = await this.messagingRepo.saveMessage(message);
    await realtimeBroadcaster.broadcastEvent(`conversation:${input.conversationId}`, 'new_message', saved);
    return saved;
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

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    return this.messagingRepo.markAsRead(conversationId, userId);
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (!targetUserId || userId === targetUserId) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Utilisateur à bloquer invalide.' });
    }
    return this.messagingRepo.blockUser(userId, targetUserId);
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    if (!targetUserId || userId === targetUserId) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Utilisateur à débloquer invalide.' });
    }
    return this.messagingRepo.unblockUser(userId, targetUserId);
  }

  private async assertInteractionAllowed(conversationId: string, senderId: string): Promise<void> {
    if (senderId === 'system') return;
    const conversation = await this.messagingRepo.getConversationById(conversationId);
    if (!conversation) throw new AppError({ code: 'NOT_FOUND', message: 'Conversation introuvable.' });
    const otherUserId = conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;
    if (await this.messagingRepo.isBlockedBetween(senderId, otherUserId)) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Cette conversation est temporairement indisponible.' });
    }
  }
}

export const messagingService = new MessagingService();
