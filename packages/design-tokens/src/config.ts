import { themeColors } from "./theme.ts";

/**
 * Build-time tokens used by native application configuration before Metro is
 * running. This deliberately depends only on the canonical token source so
 * splash and app-shell colours cannot drift from runtime UI colours.
 */
export const configColors = {
  surface: themeColors["bg-surface"],
  brand: themeColors.primary,
} as const;
