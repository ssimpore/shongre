import { z } from "zod";

export const MODERATION_CONSTRAINTS = {
  appealReasonMinLength: 20,
  appealReviewReasonMinLength: 10,
  appealReasonMaxLength: 5_000,
  reportDetailsMinLength: 10,
  reportDetailsMaxLength: 2_000,
} as const;

export const reportInputSchema = z
  .object({
    listingId: z.string().optional(),
    reportedUserId: z.string().optional(),
    deliveryRequestId: z.string().uuid().optional(),
    reason: z.enum([
      "fraud",
      "counterfeit",
      "prohibited",
      "harassment",
      "other",
    ]),
    details: z
      .string()
      .min(MODERATION_CONSTRAINTS.reportDetailsMinLength)
      .max(MODERATION_CONSTRAINTS.reportDetailsMaxLength),
  })
  .refine(
    (value) =>
      Boolean(
        value.listingId || value.reportedUserId || value.deliveryRequestId,
      ),
    { message: "A listing, user, or delivery request target is required." },
  )
  .refine(
    (value) =>
      [value.listingId, value.reportedUserId, value.deliveryRequestId].filter(
        Boolean,
      ).length === 1,
    { message: "A report must target exactly one resource." },
  );
export type ReportInput = z.infer<typeof reportInputSchema>;
