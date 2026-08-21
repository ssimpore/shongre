import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.PRODUCTION_WEB_URL ?? "https://shongre.com";
  return [
    "/",
    "/categories",
    "/collections",
    "/professionnels",
    "/solutions-pro",
    "/aide",
    "/securite",
    "/conditions-utilisation",
    "/confidentialite",
    "/mentions-legales",
    "/accessibilite",
  ].map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
