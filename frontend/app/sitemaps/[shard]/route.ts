import {
  renderMarketSitemap,
  resolveSitemapMarketContext,
  sitemapNotFound,
} from "../../../src/platform/seo/sitemap-route.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  routeContext: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const context = resolveSitemapMarketContext(request, "/");
  if (
    context.kind !== "market" ||
    context.country?.canonicalDomainMode !== "france" ||
    context.hostname !== context.infrastructure.franceDomain
  ) {
    return sitemapNotFound();
  }
  const { shard } = await routeContext.params;
  return renderMarketSitemap(context, shard);
}
