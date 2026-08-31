import type { LocationSelection } from "../../types";

export interface LocationSelectorValue {
  city?: string;
  radiusKm?: number;
}

const isCountryWide = (selection: LocationSelection) =>
  selection.city.startsWith("Tout") || selection.city.startsWith("Toute");

export const locationSelectorValueFromSelection = (
  selection: LocationSelection,
): LocationSelectorValue => ({
  city: isCountryWide(selection) ? undefined : selection.city,
  radiusKm: selection.radiusKm > 0 ? selection.radiusKm : undefined,
});
