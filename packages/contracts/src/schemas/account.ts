import { z } from "zod";

export const ACCOUNT_CONSTRAINTS = {
  deletionReasonMaxLength: 500,
} as const;

export const accountDeletionRequestSchema = z.object({
  password: z.string().min(1),
  reason: z
    .string()
    .max(ACCOUNT_CONSTRAINTS.deletionReasonMaxLength)
    .optional(),
});
export type AccountDeletionRequest = z.infer<
  typeof accountDeletionRequestSchema
>;
