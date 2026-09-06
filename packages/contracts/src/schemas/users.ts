import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sellerType: z.enum(["individual", "pro"]),
  avatarUrl: z.string().url().optional(),
  city: z.string().optional(),
  isIdentityVerified: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  organizationName: z.string().min(1).optional(),
  organizationLogoUrl: z.string().url().optional(),
  branchName: z.string().min(1).optional(),
  isBusinessVerified: z.boolean().default(false),
  /** Public, aggregate seller responsiveness copy supplied by the owning domain. */
  responseTimeLabel: z.string().trim().min(1).max(160).optional(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/**
 * Public self-service profile fields. Account state, roles, Staff membership,
 * permissions and verification are deliberately absent and have dedicated
 * server-authoritative workflows.
 */
export const userProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().url().max(2_048).optional(),
    phone: z.string().trim().min(8).max(32).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    postalCode: z.string().trim().min(1).max(20).optional(),
    department: z.string().trim().min(1).max(120).optional(),
    region: z.string().trim().min(1).max(120).optional(),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    bio: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Au moins un champ de profil modifiable est requis.",
  });
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;

/**
 * Self-service transition from an Individual account to a Professional one.
 * Verification state and product entitlements are intentionally absent: the
 * backend creates the legal organization in a pending/unverified state and no
 * client can grant itself a badge, plan, or privileged capability.
 */
export const professionalAccountUpgradeSchema = z
  .object({
    companyName: z.string().trim().min(1).max(255),
    businessIdentifier: z.string().trim().min(4).max(40),
    legalForm: z.string().trim().min(1).max(100),
    vatNumber: z.string().trim().max(30).optional(),
    businessAddress: z.string().trim().min(1).max(500),
    phone: z.string().trim().min(8).max(32).optional(),
  })
  .strict();
export type ProfessionalAccountUpgrade = z.infer<
  typeof professionalAccountUpgradeSchema
>;
