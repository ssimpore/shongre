import {
  ReviewsServiceContract,
  SubmitReviewInput,
  OrderReviewEligibility,
} from "../../contracts/reviews.contract";
import { httpClient } from "./http-client";
import { ReviewItem } from "../../../types";

export class HttpReviewsService implements ReviewsServiceContract {
  async getOrderEligibility(orderId: string): Promise<OrderReviewEligibility> {
    return httpClient.get<OrderReviewEligibility>(
      `/orders/${encodeURIComponent(orderId)}/review`,
    );
  }
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return httpClient.get<ReviewItem[]>(
      `/reviews/user/${encodeURIComponent(userId)}`,
    );
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    return httpClient.post<ReviewItem>("/reviews/submit", input);
  }
}

export const httpReviewsService = new HttpReviewsService();
