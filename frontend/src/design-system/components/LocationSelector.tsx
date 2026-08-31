import React from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { LocationSelection } from "../../types";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";
import {
  locationSelectorValueFromSelection,
  type LocationSelectorValue,
} from "./location-selector.model";

export type { LocationSelectorValue } from "./location-selector.model";

export interface LocationSelectorProps extends LocationSelectorValue {
  id: string;
  variant?: "header" | "minimal" | "search-page" | "field" | "hero";
  className?: string;
  onChange?: (value: LocationSelectorValue) => void;
}

const variantClasses: Record<
  NonNullable<LocationSelectorProps["variant"]>,
  string
> = {
  header:
    "hidden xl:flex h-full max-w-27.5 min-w-0 shrink items-center gap-1.5 border-l border-border-base px-3.5 text-xs font-medium text-stone-700 hover:bg-bg-subtle 2xl:max-w-45 focus:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
  minimal:
    "h-control-md w-full items-center justify-between rounded-control border border-border-base bg-bg-base px-2.5 text-xs font-semibold text-stone-700 hover:bg-bg-subtle",
  "search-page":
    "hidden h-control-touch max-w-full items-center gap-1.5 rounded-control border border-border-base bg-bg-base px-3.5 text-xs font-semibold text-stone-700 hover:bg-bg-subtle sm:flex sm:max-w-48",
  field:
    "h-control-touch w-full items-center justify-between rounded-control border border-border-base bg-bg-surface px-3 text-xs font-semibold text-text-main hover:border-border-hover hover:bg-bg-subtle",
  hero: "h-control-touch max-w-full shrink-0 items-center justify-between gap-2 rounded-control border border-border-base bg-bg-base px-3.5 text-xs font-semibold text-stone-700 hover:border-border-hover hover:bg-bg-subtle active:bg-bg-muted md:max-w-50 md:justify-start",
};

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  id,
  city,
  radiusKm,
  variant = "field",
  className = "",
  onChange,
}) => {
  const { activeMarket, location, popularCities, openLocationModal } =
    useMarketLocation();
  const isControlled = city !== undefined || radiusKm !== undefined;
  const controlledCity = city?.trim() || "";
  const wholeCountryLabel = `Toute la ${activeMarket.name}`;
  const displayCity = isControlled
    ? controlledCity || wholeCountryLabel
    : location.label;
  const displayLabel =
    controlledCity && radiusKm && radiusKm > 0
      ? `${controlledCity} (+${radiusKm} km)`
      : displayCity;

  const handleOpen = () => {
    const popularCity = popularCities.find(
      (candidate) =>
        candidate.name.toLocaleLowerCase() ===
        controlledCity.toLocaleLowerCase(),
    );
    const initialLocation: LocationSelection = isControlled
      ? controlledCity
        ? {
            city: controlledCity,
            postalCode: popularCity?.postalCode || "",
            department: popularCity?.department || "",
            region: popularCity?.region || "",
            radiusKm: radiusKm || 0,
            label: displayLabel,
          }
        : {
            city: wholeCountryLabel,
            postalCode: "",
            radiusKm: 0,
            label: wholeCountryLabel,
          }
      : location;

    openLocationModal({
      initialLocation,
      onApply: (nextLocation) =>
        onChange?.(locationSelectorValueFromSelection(nextLocation)),
    });
  };

  return (
    <button
      id={id}
      type="button"
      data-location-selector="true"
      aria-haspopup="dialog"
      aria-label={`Localisation : ${displayLabel}`}
      onClick={handleOpen}
      className={`flex min-w-0 cursor-pointer ${variantClasses[variant]} ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} ${className}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <MapPin
          className="h-icon-sm w-icon-sm shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="truncate whitespace-nowrap">{displayLabel}</span>
      </span>
      {variant !== "header" ? (
        <ChevronDown
          className="ml-auto h-icon-xs w-icon-xs shrink-0 text-text-disabled"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
};
