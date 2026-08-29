import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  CAPABILITIES,
  PROFESSIONAL_VERTICALS,
  STAFF_ROLES,
  STAFF_STATUSES,
} from "../access-control";

export const AUTH_CONSTRAINTS = {
  passwordMinLength: 6,
  phoneMinLength: 8,
  verificationCodeLength: 6,
  verificationCodeLifetimeMinutes: 10,
  verificationCodeMaxAttempts: 5,
  verificationCodeResendCooldownSeconds: 60,
  backupCodeCount: 8,
  reauthenticationLifetimeMinutes: 10,
} as const;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().min(1),
  accountType: z.enum(ACCOUNT_TYPES),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  professionalVertical: z.enum(PROFESSIONAL_VERTICALS).optional(),
  staffStatus: z.enum(STAFF_STATUSES).optional(),
  staffRole: z.enum(STAFF_ROLES).optional(),
  capabilities: z.array(z.enum(CAPABILITIES)).optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(AUTH_CONSTRAINTS.passwordMinLength),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export const verificationCodeSchema = z
  .string()
  .regex(new RegExp(`^\\d{${AUTH_CONSTRAINTS.verificationCodeLength}}$`));
export const authSessionSchema = z.object({
  user: authUserSchema,
  token: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  sessionId: z.string().min(1).optional(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;
