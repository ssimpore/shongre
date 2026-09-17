import { randomUUID } from "node:crypto";
import { transactionReviewInputSchema } from "@shongre/contracts/reviews";
import type { components } from "@shongre/contracts/openapi";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import {
  repositories,
  type IReviewRepository,
  type IOrderRepository,
  type IUserRepository,
  type IListingRepository,
} from "../../infrastructure/database/repositories/index.js";

type SubmitReviewInput = components["schemas"]["SubmitTransactionReview"];

/** Mirrors `ReviewReplyInput` and the `reply_comment` check in 00143. */
const reviewReplySchema = z.object({
  comment: z.string().trim().min(10).max(2000),
});
/** Mirrors `ReviewHelpfulInput`. */
const reviewHelpfulSchema = z.object({ helpful: z.boolean() });

export class ReviewsService {
  constructor(
    private reviewRepo: IReviewRepository = repositories.reviews,
    private orderRepo: IOrderRepository = repositories.orders,
    private userRepo: IUserRepository = repositories.users,
    private listingRepo: IListingRepository = repositories.listings,
  ) {}

  /** `viewerId` is the signed-in reader, when there is one. */
  getUserReviews(userId: string, viewerId?: string) {
    return this.reviewRepo.getUserReviews(userId, viewerId);
  }

  private async requireParticipant(orderId: string, authorId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (
      !order ||
      ![order.buyerId, order.sellerId].includes(authorId) ||
      order.buyerId === order.sellerId
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    }
    return order;
  }

  async getOrderEligibility(
    orderId: string,
    authorId: string,
  ): Promise<components["schemas"]["OrderReviewEligibility"]> {
    const order = await this.requireParticipant(orderId, authorId);
    const review = await this.reviewRepo.getOrderReview(orderId, authorId);
    return {
      eligible: !review && order.status === "completed",
      reason: review
        ? "ALREADY_REVIEWED"
        : order.status !== "completed"
          ? "NOT_COMPLETED"
          : null,
      review,
    };
  }

  async submitReview(authorId: string, input: SubmitReviewInput) {
    const parsed = transactionReviewInputSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Une commande, une note entière de 1 à 5 et un commentaire de 10 à 2 000 caractères sont requis.",
      });
    const value = parsed.data;
    const order = await this.requireParticipant(value.transactionId, authorId);
    if (order.status !== "completed")
      throw new AppError({
        code: "CONFLICT",
        message: "La commande doit être terminée pour laisser un avis.",
      });
    const [author, listing] = await Promise.all([
      this.userRepo.findById(authorId),
      this.listingRepo.findById(order.listingId),
    ]);
    if (!author || !listing)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    // PostgreSQL locks the order and rechecks eligibility at the actual insert.
    return this.reviewRepo.save({
      id: randomUUID(),
      orderId: order.id,
      authorId,
      authorName: author.name,
      targetUserId: authorId === order.buyerId ? order.sellerId : order.buyerId,
      reviewerRole: authorId === order.buyerId ? "buyer" : "seller",
      rating: value.rating,
      comment: value.comment,
      listingTitle: listing.title,
      verifiedTransaction: true,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * The recipient's one public answer. Only the person the review is about
   * may answer; a 404 rather than a 403 keeps other people's reviews from
   * being probed by identifier.
   */
  async replyToReview(userId: string, reviewId: string, input: unknown) {
    const parsed = reviewReplySchema.safeParse(input);
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une réponse de 10 à 2 000 caractères est requise.",
      });
    const review = await this.reviewRepo.findById(reviewId);
    if (!review || review.removedAt || review.targetUserId !== userId)
      throw new AppError({ code: "NOT_FOUND", message: "Avis introuvable." });
    return this.reviewRepo.saveReply({
      reviewId,
      comment: parsed.data.comment,
      at: new Date().toISOString(),
    });
  }

  async markHelpful(
    userId: string,
    reviewId: string,
    input: unknown,
  ): Promise<components["schemas"]["ReviewHelpfulResult"]> {
    const parsed = reviewHelpfulSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Indiquez si l’avis vous a été utile.",
      });
    const helpfulCount = await this.reviewRepo.setHelpful({
      reviewId,
      userId,
      helpful: parsed.data.helpful,
    });
    return { reviewId, helpfulCount, viewerMarkedHelpful: parsed.data.helpful };
  }
}

export const reviewsService = new ReviewsService();
