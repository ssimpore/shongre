import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.PRODUCTION_WEB_URL ?? "https://shongre.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/compte/", "/messages", "/deposer"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
