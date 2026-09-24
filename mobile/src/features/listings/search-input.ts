import { deterministicUuid } from "@shongre/shared/deterministic-id";

export function mobileSavedSearchTargetId(input: {
  marketCode: string;
  query: string;
  locale: string;
  categoryId?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
}): string {
  return `mobile-${deterministicUuid(
    "saved-search",
    JSON.stringify({
      marketCode: input.marketCode,
      query: input.query.trim().toLocaleLowerCase(input.locale),
      categoryId: input.categoryId ?? null,
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
): MobileSearchPriceRange {
  const minimum = minimumInput.trim()
    ? Number(minimumInput.replace(",", "."))
    : undefined;
  const maximum = maximumInput.trim()
    ? Number(maximumInput.replace(",", "."))
    : undefined;
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
