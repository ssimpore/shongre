import { z } from "zod";

export const accountDeletionRequestSchema = z.object({
  password: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type AccountDeletionRequest = z.infer<
  typeof accountDeletionRequestSchema
>;
