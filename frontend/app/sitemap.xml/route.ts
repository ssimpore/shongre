import { buildPublicUrl, COUNTRY_REGISTRY } from "@shongre/contracts";
import {
  productionSitemapsEnabled,
  renderMarketSitemap,
  resolveSitemapMarketContext,
  sitemapNotFound,
  sitemapXmlResponse,
} from "../../src/platform/seo/sitemap-route.server";
import { renderSitemapIndex } from "../../src/platform/seo/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!productionSitemapsEnabled()) return sitemapNotFound();
  const context = resolveSitemapMarketContext(request, "/");
  if (context.kind === "market") return renderMarketSitemap(context);
  if (context.kind !== "global_gateway") return sitemapNotFound();

  const enabledCountries = COUNTRY_REGISTRY.filter(
    (country) =>
      country.canonicalDomainMode === "international" &&
      country.enabled &&
      country.marketplace.enabled &&
      country.seo.indexable &&
      country.compliance.legalReviewStatus === "approved" &&
      ["active", "beta"].includes(country.launchStatus),
  );
  const gatewaySitemap = `${context.infrastructure.canonicalProtocol}://${context.infrastructure.globalDomain}/gateway-sitemap.xml`;
  return sitemapXmlResponse(
    renderSitemapIndex([
      gatewaySitemap,
      ...enabledCountries.map((country) =>
        buildPublicUrl({
          country: country.code,
          route: "/sitemap.xml",
          infrastructure: context.infrastructure,
        }),
      ),
    ]),
  );
}
