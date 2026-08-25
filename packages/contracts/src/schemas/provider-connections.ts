import { z } from "zod";

export const PROVIDER_CREDENTIAL_CONSTRAINTS = {
  minLength: 8,
} as const;

export const providerOwnerTypeSchema = z.enum(["PLATFORM", "TENANT", "USER"]);
export const providerFamilySchema = z.enum([
  "AI",
  "MAILBOX",
  "EMAIL_DELIVERY",
  "CALENDAR",
  "SMS",
  "CALLING",
  "PAYMENT",
  "OTHER",
]);
export const providerConnectionStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "DISABLED",
  "ERROR",
  "REVOKED",
]);

export const providerConnectionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  ownerType: providerOwnerTypeSchema,
  ownerId: z.string().uuid().optional(),
  providerId: z.string().trim().min(1).max(120),
  providerFamily: providerFamilySchema,
  displayName: z.string().trim().min(1).max(160),
  status: providerConnectionStatusSchema,
  configuration: z.record(z.string(), z.unknown()),
  capabilities: z.array(z.string().trim().min(1).max(160)),
  isDefault: z.boolean(),
  credentialConfigured: z.boolean(),
  credentialHint: z.string().max(32).optional(),
  lastValidatedAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  version: z.number().int().positive(),
});

export const providerConnectionInputSchema = z
  .object({
    ownerType: providerOwnerTypeSchema,
    providerId: z.string().trim().min(1).max(120),
    providerFamily: providerFamilySchema,
    displayName: z.string().trim().min(1).max(160),
    configuration: z.record(z.string(), z.unknown()).default({}),
    capabilities: z.array(z.string().trim().min(1).max(160)).min(1),
    isDefault: z.boolean().default(false),
    credential: z.string().min(8).max(16_384).optional(),
  })
  .strict();

export const providerResolutionRequestSchema = z.object({
  capability: z.string().trim().min(1).max(160),
  explicitConnectionId: z.string().uuid().optional(),
  feature: z.string().trim().min(1).max(160),
});

export const providerCredentialRotationSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    credential: z.string().min(8).max(16_384),
  })
  .strict();

export type ProviderOwnerType = z.infer<typeof providerOwnerTypeSchema>;
export type ProviderFamily = z.infer<typeof providerFamilySchema>;
export type ProviderConnection = z.infer<typeof providerConnectionSchema>;
export type ProviderConnectionInput = z.infer<
  typeof providerConnectionInputSchema
>;
export type ProviderResolutionRequest = z.infer<
  typeof providerResolutionRequestSchema
>;
export type ProviderCredentialRotation = z.infer<
  typeof providerCredentialRotationSchema
>;
