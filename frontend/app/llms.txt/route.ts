import { buildPublicUrl, getDefaultCountryConfig } from "@shongre/contracts";
import {
  productionSitemapsEnabled,
  resolveSitemapMarketContext,
  sitemapNotFound,
} from "../../src/platform/seo/sitemap-route.server";
import { renderDiscoveryManifest } from "../../src/platform/seo/discovery-governance";
import { DISCOVERY_PUBLIC_PATHS } from "../../src/platform/seo/discovery-structured-data";
import { isSeoMarketEnabled } from "../../src/platform/seo/seo-policy";

export const dynamic = "force-dynamic";

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: Request): Promise<Response> {
  if (!productionSitemapsEnabled()) return sitemapNotFound();
  const context = resolveSitemapMarketContext(request, "/");
  if (
    context.kind !== "global_gateway" &&
    (context.kind !== "market" || !isSeoMarketEnabled(context))
  ) {
    return sitemapNotFound();
  }

  const countryCode =
    context.kind === "market"
      ? context.countryCode!
      : getDefaultCountryConfig().code;
  const publicUrl = (path: string) =>
    buildPublicUrl({
      country: countryCode,
      route: path,
      infrastructure: context.infrastructure,
    });
  const canonicalSite = publicUrl("/");
  const sitemap =
    context.kind === "global_gateway"
      ? new URL("/sitemap.xml", context.canonicalUrl).toString()
      : publicUrl("/sitemap.xml");
  const links = [
    ["About SHONGRE.", DISCOVERY_PUBLIC_PATHS.about],
    ["Categories", DISCOVERY_PUBLIC_PATHS.categories],
    ["Professional sellers", DISCOVERY_PUBLIC_PATHS.professionals],
    ["Help center", DISCOVERY_PUBLIC_PATHS.help],
    ["Safety", DISCOVERY_PUBLIC_PATHS.safety],
    ["Contact", DISCOVERY_PUBLIC_PATHS.contact],
    ["Legal notice", DISCOVERY_PUBLIC_PATHS.legal],
    ["Privacy", DISCOVERY_PUBLIC_PATHS.privacy],
    ["Terms", DISCOVERY_PUBLIC_PATHS.terms],
    ["Accessibility", DISCOVERY_PUBLIC_PATHS.accessibility],
  ].map(([label, path]) => ({ label, url: publicUrl(path) }));

  return new Response(
    renderDiscoveryManifest({ canonicalSite, sitemap, links }),
    {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
