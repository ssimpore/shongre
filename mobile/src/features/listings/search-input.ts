import { parseMajorAmountInput } from "@shongre/shared/money";
import { deterministicUuid } from "@shongre/shared/deterministic-id";

export function mobileSavedSearchTargetId(input: {
  marketCode: string;
  query: string;
  locale: string;
  categoryId?: string;
  city?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
}): string {
  return `mobile-${deterministicUuid(
    "saved-search",
    JSON.stringify({
      marketCode: input.marketCode,
      query: input.query.trim().toLocaleLowerCase(input.locale),
      categoryId: input.categoryId ?? null,
      ...(input.city?.trim()
        ? { city: input.city.trim().toLocaleLowerCase(input.locale) }
        : {}),
      minPriceMinor: input.minPriceMinor ?? null,
      maxPriceMinor: input.maxPriceMinor ?? null,
    }),
  )}`;
}

export interface MobileSearchPriceRange {
  minimum?: number;
  maximum?: number;
  minimumError: string;
  maximumError: string;
}

export function parseMobileSearchPriceRange(
  minimumInput: string,
  maximumInput: string,
  locale = "fr-FR",
): MobileSearchPriceRange {
  const minimum = parseMajorAmountInput(minimumInput, locale);
  const maximum = parseMajorAmountInput(maximumInput, locale);
  const minimumInvalid =
    minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0);
  const maximumInvalid =
    maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0);
  const inverted =
    !minimumInvalid &&
    !maximumInvalid &&
    minimum !== undefined &&
    maximum !== undefined &&
    minimum > maximum;

  return {
    minimum,
    maximum,
    minimumError: minimumInvalid
      ? "Saisissez un prix minimum valide."
      : inverted
        ? "Le prix minimum doit être inférieur au maximum."
        : "",
    maximumError: maximumInvalid
      ? "Saisissez un prix maximum valide."
      : inverted
        ? "Le prix maximum doit être supérieur au minimum."
        : "",
  };
}
