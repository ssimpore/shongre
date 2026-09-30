import React, { useEffect, useRef, useState } from "react";
import { parseMajorAmountInput } from "@shongre/shared/money";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { FormField, Input } from "./FormField";

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
  const [draft, setDraft] = useState<{ min?: number; max?: number }>({
    min,
    max,
  });
  const draftRef = useRef(draft);
  const committed = useRef(draft);
  const dirty = useRef(false);
  const numericDirty = useRef(false);
  const [minimumInput, setMinimumInput] = useState(
    min?.toLocaleString(currentLocale, {
      useGrouping: false,
      maximumFractionDigits: 20,
    }) ?? "",
  );
  const [maximumInput, setMaximumInput] = useState(
    max?.toLocaleString(currentLocale, {
      useGrouping: false,
      maximumFractionDigits: 20,
    }) ?? "",
  );
  const [inputError, setInputError] = useState("");

  // Resync when the range changes from outside — clearing filters, back/forward.
  useEffect(() => {
    const next = { min, max };
    draftRef.current = next;
    committed.current = next;
    dirty.current = false;
    numericDirty.current = false;
    setDraft(next);
    setMinimumInput(
      min?.toLocaleString(currentLocale, {
        useGrouping: false,
        maximumFractionDigits: 20,
      }) ?? "",
    );
    setMaximumInput(
      max?.toLocaleString(currentLocale, {
        useGrouping: false,
        maximumFractionDigits: 20,
      }) ?? "",
    );
    setInputError("");
  }, [currentLocale, max, min]);

  const lowIndex = indexForValue(stops, draft.min, FIRST_STOP_INDEX);
  const highIndex = indexForValue(stops, draft.max, lastStopIndex);

  const format = (value: number) =>
    `${value.toLocaleString(currentLocale, { maximumFractionDigits: 20 })} ${resolvedCurrencySymbol}`;

  const label =
    draft.min === undefined && draft.max === undefined
      ? t("ui.priceRangeSlider.allPrices")
      : draft.min === undefined
        ? t("ui.priceRangeSlider.upTo", { price: format(draft.max!) })
        : draft.max === undefined
          ? t("ui.priceRangeSlider.from", { price: format(draft.min) })
          : `${format(draft.min)} – ${format(draft.max)}`;

  const change = (next: { min?: number; max?: number }) => {
    draftRef.current = next;
    numericDirty.current = false;
    dirty.current =
      next.min !== committed.current.min || next.max !== committed.current.max;
    setDraft(next);
    setMinimumInput(
      next.min?.toLocaleString(currentLocale, {
        useGrouping: false,
        maximumFractionDigits: 20,
      }) ?? "",
    );
    setMaximumInput(
      next.max?.toLocaleString(currentLocale, {
        useGrouping: false,
        maximumFractionDigits: 20,
      }) ?? "",
    );
    setInputError("");
  };

  /** Report each completed edit once, even when release is followed by blur. */
  const release = () => {
    if (!dirty.current) return;
    dirty.current = false;
    committed.current = draftRef.current;
    onChange(draftRef.current);
  };
  const commitInputs = () => {
    if (!numericDirty.current) return;
    const nextMin = parseMajorAmountInput(minimumInput, currentLocale);
    const nextMax = parseMajorAmountInput(maximumInput, currentLocale);
    if (
      (nextMin !== undefined && !Number.isFinite(nextMin)) ||
      (nextMax !== undefined && !Number.isFinite(nextMax)) ||
      (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax)
    ) {
      setInputError(t("ui.priceRangeSlider.invalidRange"));
      return;
    }
    change({ min: nextMin, max: nextMax });
    release();
  };
  const cancel = () => change(committed.current);
  const handleLow = (raw: number) =>
    change({
      ...draftRef.current,
      min:
        raw === FIRST_STOP_INDEX
          ? undefined
          : Math.min(stops[raw], draftRef.current.max ?? Infinity),
    });
  const handleHigh = (raw: number) =>
    change({
      ...draftRef.current,
      max:
        raw === lastStopIndex
          ? undefined
          : Math.max(stops[raw], draftRef.current.min ?? 0),
    });

  const thumb =
    "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 w-full appearance-none bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none " +
    "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full " +
    "[&::-webkit-slider-thumb]:bg-bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary " +
    "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-surface [&::-moz-range-thumb]:border-2 " +
    "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-grab " +
    "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:outline-2 " +
    "[&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-primary";

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-bold text-text-main tabular-nums">
          {label}
        </span>
        {(draft.min !== undefined || draft.max !== undefined) && (
          <button
            type="button"
            onClick={() => {
              change({ min: undefined, max: undefined });
              release();
            }}
            className="text-micro font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer shrink-0"
          >
            {t("ui.priceRangeSlider.reinitialiser")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField
          label={t("ui.priceRangeSlider.minimumPrice")}
          error={inputError}
        >
          <Input
            inputMode="decimal"
            value={minimumInput}
            onChange={(event) => {
              numericDirty.current = true;
              setMinimumInput(event.target.value);
            }}
            onBlur={commitInputs}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitInputs();
              }
              if (event.key === "Escape") cancel();
            }}
          />
        </FormField>
        <FormField
          label={t("ui.priceRangeSlider.maximumPrice")}
          error={inputError}
        >
          <Input
            inputMode="decimal"
            value={maximumInput}
            onChange={(event) => {
              numericDirty.current = true;
              setMaximumInput(event.target.value);
            }}
            onBlur={commitInputs}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitInputs();
              }
              if (event.key === "Escape") cancel();
            }}
          />
        </FormField>
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
          onKeyUp={(event) => (event.key === "Escape" ? cancel() : release())}
          onBlur={release}
          aria-label={t("ui.priceRangeSlider.minimumPrice")}
          aria-valuetext={
            draft.min === undefined
              ? t("ui.priceRangeSlider.noMinimum")
              : format(draft.min)
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
          onKeyUp={(event) => (event.key === "Escape" ? cancel() : release())}
          onBlur={release}
          aria-label={t("ui.priceRangeSlider.maximumPrice")}
          aria-valuetext={
            draft.max === undefined
              ? t("ui.priceRangeSlider.noMaximum")
              : format(draft.max)
          }
          className={thumb}
        />
      </div>

      <div className="flex items-center justify-between text-micro text-text-muted tabular-nums">
        <span>{format(stops[FIRST_STOP_INDEX])}</span>
        <span>{format(stops[lastStopIndex])}+</span>
      </div>
    </div>
  );
};
