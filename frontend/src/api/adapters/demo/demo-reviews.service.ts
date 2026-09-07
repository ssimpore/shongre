import type {
  ReviewsServiceContract,
  SubmitReviewInput,
  OrderReviewEligibility,
} from "../../contracts/reviews.contract";
import { transactionReviewInputSchema } from "@shongre/contracts/reviews";
import { userRepository } from "../../../repositories/user.repository";
import { storageService } from "../../../services/storage.service";
import type { ReviewItem } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { requireDemoCapability } from "./demo-authorization";

export class DemoReviewsService implements ReviewsServiceContract {
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    requireDemoCapability("listing.read");
    await simulateNetworkDelay();
    return userRepository.getReviewsForUser(userId);
  }

  private participantOrder(orderId: string) {
    const user = requireDemoCapability("review.create");
    const order = storageService
      .getTransactions()
      .find((order) => order.id === orderId);
    if (
      !user ||
      !order ||
      ![order.buyerId, order.sellerId].includes(user.id) ||
      order.buyerId === order.sellerId
    )
      throw new Error("Commande introuvable.");
    return { user, order };
  }

  async getOrderEligibility(orderId: string): Promise<OrderReviewEligibility> {
    await simulateNetworkDelay();
    const { user, order } = this.participantOrder(orderId);
    const review = storageService.getOrderReview(order.id, user.id);
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

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    const parsed = transactionReviewInputSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(
        "Une note de 1 à 5 et un commentaire de 10 à 2 000 caractères sont requis.",
      );
    const actorId = this.participantOrder(parsed.data.transactionId).user.id;
    await simulateNetworkDelay();
    const { user, order } = this.participantOrder(parsed.data.transactionId);
    if (actorId !== user.id)
      throw new Error(
        "Le compte actif a changé. Réessayez depuis votre compte.",
      );
    if (order.status !== "completed")
      throw new Error("La commande doit être terminée pour laisser un avis.");
    const { comment, rating } = parsed.data;
    return userRepository.addReview(
      {
        targetUserId:
          user.id === order.buyerId ? order.sellerId : order.buyerId,
        authorId: user.id,
        authorName: user.name,
        rating,
        comment,
        listingTitle: order.listingTitle,
        verifiedTransaction: true,
        reviewerRole: user.id === order.buyerId ? "buyer" : "seller",
      },
      order.id,
    );
  }
}

export const demoReviewsService = new DemoReviewsService();
