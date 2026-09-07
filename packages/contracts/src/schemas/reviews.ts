import { z } from "zod";

export const REVIEW_CONSTRAINTS = {
  commentMinLength: 10,
  commentMaxLength: 2_000,
  transactionIdMaxLength: 200,
  ratingMin: 1,
  ratingMax: 5,
} as const;

/** Runtime validation, checked against the canonical OpenAPI request schema. */
export const transactionReviewInputSchema = z
  .object({
    transactionId: z
      .string()
      .min(1)
      .max(REVIEW_CONSTRAINTS.transactionIdMaxLength),
    rating: z
      .number()
      .int()
      .min(REVIEW_CONSTRAINTS.ratingMin)
      .max(REVIEW_CONSTRAINTS.ratingMax),
    comment: z
      .string()
      .trim()
      .min(REVIEW_CONSTRAINTS.commentMinLength)
      .max(REVIEW_CONSTRAINTS.commentMaxLength),
  })
  .strict();
