import {
  buildMarketSwitchUrl,
  buildPublicUrl,
  getCountryConfig,
  getDefaultCountryConfig,
  resolveMarketContext,
  sanitizeMarketSwitchQuery,
  type MarketContext,
  type MarketInfrastructureConfig,
} from "@shongre/contracts/market-country";
import {
  applicationIdForHostname,
  type ShongreApplicationRegistry,
} from "../../platform/applications/application-registry";
import { marketInfrastructureFromPublicEnvironment } from "../../platform/market/market-infrastructure";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";

/**
 * The market a browser request must declare. A market host answers for its
 * own country; a product origin (Prospects, Facturation) is not a market host
 * at all and operates the default market, exactly as the server resolves it
 * for those applications — without this the product's own workspace calls
 * carried no market and the API refused them.
 */
export function browserMarketCodeFor(input: {
  hostname: string;
  pathname: string;
  infrastructure: MarketInfrastructureConfig;
  applications: ShongreApplicationRegistry;
}): string | null {
  const context = resolveMarketContext({
    hostname: input.hostname,
    pathname: input.pathname,
    infrastructure: input.infrastructure,
    allowDevelopmentHosts: true,
  });
  if (["market", "coming_soon", "unavailable"].includes(context.kind)) {
    return context.countryCode;
  }
  const applicationId = applicationIdForHostname(
    input.hostname,
    input.applications,
  );
  return applicationId && applicationId !== "marketplace"
    ? getDefaultCountryConfig().code
    : null;
}

export function currentBrowserMarketCode(): string | null {
  if (typeof window === "undefined") return null;
  return browserMarketCodeFor({
    hostname: window.location.host,
    pathname: window.location.pathname,
    infrastructure: marketInfrastructureFromPublicEnvironment(),
    applications: getPublicRuntimeConfig().applications,
  });
}

export { sanitizeMarketSwitchQuery } from "@shongre/contracts/market-country";

function isDevelopmentMarketHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  );
}

export function crossesProductionMarketOrigin(input: {
  currentOrigin: string;
  currentHostname: string;
  destination: string;
}): boolean {
  return (
    !isDevelopmentMarketHost(input.currentHostname) &&
    new URL(input.destination, input.currentOrigin).origin !==
      new URL(input.currentOrigin).origin
  );
}

export function shouldUseAuthenticatedMarketHandoff(input: {
  isAuthenticated: boolean;
  currentOrigin: string;
  currentHostname: string;
  destination: string;
}): boolean {
  return input.isAuthenticated && crossesProductionMarketOrigin(input);
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
