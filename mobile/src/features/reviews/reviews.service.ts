import { apiOperation } from "@/api/generated-api-operation";

/** Whether the signed-in participant may still review this order. */
export interface MobileReviewEligibility {
  eligible: boolean;
  reason: "NOT_COMPLETED" | "ALREADY_REVIEWED" | null;
  submittedRating: number | null;
}

export interface MobileReviewSubmission {
  orderId: string;
  rating: number;
  comment: string;
}

export const REVIEW_COMMENT_MIN_LENGTH = 10;
export const REVIEW_COMMENT_MAX_LENGTH = 2000;

interface BackendEligibility {
  eligible: boolean;
  reason: "NOT_COMPLETED" | "ALREADY_REVIEWED" | null;
  review: { rating?: number } | null;
}

export interface ReviewsService {
  eligibility(orderId: string): Promise<MobileReviewEligibility>;
  submit(input: MobileReviewSubmission): Promise<void>;
}

/**
 * The transaction review the Web order page collects, on the same
 * eligibility rule: one review per completed order, by a participant.
 */
export class HttpReviewsService implements ReviewsService {
  async eligibility(orderId: string): Promise<MobileReviewEligibility> {
    const result = (await apiOperation("getOrderReviewEligibility", {
      path: { id: orderId },
    })) as BackendEligibility;
    return {
      eligible: result.eligible,
      reason: result.reason,
      submittedRating: result.review?.rating ?? null,
    };
  }

  async submit(input: MobileReviewSubmission): Promise<void> {
    await apiOperation("postReviewsSubmit", {
      body: {
        transactionId: input.orderId,
        rating: input.rating,
        comment: input.comment.trim(),
      },
    });
  }
}

export const reviewsService: ReviewsService = new HttpReviewsService();
