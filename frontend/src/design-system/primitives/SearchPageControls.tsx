import { useCallback, useState, type ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
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
  desktopFilterPanelId: string;
  mobileFilterPanelId: string;
  desktopFiltersExpanded: boolean;
  mobileFiltersExpanded: boolean;
  activeFilterCount?: number;
  onToggleDesktopFilters: () => void;
  onOpenMobileFilters: () => void;
  actions?: ReactNode;
  viewControls?: ReactNode;
  sortControl?: ReactNode;
  className?: string;
}

/**
 * Shared disclosure state for every marketplace search surface.
 *
 * Search pages start with their results at full width. The same controller
 * then owns desktop toggling and the mobile drawer lifecycle, so a vertical
 * cannot silently drift back to an expanded default.
 */
export function useSearchFilterDisclosure() {
  const [desktopFiltersExpanded, setDesktopFiltersExpanded] = useState(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const toggleDesktopFilters = useCallback(
    () => setDesktopFiltersExpanded((expanded) => !expanded),
    [],
  );
  const openMobileFilters = useCallback(
    () => setMobileFiltersExpanded(true),
    [],
  );
  const closeMobileFilters = useCallback(
    () => setMobileFiltersExpanded(false),
    [],
  );

  return {
    desktopFiltersExpanded,
    mobileFiltersExpanded,
    toggleDesktopFilters,
    openMobileFilters,
    closeMobileFilters,
  };
}

/**
 * Canonical results toolbar for marketplace search pages.
 *
 * Its slots intentionally describe capabilities rather than domains: a route
 * can expose only the actions and view modes its result renderer supports.
 */
export function SearchResultsToolbar({
  id,
  title,
  resultLabel,
  resultDescription,
  desktopFilterPanelId,
  mobileFilterPanelId,
  desktopFiltersExpanded,
  mobileFiltersExpanded,
  activeFilterCount = 0,
  onToggleDesktopFilters,
  onOpenMobileFilters,
  actions,
  viewControls,
  sortControl,
  className,
}: SearchResultsToolbarProps) {
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

      <div className="flex min-w-0 items-center justify-between gap-1 overflow-x-auto pt-4 sm:flex-wrap sm:justify-start sm:gap-3 sm:overflow-visible">
        <FilterPanelToggle
          isExpanded={desktopFiltersExpanded}
          controls={desktopFilterPanelId}
          activeCount={activeFilterCount}
          className="justify-self-start"
          onToggle={onToggleDesktopFilters}
        />
        <FilterPanelToggle
          isExpanded={mobileFiltersExpanded}
          controls={mobileFilterPanelId}
          presentation="drawer"
          activeCount={activeFilterCount}
          className="order-1"
          onToggle={onOpenMobileFilters}
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

/** Consistent label and alignment for a domain-specific sort menu. */
export function SearchSortControl({
  children,
  className,
  showIcon = false,
}: SearchSortControlProps) {
  const { t } = useTranslation();

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
      <span className="hidden shrink-0 font-medium text-text-tertiary sm:inline">
        {t("search.searchPage.trierPar")}
      </span>
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
