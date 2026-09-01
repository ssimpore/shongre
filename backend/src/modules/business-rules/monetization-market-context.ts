import { getCountryConfig, type MarketContext } from "@shongre/contracts";
import type { MonetizationCatalog } from "@shongre/contracts/monetization";
import { AppError } from "../../shared/errors/app-error.js";

export type MonetizationMarketOperation = "read" | "paid" | "admin";

/**
 * Validates the canonical context before commercial policy is resolved. This
 * deliberately keeps country, locale, currency and timezone as distinct
 * dimensions instead of reconstructing a market from any one of them.
 */
export function requireMonetizationMarketContext(
  context: MarketContext,
  operation: MonetizationMarketOperation = "read",
) {
  const countryCode = context.countryCode;
  const country = countryCode ? getCountryConfig(countryCode) : undefined;
  const validResolution =
    operation === "admin"
      ? context.kind === "market" || context.kind === "coming_soon"
      : context.kind === "market";

  if (
    !validResolution ||
    !country ||
    !country.enabled ||
    context.country?.code !== country.code ||
    context.market !== country.marketCode ||
    context.currency !== country.currency ||
    context.timezone !== country.timezone ||
    !context.locale ||
    !country.supportedLocales.includes(context.locale)
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "Le contexte commercial du marché est invalide.",
      details: { reasonCode: "MONETIZATION_MARKET_CONTEXT_INVALID" },
    });
  }

  if (
    operation === "paid" &&
    (!country.monetization.enabled ||
      !country.marketplace.enabled ||
      !["active", "beta"].includes(country.launchStatus) ||
      !country.capabilities.payments)
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "Les opérations payantes ne sont pas disponibles sur ce marché.",
      details: { reasonCode: "MONETIZATION_MARKET_NOT_READY" },
    });
  }

  return {
    context,
    country,
    marketCode: country.marketCode,
    countryCode: country.code,
    locale: context.locale,
    currency: country.currency,
    timezone: country.timezone,
  } as const;
}

export function requireCatalogForMarketContext<
  T extends Pick<
    MonetizationCatalog,
    "marketCode" | "currency" | "products" | "stale"
  >,
>(
  catalog: T,
  context: MarketContext,
  operation: MonetizationMarketOperation = "read",
): T {
  const market = requireMonetizationMarketContext(context, operation);
  const inconsistentPrice = catalog.products
    .flatMap((product) => product.prices)
    .find((price) => price.amount.currency !== market.currency);

  if (
    catalog.marketCode !== market.marketCode ||
    catalog.currency !== market.currency ||
    inconsistentPrice
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "Le catalogue commercial ne correspond pas au marché actif.",
      details: { reasonCode: "COMMERCIAL_CATALOG_MARKET_MISMATCH" },
    });
  }
  if (operation === "paid" && catalog.stale) {
    throw new AppError({
      code: "CONFLICT",
      message: "Le catalogue commercial doit être actualisé avant paiement.",
      details: { reasonCode: "COMMERCIAL_CATALOG_STALE" },
    });
  }
  return catalog;
}
