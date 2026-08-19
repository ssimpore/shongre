import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

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
const STOPS = [
  0, 10, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1_000, 1_500,
  2_000, 3_000, 5_000, 7_500, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 200_000, 350_000, 500_000,
] as const;

const LAST = STOPS.length - 1;

/** Nearest stop index at or below `value`, so a URL price always maps onto the scale. */
function indexForValue(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  let best = 0;
  for (let i = 0; i < STOPS.length; i++) {
    if (STOPS[i] <= value) best = i;
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
  currencySymbol = '€',
  className = '',
}) => {
  const { t } = useTranslation();
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
    low: indexForValue(min, 0),
    high: max === undefined ? LAST : indexForValue(max, LAST),
  }));

  // Resync when the range changes from outside — clearing filters, back/forward.
  useEffect(() => {
    setDraft({
      low: indexForValue(min, 0),
      high: max === undefined ? LAST : indexForValue(max, LAST),
    });
  }, [min, max]);

  const lowIndex = draft.low;
  const highIndex = draft.high;

  const format = (value: number) =>
    `${value.toLocaleString('fr-FR')} ${currencySymbol}`;

  const label = useMemo(() => {
    if (lowIndex === 0 && highIndex === LAST) return 'Tous les prix';
    if (lowIndex === 0) return `Jusqu'à ${format(STOPS[highIndex])}`;
    if (highIndex === LAST) return `À partir de ${format(STOPS[lowIndex])}`;
    return `${format(STOPS[lowIndex])} – ${format(STOPS[highIndex])}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowIndex, highIndex, currencySymbol]);

  const report = (low: number, high: number) => {
    onChange({
      min: low === 0 ? undefined : STOPS[low],
      max: high === LAST ? undefined : STOPS[high],
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
    setDraft((d) => ({ ...d, low: Math.min(raw, d.high - 1) }));
  const handleHigh = (raw: number) =>
    setDraft((d) => ({ ...d, high: Math.max(raw, d.low + 1) }));

  const leftPct = (lowIndex / LAST) * 100;
  const rightPct = (highIndex / LAST) * 100;

  const thumb =
    'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 w-full appearance-none bg-transparent ' +
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
    '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ' +
    '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary ' +
    '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 ' +
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 ' +
    '[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-grab ' +
    'focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:outline-2 ' +
    '[&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-primary';

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-bold text-stone-900 tabular-nums">{label}</span>
        {(lowIndex !== 0 || highIndex !== LAST) && (
          <button
            type="button"
            onClick={() => commit(0, LAST)}
            className="text-micro font-semibold text-stone-500 hover:text-primary transition-colors cursor-pointer shrink-0"
          >{t('ui.priceRangeSlider.reinitialiser')}</button>
        )}
      </div>

      <div className="relative h-8">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-pill bg-bg-muted" />
        {/* Selected span */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-pill bg-primary"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          min={0}
          max={LAST}
          step={1}
          value={lowIndex}
          onChange={(e) => handleLow(Number(e.target.value))}
          onPointerUp={release}
          onTouchEnd={release}
          onKeyUp={release}
          onBlur={release}
          aria-label="Prix minimum"
          aria-valuetext={lowIndex === 0 ? 'Aucun minimum' : format(STOPS[lowIndex])}
          className={thumb}
        />
        <input
          type="range"
          min={0}
          max={LAST}
          step={1}
          value={highIndex}
          onChange={(e) => handleHigh(Number(e.target.value))}
          onPointerUp={release}
          onTouchEnd={release}
          onKeyUp={release}
          onBlur={release}
          aria-label="Prix maximum"
          aria-valuetext={highIndex === LAST ? 'Aucun maximum' : format(STOPS[highIndex])}
          className={thumb}
        />
      </div>

      <div className="flex items-center justify-between text-micro text-stone-500 tabular-nums">
        <span>{format(STOPS[0])}</span>
        <span>{format(STOPS[LAST])}+</span>
      </div>
    </div>
  );
};
