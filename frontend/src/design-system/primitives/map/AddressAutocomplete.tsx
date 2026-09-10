import React, { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  GEO_LIMITS,
  type GeocodingResult,
} from "@shongre/contracts/geospatial";
import type { MarketContext } from "@shongre/contracts/market-country";
import { services } from "../../../api/client/service-registry";

export interface AddressAutocompleteProps {
  marketContext: MarketContext;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (result: GeocodingResult) => void;
  locale?: string;
  placeholder?: string;
  /** Announced while a lookup is in flight and when nothing matched. */
  labels: {
    searching: string;
    noResults: string;
    resultsAvailable: (count: number) => string;
    unavailable: string;
  };
  disabled?: boolean;
  id?: string;
}

/** Long enough for a request to be worth its share of a shared rate limit. */
const DEBOUNCE_MS = 350;

/**
 * Address search, spending as little of a shared provider's budget as possible.
 *
 * Four things stand between a keystroke and an upstream request, and each one
 * exists because the provider's usage policy is a real constraint rather than a
 * nicety: a minimum length, a debounce, a sequence guard that discards a reply
 * that arrived after a newer one, and the platform's own cache behind the API.
 * A request per keystroke, per visitor, is how a free geocoder revokes access.
 *
 * The pattern is an ARIA 1.2 combobox with a listbox popup: the input keeps
 * focus and keyboard events throughout, and the active option is pointed at by
 * `aria-activedescendant` rather than actually focused, so a screen reader
 * announces the option while typing continues to work.
 */
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  marketContext,
  label,
  value,
  onValueChange,
  onSelect,
  locale,
  placeholder,
  labels,
  disabled = false,
  id,
}) => {
  const generatedId = useId();
  const controlId = id ?? `address-autocomplete-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const statusId = `${controlId}-status`;

  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [state, setState] = useState<"idle" | "searching" | "unavailable">(
    "idle",
  );
  /* Monotonic: a reply whose number is behind the latest request is stale, and
     rendering it would put an older answer over a newer one. */
  const requestRef = useRef(0);
  const suppressNextSearchRef = useRef(false);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < GEO_LIMITS.addressQuery.minLength) {
      setResults([]);
      setIsOpen(false);
      setState("idle");
      return;
    }

    const sequence = ++requestRef.current;
    setState("searching");
    const timer = setTimeout(() => {
      void services.geo
        .suggestAddresses({ marketContext, query, locale })
        .then((found) => {
          if (sequence !== requestRef.current) return;
          setResults(found);
          setActiveIndex(-1);
          setIsOpen(true);
          setState("idle");
        })
        .catch(() => {
          if (sequence !== requestRef.current) return;
          // The geocoder being down must not block publication: the visitor
          // types a town by hand and the form still submits.
          setResults([]);
          setIsOpen(false);
          setState("unavailable");
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, locale, marketContext]);

  const choose = (result: GeocodingResult) => {
    // Writing the chosen label back into the input would otherwise start a new
    // search for the text the visitor just accepted.
    suppressNextSearchRef.current = true;
    onValueChange(describe(result));
    onSelect(result);
    setIsOpen(false);
    setResults([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]!);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const status =
    state === "searching"
      ? labels.searching
      : state === "unavailable"
        ? labels.unavailable
        : isOpen && results.length
          ? labels.resultsAvailable(results.length)
          : isOpen
            ? labels.noResults
            : "";

  return (
    <div className="relative">
      <label
        htmlFor={controlId}
        className="mb-1.5 block text-xs font-semibold text-text-main"
      >
        {label}
      </label>
      <input
        id={controlId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-describedby={statusId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setIsOpen(false)}
        className="h-control-touch w-full min-w-0 rounded-control border border-border-base bg-bg-surface px-3 text-sm text-text-main placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      {/* Announced, never drawn: the visible list already says the same thing
          to a sighted reader, and duplicating it would read it twice. */}
      <p id={statusId} className="sr-only" aria-live="polite">
        {status}
      </p>
      {isOpen && results.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-dropdown mt-1 max-h-72 overflow-y-auto rounded-control border border-border-base bg-bg-surface py-1 shadow-dropdown"
        >
          {results.map((result, index) => (
            <li
              key={`${result.coordinate.latitude},${result.coordinate.longitude},${index}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              /* `mousedown` rather than `click`: the input's blur fires first
                 and would close the list before a click could land. */
              onMouseDown={(event) => {
                event.preventDefault();
                choose(result);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${
                index === activeIndex
                  ? "bg-bg-subtle text-text-main"
                  : "text-text-secondary"
              }`}
            >
              <MapPin
                className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0">{describe(result)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** One readable line, preferring what the provider already normalized. */
function describe(result: GeocodingResult): string {
  return (
    result.normalizedAddress ||
    [result.postalCode, result.city, result.administrativeArea]
      .filter(Boolean)
      .join(", ")
  );
}
