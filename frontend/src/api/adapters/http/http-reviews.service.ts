import {
  ReviewsServiceContract,
  ReviewHelpfulResult,
  SubmitReviewInput,
  OrderReviewEligibility,
} from "../../contracts/reviews.contract";
import { apiOperation } from "./generated-api-operation";
import { ReviewItem } from "../../../types";

export class HttpReviewsService implements ReviewsServiceContract {
  async getOrderEligibility(orderId: string): Promise<OrderReviewEligibility> {
    return apiOperation<OrderReviewEligibility, "getOrderReviewEligibility">(
      "getOrderReviewEligibility",
      { path: { id: orderId } },
    );
  }
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return apiOperation<ReviewItem[], "getReviewsUserByUserId">(
      "getReviewsUserByUserId",
      { path: { userId: userId } },
    );
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    return apiOperation<ReviewItem, "postReviewsSubmit">("postReviewsSubmit", {
      body: input,
    });
  }

  async replyToReview(reviewId: string, comment: string): Promise<ReviewItem> {
    return apiOperation<ReviewItem, "postReviewsByIdReply">(
      "postReviewsByIdReply",
      { path: { id: reviewId }, body: { comment } },
    );
  }

  async markHelpful(
    reviewId: string,
    helpful: boolean,
  ): Promise<ReviewHelpfulResult> {
    return apiOperation<ReviewHelpfulResult, "putReviewsByIdHelpful">(
      "putReviewsByIdHelpful",
      { path: { id: reviewId }, body: { helpful } },
    );
  }
}

export const httpReviewsService = new HttpReviewsService();
