import {
  Conversation,
  ConversationPage,
  Message,
  MessagePage,
} from "../../shared/types/index.js";
import {
  IMessagingRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { realtimeBroadcaster } from "../../infrastructure/realtime/realtime-broadcaster.js";
import { AppError } from "../../shared/errors/app-error.js";
import { randomUUID } from "node:crypto";
import type { IListingRepository } from "../../infrastructure/database/repositories/listing.repository.js";

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  offerPrice?: number;
}

const OFFER_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_OFFER_AMOUNT_MINOR = 999_999_999_999;

export class MessagingService {
  constructor(
    private messagingRepo: IMessagingRepository = repositories.messaging,
    private listingRepo: IListingRepository = repositories.listings,
  ) {}

  async getUserConversations(
    userId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<ConversationPage> {
    return this.messagingRepo.getUserConversations(userId, options);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.messagingRepo.getConversationById(id);
  }

  async createConversationForListing(input: {
    listingId: string;
    marketCode: string;
    buyerId: string;
    initialMessage?: string;
  }): Promise<Conversation> {
    if (!input.listingId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Identifiant d’annonce manquant.",
      });
    }
    const listing = await this.listingRepo.findPublicById(
      input.listingId,
      input.marketCode,
    );
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable ou indisponible.",
      });
    }
    if (listing.sellerId === input.buyerId) {
      throw new AppError({
        code: "CONFLICT",
        message: "Vous ne pouvez pas contacter votre propre annonce.",
      });
    }
    if (
      await this.messagingRepo.isBlockedBetween(input.buyerId, listing.sellerId)
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette conversation est temporairement indisponible.",
      });
    }
    const conversation = await this.messagingRepo.createConversation(
      listing.id,
      input.buyerId,
      listing.sellerId,
    );
    if (input.initialMessage?.trim()) {
      await this.sendMessage({
        conversationId: conversation.id,
        senderId: input.buyerId,
        text: input.initialMessage,
      });
      return (await this.messagingRepo.getConversationById(conversation.id))!;
    }
    return conversation;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<MessagePage> {
    await this.assertParticipant(conversationId, userId);
    return this.messagingRepo.getMessages(conversationId, options);
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    await this.assertInteractionAllowed(input.conversationId, input.senderId);
    const text = typeof input.text === "string" ? input.text.trim() : "";
    const attachments = input.attachments || [];
    if ((!text && attachments.length === 0) || text.length > 5_000) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le message doit contenir entre 1 et 5 000 caractères.",
      });
    }
    if (
      attachments.length > 5 ||
      attachments.some((value) => {
        try {
          const url = new URL(value);
          return url.protocol !== "https:" || value.length > 2_048;
        } catch {
          return true;
        }
      })
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une pièce jointe au message est invalide.",
      });
    }
    if (input.offerPrice !== undefined) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Utilisez le parcours d’offre de prix dédié.",
      });
    }
    const message: Message = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: input.senderId,
      text,
      attachments,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.messagingRepo.saveMessage(message);
    await realtimeBroadcaster.broadcastEvent(
      `conversation:${input.conversationId}`,
      "new_message",
      saved,
    );
    return saved;
  }

  async makeOffer(input: {
    conversationId: string;
    senderId: string;
    amountMinor: number;
    parentOfferId?: string;
  }): Promise<Message> {
    if (
      !Number.isSafeInteger(input.amountMinor) ||
      input.amountMinor <= 0 ||
      input.amountMinor > MAX_OFFER_AMOUNT_MINOR
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le montant de l’offre est invalide.",
      });
    }
    const conversation = await this.assertInteractionAllowed(
      input.conversationId,
      input.senderId,
    );
    const listing = await this.listingRepo.findById(conversation.listingId);
    if (!listing?.currency) {
      throw new AppError({
        code: "CONFLICT",
        message: "La devise de cette annonce est indisponible.",
      });
    }
    const amountLabel = (input.amountMinor / 100).toFixed(2);
    const saved = await this.messagingRepo.createMarketplaceOffer({
      conversationId: input.conversationId,
      actorId: input.senderId,
      amountMinor: input.amountMinor,
      currency: listing.currency,
      messageText: input.parentOfferId
        ? `Contre-offre de ${amountLabel} ${listing.currency}.`
        : `Offre de prix proposée : ${amountLabel} ${listing.currency}.`,
      expiresAt: new Date(Date.now() + OFFER_LIFETIME_MS).toISOString(),
      parentOfferId: input.parentOfferId,
    });
    await realtimeBroadcaster.broadcastEvent(
      `conversation:${input.conversationId}`,
      "new_message",
      saved,
    );
    return saved;
  }

  async respondToOffer(input: {
    offerId: string;
    userId: string;
    accept: boolean;
  }): Promise<Message> {
    const result = await this.messagingRepo.respondToMarketplaceOffer({
      offerId: input.offerId,
      actorId: input.userId,
      decision: input.accept ? "accepted" : "declined",
      messageText: input.accept
        ? "Offre de prix acceptée."
        : "Offre de prix refusée.",
    });
    if (result.offerMessage.offerStatus === "expired") {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette offre a expiré.",
      });
    }
    await this.broadcastOfferTransition(result);
    return result.offerMessage;
  }

  async withdrawOffer(offerId: string, userId: string): Promise<Message> {
    const result = await this.messagingRepo.withdrawMarketplaceOffer({
      offerId,
      actorId: userId,
      messageText: "Offre de prix retirée.",
    });
    await this.broadcastOfferTransition(result);
    return result.offerMessage;
  }

  async schedulePickup(
    conversationId: string,
    senderId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message> {
    if (
      !date?.trim() ||
      !timeSlot?.trim() ||
      !address?.trim() ||
      address.length > 500
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les informations du rendez-vous sont invalides.",
      });
    }
    await this.assertInteractionAllowed(conversationId, senderId);
    const message: Message = {
      id: randomUUID(),
      conversationId,
      senderId,
      text: `Rendez-vous de remise en main propre proposé pour le ${date} (${timeSlot}) à ${address}`,
      isPickupProposal: true,
      pickupDetails: {
        date: date.trim(),
        timeSlot: timeSlot.trim(),
        address: address.trim(),
      },
      createdAt: new Date().toISOString(),
    };
    const saved = await this.messagingRepo.saveMessage(message);
    await realtimeBroadcaster.broadcastEvent(
      `conversation:${conversationId}`,
      "new_message",
      saved,
    );
    return saved;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    return this.messagingRepo.markAsRead(conversationId, userId);
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (!targetUserId || userId === targetUserId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Utilisateur à bloquer invalide.",
      });
    }
    return this.messagingRepo.blockUser(userId, targetUserId);
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    if (!targetUserId || userId === targetUserId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Utilisateur à débloquer invalide.",
      });
    }
    return this.messagingRepo.unblockUser(userId, targetUserId);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.messagingRepo.getBlockedUserIds(userId);
  }

  private async broadcastOfferTransition(result: {
    offerMessage: Message;
    eventMessage?: Message;
  }): Promise<void> {
    await realtimeBroadcaster.broadcastEvent(
      `conversation:${result.offerMessage.conversationId}`,
      "offer_updated",
      result.offerMessage,
    );
    if (result.eventMessage) {
      await realtimeBroadcaster.broadcastEvent(
        `conversation:${result.offerMessage.conversationId}`,
        "new_message",
        result.eventMessage,
      );
    }
  }

  private async assertInteractionAllowed(
    conversationId: string,
    senderId: string,
  ): Promise<Conversation> {
    if (senderId === "system") {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Une action utilisateur ne peut pas être attribuée au système.",
      });
    }
    const conversation =
      await this.messagingRepo.getConversationById(conversationId);
    if (!conversation)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    if (
      conversation.buyerId !== senderId &&
      conversation.sellerId !== senderId
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Accès interdit à cette conversation.",
      });
    }
    const otherUserId =
      conversation.buyerId === senderId
        ? conversation.sellerId
        : conversation.buyerId;
    if (await this.messagingRepo.isBlockedBetween(senderId, otherUserId)) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette conversation est temporairement indisponible.",
      });
    }
    return conversation;
  }

  private async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation =
      await this.messagingRepo.getConversationById(conversationId);
    if (!conversation) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    }
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Accès interdit à cette conversation.",
      });
    }
    return conversation;
  }
}

export const messagingService = new MessagingService();
