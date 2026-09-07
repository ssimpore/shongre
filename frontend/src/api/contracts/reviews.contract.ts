import { ReviewItem } from "../../types";
import type { components } from "@shongre/contracts/openapi";

export type SubmitReviewInput =
  components["schemas"]["SubmitTransactionReview"];
export interface OrderReviewEligibility {
  eligible: boolean;
  reason: "NOT_COMPLETED" | "ALREADY_REVIEWED" | null;
  review: ReviewItem | null;
}

export interface ReviewsServiceContract {
  getUserReviews(userId: string): Promise<ReviewItem[]>;
  getOrderEligibility(orderId: string): Promise<OrderReviewEligibility>;
  submitReview(input: SubmitReviewInput): Promise<ReviewItem>;
}
