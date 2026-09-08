import type { ReactNode } from "react";
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
        className="ml-2 cursor-pointer text-xs font-semibold text-text-tertiary underline hover:text-danger"
      >
        {t("search.searchPage.effacerTout")}
      </button>
    </div>
  );
}

export interface SearchResultsToolbarProps {
  id?: string;
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
 * Canonical results toolbar for marketplace search pages.
 *
 * Its slots intentionally describe capabilities rather than domains: a route
 * can expose only the actions and view modes its result renderer supports.
 */
export function SearchResultsToolbar({
  id,
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
      className={cn(
        "mb-4 flex scroll-mt-24 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-listing-card border border-border-base bg-bg-surface p-2 shadow-xs sm:p-4 lg:flex-nowrap",
        className,
      )}
    >
      <div className="flex min-w-0 shrink items-center gap-3">
        <div className="min-w-0">
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="block shrink-0 text-sm font-bold text-text-main"
          >
            {resultLabel}
          </span>
          {resultDescription ? (
            <span className="mt-0.5 block text-micro text-text-secondary">
              {resultDescription}
            </span>
          ) : null}
        </div>
        <FilterPanelToggle
          isExpanded={desktopFiltersExpanded}
          controls={desktopFilterPanelId}
          onToggle={onToggleDesktopFilters}
        />
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
        <FilterPanelToggle
          isExpanded={mobileFiltersExpanded}
          controls={mobileFilterPanelId}
          presentation="drawer"
          activeCount={activeFilterCount}
          onToggle={onOpenMobileFilters}
        />
        {actions}
        {viewControls}
        {sortControl}
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
        "flex min-w-0 shrink-0 items-center gap-1.5 text-xs",
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
