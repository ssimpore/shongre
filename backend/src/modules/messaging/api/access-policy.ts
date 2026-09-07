import { Principal } from "../../../shared/auth/principal.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { messagingService } from "../messaging.service.js";

export function assertConversationParticipant<
  T extends { buyerId: string; sellerId: string } | null,
>(principal: Principal, conversation: T): T {
  if (!conversation) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Conversation introuvable.",
    });
  }
  // No staff override: private correspondence is not a moderation surface by
  // default. Reading a reported thread should go through a moderation case
  // that records who looked and why.
  if (
    conversation.buyerId !== principal.userId &&
    conversation.sellerId !== principal.userId
  ) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Conversation introuvable.",
    });
  }
  return conversation;
}

export async function assertConversationAccess(
  principal: Principal,
  conversationId: string | undefined,
): Promise<void> {
  if (!conversationId) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Identifiant de conversation manquant.",
    });
  }
  const conversation =
    await messagingService.getConversationById(conversationId);
  assertConversationParticipant(principal, conversation);
}
