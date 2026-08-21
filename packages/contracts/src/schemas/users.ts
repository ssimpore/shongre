import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sellerType: z.enum(["individual", "pro"]),
  city: z.string().optional(),
  isIdentityVerified: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
