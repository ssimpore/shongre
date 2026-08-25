import { getCountryConfig } from "@shongre/contracts";
import { AppError } from "../errors/app-error.js";

/**
 * Normalizes a market identifier at a domain or persistence boundary. Country
 * behavior must never be selected through an implicit France fallback.
 */
export function requireMarketCode(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z]{2}$/i.test(value.trim())) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Un code marché explicite est requis.",
    });
  }
  const marketCode = value.trim().toUpperCase();
  const country = getCountryConfig(marketCode);
  if (!country?.enabled) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Marché inconnu ou désactivé.",
    });
  }
  return marketCode;
}
