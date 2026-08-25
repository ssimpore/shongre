import {
  buildMarketSwitchUrl,
  buildPublicUrl,
  getCountryConfig,
  resolveMarketContext,
  type MarketContext,
  type MarketInfrastructureConfig,
} from "@shongre/contracts";

export function currentBrowserMarketCode(): string | null {
  if (typeof window === "undefined") return null;
  const context = resolveMarketContext({
    hostname: window.location.host,
    pathname: window.location.pathname,
    allowDevelopmentHosts: true,
  });
  return context.kind === "market" || context.kind === "coming_soon"
    ? context.countryCode
    : null;
}

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
  infrastructure?: Partial<MarketInfrastructureConfig>;
}): string {
  const internalPath =
    input.routeExists === false
      ? "/"
      : currentRuntimeInternalPath(input.context);

  if (typeof window !== "undefined" && isDevelopmentMarketHost(window.location.hostname)) {
    const country = getCountryConfig(input.targetCountry);
    if (!country) return "/";
    const query = window.location.search;
    const hash = window.location.hash;
    const route = internalPath === "/" ? "" : internalPath;
    if (country.code === "FR") return `${window.location.origin}${route || "/"}${query}${hash}`;
    return `${window.location.origin}${country.basePath}${route || "/"}${query}${hash}`;
  }

  const query =
    typeof window === "undefined"
      ? undefined
      : new URLSearchParams(window.location.search);
  return buildMarketSwitchUrl({
    targetCountry: input.targetCountry,
    internalPath,
    query,
    routeExists: input.routeExists,
    infrastructure: input.infrastructure,
  });
}

export function publicListingUrl(input: {
  listingId: string;
  countryCode: string;
  infrastructure?: Partial<MarketInfrastructureConfig>;
}): string {
  return buildPublicUrl({
    country: input.countryCode,
    route: `/annonce/${encodeURIComponent(input.listingId)}`,
    infrastructure: input.infrastructure,
  });
}

export function publicRouteUrl(input: {
  route: string;
  countryCode: string;
  infrastructure?: Partial<MarketInfrastructureConfig>;
}): string {
  return buildPublicUrl({
    country: input.countryCode,
    route: input.route,
    infrastructure: input.infrastructure,
  });
}
