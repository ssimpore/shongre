import "server-only";
import { headers } from "next/headers";
import {
  isLocal,
  isTest,
  resolveMarketContext,
  type MarketContext,
} from "@shongre/contracts";
import {
  applicationFallbackForPath,
  applicationIdForHostname,
  createApplicationRegistry,
  type ShongreApplicationId,
} from "./application-registry";
import {
  marketInfrastructureFromEnvironment,
  webEnvironmentFromEnvironment,
} from "../market/market-infrastructure";

export interface ServerApplicationContext {
  applicationId: Exclude<ShongreApplicationId, "marketplace">;
  applicationPath: string;
  routingBasePath: string;
  marketContext: MarketContext;
  canonicalOrigin: string;
}

export function applicationRegistryFromEnvironment() {
  const environment = webEnvironmentFromEnvironment();
  return createApplicationRegistry({
    environment: environment.environment,
    marketplaceOrigin:
      process.env.SHONGRE_MARKETPLACE_ORIGIN ||
      environment.urls.franceApp.origin,
    origins: {
      solutions: process.env.SHONGRE_SOLUTIONS_ORIGIN,
      prospects: process.env.SHONGRE_PROSPECTS_ORIGIN,
      facturation: process.env.SHONGRE_FACTURATION_ORIGIN,
    },
  });
}

export async function resolveServerApplicationContext(
  pathname = "/",
): Promise<ServerApplicationContext | null> {
  const requestHeaders = await headers();
  const hostname =
    requestHeaders.get("x-shongre-resolved-host") ||
    requestHeaders.get("host") ||
    "";
  const registry = applicationRegistryFromEnvironment();
  const hostnameApplicationId = applicationIdForHostname(hostname, registry);
  const fallback = applicationFallbackForPath(registry, pathname);
  const applicationId =
    hostnameApplicationId && hostnameApplicationId !== "marketplace"
      ? hostnameApplicationId
      : fallback?.applicationId;
  if (!applicationId) return null;

  const environment = webEnvironmentFromEnvironment();
  const infrastructure = marketInfrastructureFromEnvironment();
  const marketContext = resolveMarketContext({
    hostname: infrastructure.franceDomain,
    pathname: "/",
    infrastructure,
    allowDevelopmentHosts:
      isLocal(environment.environment) || isTest(environment.environment),
  });
  if (marketContext.kind !== "market") {
    throw new Error(
      "[Application Routing] France market context is unavailable.",
    );
  }
  return {
    applicationId,
    applicationPath: fallback?.applicationPath || pathname,
    routingBasePath: fallback?.routingBasePath || "/",
    marketContext,
    canonicalOrigin: registry[applicationId].origin,
  };
}
