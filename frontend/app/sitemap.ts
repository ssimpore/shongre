import type { MetadataRoute } from "next";
import { buildPublicUrl, COUNTRY_REGISTRY } from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  resolveServerMarketContext,
} from "../src/platform/market/server-market-context";

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

function entriesForCountry(countryCode: string): MetadataRoute.Sitemap {
  const infrastructure = marketInfrastructureFromEnvironment();
  return INDEXABLE_PATHS.map((path) => ({
    url: buildPublicUrl({ country: countryCode, route: path, infrastructure }),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const context = await resolveServerMarketContext("/");
  if (context.kind === "market") {
    return entriesForCountry(context.countryCode ?? "FR");
  }

  const infrastructure = marketInfrastructureFromEnvironment();
  const gatewayUrl = `${infrastructure.canonicalProtocol}://${infrastructure.globalDomain}/`;
  return [
    {
      url: gatewayUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...COUNTRY_REGISTRY.filter(
      (country) =>
        country.primaryDomain === infrastructure.globalDomain &&
        country.launchStatus === "active" &&
        country.marketplace.enabled &&
        country.seo.indexable,
    ).map((country) => ({
      url: buildPublicUrl({ country: country.code, infrastructure }),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}
