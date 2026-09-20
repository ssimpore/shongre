import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
import { Button } from "./Button";
import { FilterPanelToggle } from "./FilterPanel";

export interface SearchActiveFiltersBarProps {
  children: ReactNode;
  onClear: () => void;
  className?: string;
}

/** Standalone active-filter summary for marketplace results pages. */
export function SearchActiveFiltersBar({
  children,
  onClear,
  className,
}: SearchActiveFiltersBarProps) {
  const { t } = useTranslation();

  return (
    <div
      data-search-active-filters
      className={cn(
        "mb-4 flex flex-wrap items-center gap-1.5 rounded-listing-card border border-border-base bg-bg-surface px-3 py-2.5 shadow-xs sm:mb-6 sm:px-4",
        className,
      )}
    >
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-text-tertiary">
        {t("ui.searchControls.activeFilters")}
      </span>
      {children}
      <button
        type="button"
        onClick={onClear}
        className="ml-2 inline-flex min-h-control-target cursor-pointer items-center text-xs font-semibold text-text-tertiary underline hover:text-danger"
      >
        {t("search.searchPage.effacerTout")}
      </button>
    </div>
  );
}

export interface SearchResultsToolbarProps {
  id?: string;
  title?: ReactNode;
  resultLabel: ReactNode;
  resultDescription?: ReactNode;
  filterPanelId: string;
  filtersExpanded: boolean;
  filterTriggers?: readonly SearchFilterTrigger[];
  activeFilterCount?: number;
  onOpenFilters: (sectionId?: string) => void;
  actions?: ReactNode;
  viewControls?: ReactNode;
  sortControl?: ReactNode;
  className?: string;
}

export interface SearchFilterTrigger {
  sectionId: string;
  label: string;
  active?: boolean;
}

export function countFittingSearchFilterTriggers(
  availableWidth: number,
  triggerWidths: readonly number[],
  allFiltersWidth: number,
  gap: number,
) {
  let usedWidth = allFiltersWidth;
  let visibleCount = 0;

  for (const triggerWidth of triggerWidths) {
    const nextWidth = usedWidth + gap + triggerWidth;
    if (nextWidth > availableWidth + 0.5) break;
    usedWidth = nextWidth;
    visibleCount += 1;
  }

  return visibleCount;
}

/**
 * Shared disclosure state for every marketplace search surface.
 *
 * Search pages keep their results at full width while the same controller owns
 * the filter drawer and the section requested by a desktop quick-filter.
 */
export function useSearchFilterDisclosure() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<
    string | undefined
  >();
  const openFilters = useCallback((sectionId?: string) => {
    setActiveFilterSection(sectionId);
    setFiltersExpanded(true);
  }, []);
  const closeFilters = useCallback(() => {
    setFiltersExpanded(false);
    setActiveFilterSection(undefined);
  }, []);

  return {
    filtersExpanded,
    activeFilterSection,
    openFilters,
    closeFilters,
  };
}

/**
 * Canonical results toolbar for marketplace search pages.
 *
 * Its slots intentionally describe capabilities rather than domains. Each
 * route supplies only its relevant quick filters, actions, and view modes.
 */
export function SearchResultsToolbar({
  id,
  title,
  resultLabel,
  resultDescription,
  filterPanelId,
  filtersExpanded,
  filterTriggers = [],
  activeFilterCount = 0,
  onOpenFilters,
  actions,
  viewControls,
  sortControl,
  className,
}: SearchResultsToolbarProps) {
  const { t } = useTranslation();
  const filterRailRef = useRef<HTMLDivElement>(null);
  const allFiltersRef = useRef<HTMLSpanElement>(null);
  const triggerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const filterTriggerCount = filterTriggers.length;
  const filterSignature = filterTriggers
    .map((trigger) => `${trigger.sectionId}:${trigger.label}`)
    .join("|");
  const [filterVisibility, setFilterVisibility] = useState(() => ({
    signature: filterSignature,
    count: filterTriggerCount,
  }));
  const visibleFilterCount =
    filterVisibility.signature === filterSignature
      ? filterVisibility.count
      : filterTriggerCount;

  useLayoutEffect(() => {
    const rail = filterRailRef.current;
    const allFilters = allFiltersRef.current;
    if (!rail || !allFilters || typeof ResizeObserver === "undefined") return;

    const updateVisibleFilters = () => {
      const availableWidth = rail.getBoundingClientRect().width;
      const allFiltersWidth = allFilters.getBoundingClientRect().width;
      const triggerWidths = Array.from(
        { length: filterTriggerCount },
        (_, index) =>
          triggerRefs.current[index]?.getBoundingClientRect().width ?? 0,
      );
      if (
        availableWidth <= 0 ||
        allFiltersWidth <= 0 ||
        triggerWidths.some((width) => width <= 0)
      ) {
        return;
      }

      const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
      const count = countFittingSearchFilterTriggers(
        availableWidth,
        triggerWidths,
        allFiltersWidth,
        gap,
      );
      setFilterVisibility((current) =>
        current.signature === filterSignature && current.count === count
          ? current
          : { signature: filterSignature, count },
      );
    };

    updateVisibleFilters();
    const observer = new ResizeObserver(updateVisibleFilters);
    observer.observe(rail);
    observer.observe(allFilters);
    triggerRefs.current.forEach((trigger) => {
      if (trigger) observer.observe(trigger);
    });
    return () => observer.disconnect();
  }, [activeFilterCount, filterSignature, filterTriggerCount]);

  const hiddenFilterCount = filterTriggerCount - visibleFilterCount;

  return (
    <div
      id={id}
      data-search-results-toolbar
      className={cn("mb-5 min-w-0 scroll-mt-24", className)}
    >
      <div className="relative flex min-w-0 flex-col items-start gap-1 border-b border-border-base pb-3 after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-12 after:bg-primary sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {title ? (
            <h1 className="mb-1 break-words text-xl font-extrabold tracking-tight text-text-main sm:text-2xl">
              {title}
            </h1>
          ) : null}
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="block shrink-0 text-sm font-bold text-text-main"
          >
            {resultLabel}
          </span>
        </div>
        {resultDescription ? (
          <div className="max-w-lg text-xs leading-relaxed text-text-muted sm:text-right sm:text-sm">
            {resultDescription}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 overflow-x-auto pt-4 sm:flex-wrap sm:justify-start sm:gap-3 sm:overflow-visible">
        <div
          ref={filterRailRef}
          data-search-filter-rail
          data-search-filter-visible-count={visibleFilterCount}
          data-search-filter-overflow-count={hiddenFilterCount}
          className="hidden min-w-0 flex-1 items-center gap-2 overflow-hidden lg:flex"
        >
          {filterTriggers.map((trigger, index) => (
            <span
              key={trigger.sectionId}
              ref={(element) => {
                triggerRefs.current[index] = element;
              }}
              className={cn(
                "shrink-0",
                index >= visibleFilterCount && "invisible absolute",
              )}
            >
              <Button
                type="button"
                variant="secondary"
                size="md"
                aria-controls={filterPanelId}
                aria-expanded={filtersExpanded}
                data-filter-trigger={trigger.sectionId}
                onClick={() => onOpenFilters(trigger.sectionId)}
                rightIcon={
                  <ChevronRight className="h-icon-sm w-icon-sm" aria-hidden />
                }
                className={cn(
                  "shrink-0 justify-between shadow-none",
                  trigger.active &&
                    "border-primary-border bg-primary-surface-soft",
                )}
                tabIndex={index >= visibleFilterCount ? -1 : undefined}
                aria-hidden={index >= visibleFilterCount || undefined}
              >
                {trigger.label}
              </Button>
            </span>
          ))}
          <span ref={allFiltersRef} className="shrink-0">
            <FilterPanelToggle
              isExpanded={filtersExpanded}
              controls={filterPanelId}
              activeCount={activeFilterCount}
              label={t("ui.filterPanel.allFilters")}
              className="justify-self-start shadow-none"
              onToggle={() => onOpenFilters()}
            />
          </span>
        </div>
        <FilterPanelToggle
          isExpanded={filtersExpanded}
          controls={filterPanelId}
          presentation="drawer"
          activeCount={activeFilterCount}
          className="order-1"
          onToggle={() => onOpenFilters()}
        />
        {viewControls ? (
          <div
            className={cn(
              "order-2 shrink-0 sm:order-3",
              !actions && "sm:ml-auto",
            )}
          >
            {viewControls}
          </div>
        ) : null}
        {actions ? (
          <div className="order-3 shrink-0 sm:order-2 sm:ml-auto">
            {actions}
          </div>
        ) : null}
        {sortControl ? (
          <div className="order-4 shrink-0">{sortControl}</div>
        ) : null}
      </div>
    </div>
  );
}

export interface SearchSortControlProps {
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
}

/** Consistent alignment for a domain-specific sort menu. */
export function SearchSortControl({
  children,
  className,
  showIcon = false,
}: SearchSortControlProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 text-sm",
        className,
      )}
    >
      {showIcon ? (
        <ArrowUpDown
          className="h-icon-sm w-icon-sm shrink-0 text-text-tertiary"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </div>
  );
}

export function countActiveSearchParams(
  params: URLSearchParams,
  keys: readonly string[],
) {
  return keys.reduce(
    (count, key) => (params.get(key)?.trim() ? count + 1 : count),
    0,
  );
}
