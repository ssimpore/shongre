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
