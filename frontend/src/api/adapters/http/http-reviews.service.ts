import {
  ReviewsServiceContract,
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
}

export const httpReviewsService = new HttpReviewsService();
