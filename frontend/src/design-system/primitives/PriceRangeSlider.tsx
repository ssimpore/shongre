import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

/**
 * The scale is a list of stops, not a linear span.
 *
 * A marketplace that lists a 10 € book and a 345 000 € apartment cannot use one
 * linear slider: at 0–500 000 the entire second-hand catalogue lives inside the
 * first two pixels of the track. Stepping through named stops keeps the
 * resolution where the listings actually are — 10 € apart under 100 €, and
 * coarser as the numbers grow — so every drag lands on a round, sayable price.
 *
 * The final stop is the open end: selected as the maximum it means "and above",
 * and no `maxPrice` is written to the query at all.
 */
const FIRST_STOP_INDEX = 0;
const STOP_INDEX_STEP = 1;

/** Nearest stop index at or below `value`, so a URL price always maps onto the scale. */
function indexForValue(
  stops: number[],
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  let best = FIRST_STOP_INDEX;
  for (let i = FIRST_STOP_INDEX; i < stops.length; i += STOP_INDEX_STEP) {
    if (stops[i] <= value) best = i;
  }
  return best;
}

export interface PriceRangeSliderProps {
  /** Current lower bound, or undefined for "no minimum". */
  min?: number;
  /** Current upper bound, or undefined for "no maximum". */
  max?: number;
  /** Fired when the user finishes a drag or key press, not on every pixel. */
  onChange: (next: { min?: number; max?: number }) => void;
  currencySymbol?: string;
  className?: string;
}

/**
 * Two-handle price filter.
 *
 * Built from two native `<input type="range">` elements rather than a custom
 * drag surface: the browser gives arrow-key stepping, Home/End, touch handling
 * and a screen-reader announcement of each handle's value for free, which a
 * div-and-pointer-events implementation would have to rebuild and usually
 * doesn't. The inputs are stacked over one shared track; only the thumbs take
 * pointer events, so the two can overlap without either becoming unreachable.
 */
export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  onChange,
  currencySymbol,
  className = "",
}) => {
  const { t } = useTranslation();
  const {
    currentLocale,
    currencySymbol: marketCurrencySymbol,
    effectiveConfig,
  } = useMarketLocation();
  const stops = effectiveConfig.search.priceFilterStopsMajor;
  const lastStopIndex = stops.length - STOP_INDEX_STEP;
  const resolvedCurrencySymbol = currencySymbol || marketCurrencySymbol;
  /**
   * The handles are driven by local state and only reported upward on release.
   *
   * `onChange` on a range input fires on every step of a drag. Reporting each
   * one straight to the caller — which writes the query string and re-runs the
   * search — meant one drag across the track queued dozens of refetches and
   * history entries, and the handle visibly lagged the pointer because every
   * render waited on that round trip. Local state keeps the drag at pointer
   * speed; the caller hears one value, when the user lets go.
   */
  const [draft, setDraft] = useState(() => ({
    low: indexForValue(stops, min, FIRST_STOP_INDEX),
    high:
      max === undefined
        ? lastStopIndex
        : indexForValue(stops, max, lastStopIndex),
  }));

  // Resync when the range changes from outside — clearing filters, back/forward.
  useEffect(() => {
    setDraft({
      low: indexForValue(stops, min, FIRST_STOP_INDEX),
      high:
        max === undefined
          ? lastStopIndex
          : indexForValue(stops, max, lastStopIndex),
    });
  }, [lastStopIndex, max, min, stops]);

  const lowIndex = draft.low;
  const highIndex = draft.high;

  const format = (value: number) =>
    `${value.toLocaleString(currentLocale)} ${resolvedCurrencySymbol}`;

  const label = useMemo(() => {
    if (lowIndex === FIRST_STOP_INDEX && highIndex === lastStopIndex)
      return t("ui.priceRangeSlider.allPrices");
    if (lowIndex === FIRST_STOP_INDEX)
      return t("ui.priceRangeSlider.upTo", {
        price: format(stops[highIndex]),
      });
    if (highIndex === lastStopIndex)
      return t("ui.priceRangeSlider.from", {
        price: format(stops[lowIndex]),
      });
    return `${format(stops[lowIndex])} – ${format(stops[highIndex])}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentLocale,
    highIndex,
    lastStopIndex,
    lowIndex,
    resolvedCurrencySymbol,
    stops,
    t,
  ]);

  const report = (low: number, high: number) => {
    onChange({
      min: low === FIRST_STOP_INDEX ? undefined : stops[low],
      max: high === lastStopIndex ? undefined : stops[high],
    });
  };

  /** Applies a new range immediately — used by "Réinitialiser", which has no release. */
  const commit = (low: number, high: number) => {
    setDraft({ low, high });
    report(low, high);
  };

  /** Pushes the current draft up. Wired to every way a control can be released. */
  const release = () => report(draft.low, draft.high);

  // Handles cannot cross: each one stops one stop short of the other.
  const handleLow = (raw: number) =>
    setDraft((d) => ({
      ...d,
      low: Math.min(raw, d.high - STOP_INDEX_STEP),
    }));
  const handleHigh = (raw: number) =>
    setDraft((d) => ({
      ...d,
      high: Math.max(raw, d.low + STOP_INDEX_STEP),
    }));

  const thumb =
    "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 w-full appearance-none bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none " +
    "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full " +
    "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary " +
    "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 " +
    "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-grab " +
    "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:outline-2 " +
    "[&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-primary";

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-bold text-stone-900 tabular-nums">
          {label}
        </span>
        {(lowIndex !== FIRST_STOP_INDEX || highIndex !== lastStopIndex) && (
          <button
            type="button"
            onClick={() => commit(FIRST_STOP_INDEX, lastStopIndex)}
            className="text-micro font-semibold text-stone-500 hover:text-primary transition-colors cursor-pointer shrink-0"
          >
            {t("ui.priceRangeSlider.reinitialiser")}
          </button>
        )}
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-pill bg-bg-muted" />

        <input
          type="range"
          min={FIRST_STOP_INDEX}
          max={lastStopIndex}
          step={STOP_INDEX_STEP}
          value={lowIndex}
          onChange={(e) => handleLow(Number(e.target.value))}
          onPointerUp={release}
          onTouchEnd={release}
          onKeyUp={release}
          onBlur={release}
          aria-label={t("ui.priceRangeSlider.minimumPrice")}
          aria-valuetext={
            lowIndex === FIRST_STOP_INDEX
              ? t("ui.priceRangeSlider.noMinimum")
              : format(stops[lowIndex])
          }
          className={thumb}
        />
        <input
          type="range"
          min={FIRST_STOP_INDEX}
          max={lastStopIndex}
          step={STOP_INDEX_STEP}
          value={highIndex}
          onChange={(e) => handleHigh(Number(e.target.value))}
          onPointerUp={release}
          onTouchEnd={release}
          onKeyUp={release}
          onBlur={release}
          aria-label={t("ui.priceRangeSlider.maximumPrice")}
          aria-valuetext={
            highIndex === lastStopIndex
              ? t("ui.priceRangeSlider.noMaximum")
              : format(stops[highIndex])
          }
          className={thumb}
        />
      </div>

      <div className="flex items-center justify-between text-micro text-stone-500 tabular-nums">
        <span>{format(stops[FIRST_STOP_INDEX])}</span>
        <span>{format(stops[lastStopIndex])}+</span>
      </div>
    </div>
  );
};
