import type { MetadataRoute } from "next";
import { colors } from "@shongre/design-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shongre",
    short_name: "Shongre",
    description: "Petites annonces pour particuliers et professionnels.",
    start_url: "/",
    display: "standalone",
    background_color: colors.surface.default,
    theme_color: colors.action.primary,
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
