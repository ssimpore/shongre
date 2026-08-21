import { ReviewItem } from "../../types";

export interface SubmitReviewInput {
  targetUserId: string;
  authorId: string;
  authorName?: string;
  rating: number;
  comment: string;
  listingTitle?: string;
  listingId?: string;
  transactionId?: string;
}

export interface ReviewsServiceContract {
  getUserReviews(userId: string): Promise<ReviewItem[]>;
  submitReview(input: SubmitReviewInput): Promise<ReviewItem>;
}
