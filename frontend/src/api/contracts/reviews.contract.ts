import { ReviewItem } from "../../types";
import type { components } from "@shongre/contracts/openapi";

export type SubmitReviewInput =
  components["schemas"]["SubmitTransactionReview"];
export interface OrderReviewEligibility {
  eligible: boolean;
  reason: "NOT_COMPLETED" | "ALREADY_REVIEWED" | null;
  review: ReviewItem | null;
}

export interface ReviewHelpfulResult {
  reviewId: string;
  helpfulCount: number;
  viewerMarkedHelpful: boolean;
}

export interface ReviewsServiceContract {
  getUserReviews(userId: string): Promise<ReviewItem[]>;
  getOrderEligibility(orderId: string): Promise<OrderReviewEligibility>;
  submitReview(input: SubmitReviewInput): Promise<ReviewItem>;
  /** The reviewed person's public answer; replaces a previous one. */
  replyToReview(reviewId: string, comment: string): Promise<ReviewItem>;
  /** States the caller's helpful vote; idempotent. */
  markHelpful(reviewId: string, helpful: boolean): Promise<ReviewHelpfulResult>;
}
