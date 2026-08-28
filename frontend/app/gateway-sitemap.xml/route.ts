import {
  productionSitemapsEnabled,
  resolveSitemapMarketContext,
  sitemapNotFound,
  sitemapXmlResponse,
} from "../../src/platform/seo/sitemap-route.server";
import { renderUrlSet } from "../../src/platform/seo/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!productionSitemapsEnabled()) return sitemapNotFound();
  const context = resolveSitemapMarketContext(request, "/");
  if (context.kind !== "global_gateway") return sitemapNotFound();
  return sitemapXmlResponse(renderUrlSet([{ url: context.canonicalUrl }]));
}
