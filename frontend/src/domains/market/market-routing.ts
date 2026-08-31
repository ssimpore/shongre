import {
  buildMarketSwitchUrl,
  buildPublicUrl,
  getCountryConfig,
  resolveMarketContext,
  sanitizeMarketSwitchQuery,
  type MarketContext,
  type MarketInfrastructureConfig,
} from "@shongre/contracts";
import { marketInfrastructureFromPublicEnvironment } from "../../platform/market/market-infrastructure";

export function currentBrowserMarketCode(): string | null {
  if (typeof window === "undefined") return null;
  const context = resolveMarketContext({
    hostname: window.location.host,
    pathname: window.location.pathname,
    infrastructure: marketInfrastructureFromPublicEnvironment(),
    allowDevelopmentHosts: true,
  });
  return ["market", "coming_soon", "unavailable"].includes(context.kind)
    ? context.countryCode
    : null;
}

export { sanitizeMarketSwitchQuery } from "@shongre/contracts";

export function isDevelopmentMarketHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  );
}

export function currentRuntimeInternalPath(context: MarketContext): string {
  if (typeof window === "undefined") return context.internalPath;
  const pathname = window.location.pathname;
  if (
    context.routingBasePath !== "/" &&
    (pathname === context.routingBasePath ||
      pathname.startsWith(`${context.routingBasePath}/`))
  ) {
    return pathname.slice(context.routingBasePath.length) || "/";
  }
  return pathname || "/";
}

export function buildRuntimeMarketUrl(input: {
  targetCountry: string;
  context: MarketContext;
  routeExists?: boolean;
  infrastructure?: MarketInfrastructureConfig;
}): string {
  const internalPath =
    input.routeExists === false
      ? "/"
      : currentRuntimeInternalPath(input.context);

  if (
    typeof window !== "undefined" &&
    isDevelopmentMarketHost(window.location.hostname)
  ) {
    const country = getCountryConfig(input.targetCountry);
    if (!country) return "/";
    const query = sanitizeMarketSwitchQuery(
      new URLSearchParams(window.location.search),
    ).toString();
    const route = internalPath === "/" ? "" : internalPath;
    const suffix = query ? `?${query}` : "";
    if (country.isDefault)
      return `${window.location.origin}${route || "/"}${suffix}`;
    return `${window.location.origin}${country.basePath}${route || "/"}${suffix}`;
  }

  const query =
    typeof window === "undefined"
      ? undefined
      : sanitizeMarketSwitchQuery(new URLSearchParams(window.location.search));
  return buildMarketSwitchUrl({
    targetCountry: input.targetCountry,
    internalPath,
    query,
    routeExists: input.routeExists,
    infrastructure:
      input.infrastructure ?? marketInfrastructureFromPublicEnvironment(),
  });
}

export function publicListingUrl(input: {
  listingId: string;
  countryCode: string;
  infrastructure?: MarketInfrastructureConfig;
}): string {
  return buildPublicUrl({
    country: input.countryCode,
    route: `/annonce/${encodeURIComponent(input.listingId)}`,
    infrastructure:
      input.infrastructure ?? marketInfrastructureFromPublicEnvironment(),
  });
}

export function publicRouteUrl(input: {
  route: string;
  countryCode: string;
  infrastructure?: MarketInfrastructureConfig;
}): string {
  return buildPublicUrl({
    country: input.countryCode,
    route: input.route,
    infrastructure:
      input.infrastructure ?? marketInfrastructureFromPublicEnvironment(),
  });
}
