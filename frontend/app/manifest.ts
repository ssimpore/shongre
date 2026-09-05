import type { MetadataRoute } from "next";
import { colors } from "@shongre/design-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHONGRE.",
    short_name: "SHONGRE.",
    description: "Petites annonces pour particuliers et professionnels.",
    start_url: "/",
    display: "standalone",
    background_color: colors.brand.background,
    theme_color: colors.brand.primary,
    icons: [
      {
        src: "/brand/shongre/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/shongre/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/shongre/pwa/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/shongre/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
