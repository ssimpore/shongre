import type { MetadataRoute } from "next";
import { isProduction } from "@shongre/contracts";
import { resolveServerMarketContext } from "../src/platform/market/server-market-context";
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
  if (context.kind !== "market" && context.kind !== "global_gateway") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: new URL("/sitemap.xml", context.canonicalUrl).toString(),
  };
}
