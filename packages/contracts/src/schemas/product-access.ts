import { z } from "zod";

export const shongreProductIdSchema = z.enum([
  "marketplace",
  "prospects",
  "facturation",
]);

export const organizationProductAccessModeSchema = z.enum([
  "STANDALONE",
  "ADD_ON",
  "BUNDLED",
  "INTERNAL_SHONGRE",
]);

export const organizationProductAccessStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancellation_pending",
  "cancelled",
  "expired",
  "not_entitled",
]);

export const organizationProductAccessSchema = z.object({
  organizationId: z.string().min(1).max(160),
  productId: shongreProductIdSchema,
  entitlementKey: z.string().min(1).max(160),
  status: organizationProductAccessStatusSchema,
  accessMode: organizationProductAccessModeSchema,
  planName: z.string().min(1).max(180),
  source: z.enum([
    "subscription",
    "trial",
    "complimentary_grant",
    "bundle",
    "internal",
  ]),
  activatedAt: z.string().datetime({ offset: true }).optional(),
  currentPeriodEndsAt: z.string().datetime({ offset: true }).optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  seats: z.number().int().positive().default(1),
  capabilities: z.array(z.string()).default([]),
});

export const organizationProductPortfolioSchema = z.object({
  organizationId: z.string().min(1).max(160),
  products: z.array(organizationProductAccessSchema),
});

export type ShongreProductId = z.infer<typeof shongreProductIdSchema>;
export type OrganizationProductAccessMode = z.infer<
  typeof organizationProductAccessModeSchema
>;
export type OrganizationProductAccessStatus = z.infer<
  typeof organizationProductAccessStatusSchema
>;
export type OrganizationProductAccess = z.infer<
  typeof organizationProductAccessSchema
>;
export type OrganizationProductPortfolio = z.infer<
  typeof organizationProductPortfolioSchema
>;

const PRODUCT_ACCESS_STATUSES = new Set<OrganizationProductAccessStatus>([
  "trialing",
  "active",
  "cancellation_pending",
]);

export function isOrganizationProductAccessActive(
  access: Pick<OrganizationProductAccess, "status">,
): boolean {
  return PRODUCT_ACCESS_STATUSES.has(access.status);
}

export function hasOrganizationProductAccess(
  portfolio: Pick<OrganizationProductPortfolio, "products">,
  productId: ShongreProductId,
): boolean {
  return portfolio.products.some(
    (access) =>
      access.productId === productId &&
      isOrganizationProductAccessActive(access),
  );
}

export function isStandaloneProductPortfolio(
  portfolio: Pick<OrganizationProductPortfolio, "products">,
  productId: Exclude<ShongreProductId, "marketplace">,
): boolean {
  const activeProducts = portfolio.products.filter(
    isOrganizationProductAccessActive,
  );
  return (
    activeProducts.length === 1 && activeProducts[0]?.productId === productId
  );
}
