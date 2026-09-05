import type { MetadataRoute } from "next";
import { isProduction } from "@shongre/contracts";
import { resolveServerMarketContext } from "../src/platform/market/server-market-context";
import { webEnvironmentFromEnvironment } from "../src/platform/market/market-infrastructure";
import {
  buildDiscoveryRobotsRules,
  parseModelTrainingCrawlerPolicy,
} from "../src/platform/seo/discovery-governance";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const environment = webEnvironmentFromEnvironment();
  if (!isProduction(environment.environment)) {
    return {
      rules: buildDiscoveryRobotsRules({ production: false }),
    };
  }
  const context = await resolveServerMarketContext("/");
  if (context.kind !== "market" && context.kind !== "global_gateway") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: buildDiscoveryRobotsRules({
      production: true,
      trainingPolicy: parseModelTrainingCrawlerPolicy(
        process.env.SEO_GPTBOT_TRAINING_POLICY,
      ),
    }),
    sitemap: new URL("/sitemap.xml", context.canonicalUrl).toString(),
  };
}
