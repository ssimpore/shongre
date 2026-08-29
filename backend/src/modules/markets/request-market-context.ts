import type { IncomingMessage } from "node:http";
import {
  getCountryConfig,
  isLocal,
  isTest,
  resolveMarketContext,
} from "@shongre/contracts";
import type { MarketContext } from "@shongre/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { config } from "../../app/config/index.js";

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeMarket(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-z]{2}$/i.test(value.trim())) {
    return null;
  }
  return value.trim().toUpperCase();
}

function referencedMarkets(query: URLSearchParams, body: unknown): string[] {
  const values: unknown[] = [
    query.get("market"),
    query.get("country"),
    query.get("marketCode"),
  ];
  if (body && typeof body === "object") {
    const record = body as Record<string, any>;
    values.push(
      record.marketCode,
      record.country,
      record.countryCode,
      record.jurisdiction,
      record.query?.marketCode,
      record.draft?.marketCode,
      record.draft?.country,
      record.input?.marketCode,
    );
  }
  return [...new Set(values.map(normalizeMarket).filter(Boolean) as string[])];
}

function marketFromReferrer(req: IncomingMessage): string | null {
  const candidate = firstHeader(req.headers.referer);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const context = resolveMarketContext({
      hostname: url.host,
      pathname: url.pathname,
      infrastructure: config.marketInfrastructure,
      allowDevelopmentHosts:
        isLocal(config.environment.environment) ||
        isTest(config.environment.environment),
    });
    return context.kind === "market" || context.kind === "coming_soon"
      ? context.countryCode
      : null;
  } catch {
    return null;
  }
}

/**
 * Validates consistency; it never treats a browser header as authorization.
 * Domain choice, pricing, payment and compliance are still re-resolved from
 * the server-owned market configuration inside their domain services.
 */
export function resolveApiRequestMarket(input: {
  req: IncomingMessage;
  query: URLSearchParams;
  body: unknown;
}): string | null {
  const headerValue = firstHeader(input.req.headers["x-shongre-market"]);
  const headerMarket = normalizeMarket(headerValue);
  if (headerValue && !headerMarket) {
    logger.warn("Invalid market header rejected", {
      metric: "unknown_country",
      hostname: firstHeader(input.req.headers.host),
    });
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "En-tête de marché invalide.",
    });
  }
  const referrerMarket = marketFromReferrer(input.req);
  const explicitMarkets = referencedMarkets(input.query, input.body);
  const candidates = [headerMarket, referrerMarket, ...explicitMarkets].filter(
    Boolean,
  ) as string[];
  const distinct = [...new Set(candidates)];

  if (distinct.length > 1) {
    logger.warn("Market context mismatch rejected", {
      metric: "canonical_mismatch",
      headerMarket,
      referrerMarket,
      explicitMarkets,
    });
    throw new AppError({
      code: "CONFLICT",
      message: "Le marché de l’URL ne correspond pas à celui de la requête.",
    });
  }
  const marketCode = distinct[0] || null;
  if (marketCode && !getCountryConfig(marketCode)?.enabled) {
    logger.warn("Unknown market rejected", {
      metric: "unknown_country",
      market: marketCode,
      hostname: firstHeader(input.req.headers.host),
    });
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Marché inconnu ou désactivé.",
    });
  }
  if (marketCode) {
    const country = getCountryConfig(marketCode)!;
    logger.debug("Market context resolved", {
      country: marketCode,
      market: marketCode,
      locale: country.defaultLocale,
      currency: country.currency,
      canonicalDomainMode: country.canonicalDomainMode,
      hostname: firstHeader(input.req.headers.host),
    });
  }
  return marketCode;
}

export function requireOpenMarketplace(marketCode: string): void {
  const country = getCountryConfig(marketCode);
  if (
    !country ||
    !country.enabled ||
    !["active", "beta"].includes(country.launchStatus) ||
    !country.marketplace.enabled
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "Ce marché n’est pas encore ouvert.",
    });
  }
}

export function requireApiRequestMarket(marketCode: string | null): string {
  if (!marketCode) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message:
        "Un marché explicite est requis dans X-Shongre-Market ou dans la requête.",
    });
  }
  return marketCode;
}

export function requireOpenApiRequestMarket(marketCode: string | null): string {
  const resolved = requireApiRequestMarket(marketCode);
  requireOpenMarketplace(resolved);
  return resolved;
}

/**
 * Rebuilds the complete canonical context from the already cross-validated API
 * market code. Domain services receive MarketContext rather than a locale or a
 * France fallback, including for coming-soon markets that must fail closed.
 */
export function requireApiMarketContext(
  marketCode: string | null,
): MarketContext {
  const resolved = requireApiRequestMarket(marketCode);
  const country = getCountryConfig(resolved);
  if (!country) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Marché inconnu ou désactivé.",
    });
  }
  const hostname =
    country.canonicalDomainMode === "france"
      ? config.marketInfrastructure.franceDomain
      : config.marketInfrastructure.globalDomain;
  return resolveMarketContext({
    hostname,
    pathname: country.basePath,
    infrastructure: config.marketInfrastructure,
    allowDevelopmentHosts:
      isLocal(config.environment.environment) ||
      isTest(config.environment.environment),
  });
}
