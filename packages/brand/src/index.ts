import { colors } from "@shongre/design-tokens";
import { activeBrand } from "./active.generated";

export const brand = {
  name: activeBrand.signature,
  signature: activeBrand.signature,
  version: activeBrand.version,
  cacheKey: activeBrand.cacheKey,
  primaryColor: colors.brand.primary,
  inkColor: colors.brand.ink,
  backgroundColor: colors.brand.background,
} as const;
