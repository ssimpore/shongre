import {
  CreateOrGetConversationInput,
  MessagingServiceContract,
  SendMessageInput,
} from "../../contracts/messaging.contract";
import { messagingRepository } from "../../../repositories/messaging.repository";
import { userRepository } from "../../../repositories/user.repository";
import { storageService } from "../../../services/storage.service";
import { Conversation, Message } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoMessagingService implements MessagingServiceContract {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    await simulateNetworkDelay();
    return messagingRepository.getUserConversations(userId);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    await simulateNetworkDelay();
    return messagingRepository.getConversationById(id);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    await simulateNetworkDelay();
    return messagingRepository.getMessages(conversationId);
  }

  async createOrGetConversation(
    input: CreateOrGetConversationInput,
  ): Promise<Conversation> {
    await simulateNetworkDelay();
    return messagingRepository.createOrGetConversation({
      listingId: input.listingId,
      buyerId:
        input.buyerId || storageService.getCurrentUser()?.id || "guest-user",
      sellerId: input.sellerId || "seller-pro-1",
      buyerName: input.buyerName,
      sellerName: input.sellerName,
      initialMessage: input.initialMessage,
    });
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    await simulateNetworkDelay();
    const user = storageService.getCurrentUser();
    const senderName = user?.name || "Utilisateur Shongre";
    const attachmentUrl =
      input.attachments && input.attachments.length > 0
        ? input.attachments[0]
        : undefined;

    return messagingRepository.sendMessage(
      input.conversationId,
      input.senderId,
      senderName,
      input.text,
      input.offerPrice ? "offer" : "text",
      input.offerPrice,
      attachmentUrl,
      attachmentUrl ? "image" : undefined,
    );
  }

  async makeOffer(
    conversationId: string,
    senderId: string,
    senderName: string,
    amount: number,
  ): Promise<Message> {
    await simulateNetworkDelay();
    return messagingRepository.makeOffer(
      conversationId,
      senderId,
      senderName,
      amount,
    );
  }

  async respondToOffer(
    conversationId: string,
    userId: string,
    userName: string,
    accept: boolean,
  ): Promise<Message> {
    await simulateNetworkDelay();
    return messagingRepository.respondToOffer(
      conversationId,
      userId,
      userName,
      accept,
    );
  }

  async schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message> {
    await simulateNetworkDelay();
    await messagingRepository.schedulePickup(
      conversationId,
      date,
      timeSlot,
      address,
    );
    return {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: "system",
      senderName: "Shongre",
      content: `Rendez-vous planifié le ${date} (${timeSlot}) à ${address}`,
      type: "system",
      createdAt: new Date().toISOString(),
      isRead: true,
    };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await simulateNetworkDelay();
    await messagingRepository.markAsRead(conversationId, userId);
  }

  async blockUser(_userId: string, targetUserId: string): Promise<void> {
    await simulateNetworkDelay();
    userRepository.toggleBlock(targetUserId);
  }

  async unblockUser(_userId: string, targetUserId: string): Promise<void> {
    await simulateNetworkDelay();
    storageService.unblockUser(targetUserId);
  }

  async getBlockedUserIds(_userId: string): Promise<string[]> {
    await simulateNetworkDelay();
    return storageService.getBlockedUsers();
  }
}

export const demoMessagingService = new DemoMessagingService();
