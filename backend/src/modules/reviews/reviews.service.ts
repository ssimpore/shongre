import { randomUUID } from "node:crypto";
import { transactionReviewInputSchema } from "@shongre/contracts/reviews";
import type { components } from "@shongre/contracts/openapi";
import { AppError } from "../../shared/errors/app-error.js";
import {
  repositories,
  type IReviewRepository,
  type IOrderRepository,
  type IUserRepository,
  type IListingRepository,
} from "../../infrastructure/database/repositories/index.js";

type SubmitReviewInput = components["schemas"]["SubmitTransactionReview"];

export class ReviewsService {
  constructor(
    private reviewRepo: IReviewRepository = repositories.reviews,
    private orderRepo: IOrderRepository = repositories.orders,
    private userRepo: IUserRepository = repositories.users,
    private listingRepo: IListingRepository = repositories.listings,
  ) {}

  getUserReviews(userId: string) {
    return this.reviewRepo.getUserReviews(userId);
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
      createdAt: new Date().toISOString(),
    });
  }
}

export const reviewsService = new ReviewsService();
