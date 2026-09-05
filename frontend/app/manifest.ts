import type { MetadataRoute } from "next";
import { brand } from "@shongre/brand";
import { webBrandAssets } from "@shongre/brand/web";
import { colors } from "@shongre/design-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: "Petites annonces pour particuliers et professionnels.",
    start_url: "/",
    display: "standalone",
    background_color: colors.brand.background,
    theme_color: colors.brand.primary,
    icons: webBrandAssets.pwa.icons.map(({ src, sizes, type, purpose }) => ({
      src,
      sizes,
      type,
      purpose,
    })),
  };
}
