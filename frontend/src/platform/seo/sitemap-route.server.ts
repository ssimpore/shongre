import "server-only";
import {
  buildPublicUrl,
  isProduction,
  resolveMarketContext,
  type MarketContext,
} from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  webEnvironmentFromEnvironment,
} from "../market/market-infrastructure";
import { isSeoMarketEnabled } from "./seo-policy";
import { buildMarketSitemapGroups } from "./sitemap-catalog.server";
import {
  parseShardId,
  partitionSitemapGroups,
  renderSitemapIndex,
  renderUrlSet,
  sitemapNeedsIndex,
} from "./sitemap-xml";

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export function sitemapXmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sitemapNotFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export function productionSitemapsEnabled(): boolean {
  return isProduction(webEnvironmentFromEnvironment().environment);
}

export function resolveSitemapMarketContext(
  request: Request,
  pathname: string,
): MarketContext {
  const headers = request.headers;
  const hostname =
    headers.get("x-shongre-resolved-host") ||
    headers.get("host") ||
    new URL(request.url).host;
  return resolveMarketContext({
    hostname,
    pathname,
    infrastructure: marketInfrastructureFromEnvironment(),
    allowDevelopmentHosts: false,
  });
}

function shardUrl(context: MarketContext, id: string, page: number): string {
  return buildPublicUrl({
    country: context.countryCode!,
    route: `/sitemaps/${id}-${page}.xml`,
    infrastructure: context.infrastructure,
  });
}

export async function renderMarketSitemap(
  context: MarketContext,
  requestedShard?: string,
): Promise<Response> {
  if (!productionSitemapsEnabled() || !isSeoMarketEnabled(context)) {
    return sitemapNotFound();
  }
  const groups = await buildMarketSitemapGroups(context);
  const shards = partitionSitemapGroups(groups);

  if (requestedShard) {
    const parsed = parseShardId(requestedShard);
    const shard = parsed
      ? shards.find(
          (candidate) =>
            candidate.id === parsed.id && candidate.page === parsed.page,
        )
      : null;
    return shard
      ? sitemapXmlResponse(renderUrlSet(shard.entries))
      : sitemapNotFound();
  }

  if (sitemapNeedsIndex(groups)) {
    return sitemapXmlResponse(
      renderSitemapIndex(
        shards.map((shard) => shardUrl(context, shard.id, shard.page)),
      ),
    );
  }
  return sitemapXmlResponse(
    renderUrlSet(groups.flatMap((group) => group.entries)),
  );
}
