import type { MetadataRoute } from "next";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  isProduction,
} from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  resolveServerMarketContext,
} from "../src/platform/market/server-market-context";
import { webEnvironmentFromEnvironment } from "../src/platform/market/market-infrastructure";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const environment = webEnvironmentFromEnvironment();
  if (!isProduction(environment.environment)) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  const context = await resolveServerMarketContext("/");
  const globalSitemap = new URL(
    "/sitemap.xml",
    environment.urls.internationalApp,
  ).toString();
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
      globalSitemap,
      ...COUNTRY_REGISTRY.filter(
        (country) =>
          country.canonicalDomainMode === "international" &&
          country.basePath !== "/" &&
          country.launchStatus === "active" &&
          country.marketplace.enabled &&
          country.seo.indexable,
      ).map((country) => buildMarketSitemapUrl(country.code)),
    ],
  };
}

function buildMarketSitemapUrl(countryCode: string): string {
  const infrastructure = marketInfrastructureFromEnvironment();
  const country = COUNTRY_REGISTRY.find((entry) => entry.code === countryCode);
  if (!country) {
    return new URL(
      "/sitemap.xml",
      webEnvironmentFromEnvironment().urls.internationalApp,
    ).toString();
  }
  return buildPublicUrl({
    country: country.code,
    route: "/sitemap.xml",
    infrastructure,
  });
}
