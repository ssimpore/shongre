import {
  buildPublicUrl,
  getCountryConfigBySlug,
} from "@shongre/contracts";
import { marketInfrastructureFromEnvironment } from "../../../src/platform/market/server-market-context";

const INDEXABLE_PATHS = [
  "/",
  "/categories",
  "/collections",
  "/education",
  "/professionnels",
  "/solutions-pro",
  "/aide",
  "/securite",
  "/conditions-utilisation",
  "/confidentialite",
  "/mentions-legales",
  "/accessibilite",
] as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ country: string }> },
): Promise<Response> {
  const { country: slug } = await context.params;
  const country = getCountryConfigBySlug(slug);
  if (
    !country ||
    country.code === "FR" ||
    country.launchStatus !== "active" ||
    !country.marketplace.enabled ||
    !country.seo.indexable
  ) {
    return new Response("Not found", { status: 404 });
  }

  const infrastructure = marketInfrastructureFromEnvironment();
  const urls = INDEXABLE_PATHS.map((path) =>
    buildPublicUrl({ country: country.code, route: path, infrastructure }),
  );
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (url, index) =>
        `<url><loc>${escapeXml(url)}</loc><changefreq>${index === 0 ? "daily" : "weekly"}</changefreq><priority>${index === 0 ? "1.0" : "0.7"}</priority></url>`,
    ),
    "</urlset>",
  ].join("");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
