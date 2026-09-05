import { colors } from "@shongre/design-tokens";

export { brandDocumentLogoDataUri } from "./document.generated";

export const brand = {
  name: "SHONGRE.",
  signature: "SHONGRE.",
  version: "1.0.0",
  primaryColor: colors.brand.primary,
  inkColor: colors.brand.ink,
  backgroundColor: colors.brand.background,
} as const;
