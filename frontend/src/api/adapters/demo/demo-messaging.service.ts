import {
  CreateOrGetConversationInput,
  MessageComposerOptions,
  MessageComposerOptionsInput,
  MessagingServiceContract,
  SendMessageInput,
} from "../../contracts/messaging.contract";
import { messagingRepository } from "../../../repositories/messaging.repository";
import { userRepository } from "../../../repositories/user.repository";
import { storageService } from "../../../services/storage.service";
import { Conversation, Message } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { translate } from "../../../i18n/i18n.service";
import { requireDemoCapability } from "./demo-authorization";

const DEMO_ATTACHMENT_LIBRARY = [
  {
    id: "condition-photo",
    labelKey: "messaging.messageComposer.demoAttachmentCondition" as const,
    url: "https://images.unsplash.com/photo-1580481077195-c3a9927b74b7?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "invoice-warranty",
    labelKey: "messaging.messageComposer.demoAttachmentInvoice" as const,
    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "included-accessories",
    labelKey: "messaging.messageComposer.demoAttachmentAccessories" as const,
    url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  },
];

const PRO_QUICK_REPLY_KEYS = [
  "messaging.messageComposer.quickReplyAvailable",
  "messaging.messageComposer.quickReplyShipping",
  "messaging.messageComposer.quickReplyPickup",
  "messaging.messageComposer.quickReplyInvoice",
] as const;

export class DemoMessagingService implements MessagingServiceContract {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    await simulateNetworkDelay();
    requireDemoCapability("message.read.own");
    return messagingRepository.getUserConversations(userId);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    await simulateNetworkDelay();
    requireDemoCapability("message.read.own");
    return messagingRepository.getConversationById(id);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    await simulateNetworkDelay();
    requireDemoCapability("message.read.own");
    return messagingRepository.getMessages(conversationId);
  }

  async getComposerOptions(
    input: MessageComposerOptionsInput,
  ): Promise<MessageComposerOptions> {
    await simulateNetworkDelay();
    requireDemoCapability("message.send");
    return {
      attachmentOptions: DEMO_ATTACHMENT_LIBRARY.map((option) => ({
        id: option.id,
        label: translate(option.labelKey, input.locale),
        url: option.url,
      })),
      quickReplies: input.isProfessional
        ? PRO_QUICK_REPLY_KEYS.map((key) => translate(key, input.locale))
        : [],
    };
  }

  async createOrGetConversation(
    input: CreateOrGetConversationInput,
  ): Promise<Conversation> {
    await simulateNetworkDelay();
    requireDemoCapability("message.send");
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
    requireDemoCapability("message.send");
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
    requireDemoCapability("message.send");
    return messagingRepository.makeOffer(
      conversationId,
      senderId,
      senderName,
      amount,
    );
  }

  async respondToOffer(
    offerId: string,
    userId: string,
    userName: string,
    accept: boolean,
  ): Promise<Message> {
    await simulateNetworkDelay();
    requireDemoCapability("message.send");
    return messagingRepository.respondToOffer(
      offerId,
      userId,
      userName,
      accept,
    );
  }

  async withdrawOffer(offerId: string, userId: string): Promise<Message> {
    await simulateNetworkDelay();
    requireDemoCapability("message.send");
    return messagingRepository.withdrawOffer(offerId, userId);
  }

  async schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message> {
    await simulateNetworkDelay();
    requireDemoCapability("message.send");
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
    requireDemoCapability("message.read.own");
    await messagingRepository.markAsRead(conversationId, userId);
  }

  async blockUser(_userId: string, targetUserId: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("message.block");
    userRepository.toggleBlock(targetUserId);
  }

  async unblockUser(_userId: string, targetUserId: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("message.block");
    storageService.unblockUser(targetUserId);
  }

  async getBlockedUserIds(_userId: string): Promise<string[]> {
    await simulateNetworkDelay();
    requireDemoCapability("message.block");
    return storageService.getBlockedUsers();
  }
}

export const demoMessagingService = new DemoMessagingService();
