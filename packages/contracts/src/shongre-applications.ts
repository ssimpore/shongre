import { z } from "zod";

/**
 * Stable identifiers for the separately deployed Shongre Web applications.
 * Runtime origins remain environment-owned and are deliberately not part of
 * this public registry.
 */
export const SHONGRE_APPLICATION_IDS = [
  "marketplace",
  "solutions",
  "prospects",
  "facturation",
] as const;

export const shongreApplicationIdSchema = z.enum(SHONGRE_APPLICATION_IDS);
export type ShongreApplicationId = z.infer<typeof shongreApplicationIdSchema>;

/**
 * Path prefix each application answers on when it shares the marketplace
 * origin, which is how local, test, and selected preview environments deploy
 * them. Production gives every application a distinct origin and serves it at
 * the root instead.
 */
export const SHONGRE_APPLICATION_FALLBACK_PATHS: Readonly<
  Record<ShongreApplicationId, string>
> = Object.freeze({
  marketplace: "/",
  solutions: "/solutions",
  prospects: "/prospects",
  facturation: "/facturation",
});
