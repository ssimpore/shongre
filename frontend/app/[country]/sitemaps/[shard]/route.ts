import { getCountryConfigBySlug } from "@shongre/contracts";
import {
  renderMarketSitemap,
  resolveSitemapMarketContext,
  sitemapNotFound,
} from "../../../../src/platform/seo/sitemap-route.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  routeContext: { params: Promise<{ country: string; shard: string }> },
): Promise<Response> {
  const { country: slug, shard } = await routeContext.params;
  const country = getCountryConfigBySlug(slug);
  if (!country || country.canonicalDomainMode !== "international") {
    return sitemapNotFound();
  }
  const context = resolveSitemapMarketContext(
    request,
    `/${country.slug}/sitemaps/${shard}.xml`,
  );
  if (
    context.kind !== "market" ||
    context.countryCode !== country.code ||
    context.hostname !== context.infrastructure.globalDomain
  ) {
    return sitemapNotFound();
  }
  return renderMarketSitemap(context, shard);
}
