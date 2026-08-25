import { z } from "zod";

export const MODERATION_CONSTRAINTS = {
  appealReasonMinLength: 20,
  appealReviewReasonMinLength: 10,
  appealReasonMaxLength: 5_000,
} as const;

export const reportInputSchema = z
  .object({
    listingId: z.string().optional(),
    reportedUserId: z.string().optional(),
    reason: z.enum([
      "fraud",
      "counterfeit",
      "prohibited",
      "harassment",
      "other",
    ]),
    details: z.string().min(10).max(2000),
  })
  .refine((value) => Boolean(value.listingId || value.reportedUserId), {
    message: "A listing or user target is required.",
  });
export type ReportInput = z.infer<typeof reportInputSchema>;
