import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().min(1),
  accountType: z.enum(["individual", "professional", "internal"]),
});
export type AuthUser = z.infer<typeof authUserSchema>;
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export const authSessionSchema = z.object({
  user: authUserSchema,
  token: z.string().min(1),
});
export type AuthSession = z.infer<typeof authSessionSchema>;
