import type { MetadataRoute } from "next";
import { COUNTRY_REGISTRY } from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  resolveServerMarketContext,
} from "../src/platform/market/server-market-context";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const infrastructure = marketInfrastructureFromEnvironment();
  const context = await resolveServerMarketContext("/");
  const globalOrigin = `${infrastructure.canonicalProtocol}://${infrastructure.globalDomain}`;
  const marketOrigin =
    context.kind === "market"
      ? buildMarketSitemapUrl(context.countryCode ?? "FR")
      : null;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/compte/", "/messages", "/deposer"],
      },
    ],
    sitemap: marketOrigin ?? [
      `${globalOrigin}/sitemap.xml`,
      ...COUNTRY_REGISTRY.filter(
        (country) =>
          country.primaryDomain === infrastructure.globalDomain &&
          country.basePath !== "/" &&
          country.launchStatus === "active" &&
          country.marketplace.enabled &&
          country.seo.indexable,
      ).map((country) => `${globalOrigin}${country.basePath}/sitemap.xml`),
    ],
  };
}

function buildMarketSitemapUrl(countryCode: string): string {
  const infrastructure = marketInfrastructureFromEnvironment();
  const country = COUNTRY_REGISTRY.find((entry) => entry.code === countryCode);
  if (!country)
    return `${infrastructure.canonicalProtocol}://${infrastructure.globalDomain}/sitemap.xml`;
  const domain =
    country.code === "FR"
      ? infrastructure.franceDomain
      : infrastructure.globalDomain;
  const basePath = country.code === "FR" ? "" : country.basePath;
  return `${infrastructure.canonicalProtocol}://${domain}${basePath}/sitemap.xml`;
}
