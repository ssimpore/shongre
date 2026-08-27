import React from "react";
import { SearchX, RotateCcw, Lightbulb, BookmarkPlus } from "lucide-react";
import { Button } from "./Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { CONTROL_MOTION_CLASS } from "../utils/controlMetrics";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

export interface NoResultsFoundProps {
  /** Main heading */
  title?: string;
  /** Explanatory text */
  description?: string;
  /** Active search query term if applicable (e.g. "velo vintage") */
  query?: string;
  /** Callback triggered when clicking the primary "Clear filters" action */
  onClearFilters?: () => void;
  /** Custom label for the clear filters button */
  clearFiltersLabel?: string;
  /** Callback to save search or create alert */
  onSaveSearch?: () => void;
  /** Custom label for save search button */
  saveSearchLabel?: string;
  /** Optional secondary action slot (e.g. custom button or link) */
  secondaryAction?: React.ReactNode;
  /** List of actionable search suggestions to display */
  suggestions?: string[];
  /** Whether to show the suggestions block (defaults to true) */
  showSuggestions?: boolean;
  /** Custom visual icon */
  icon?: React.ReactNode;
  /** Additional container CSS classes */
  className?: string;
  /** Unique element ID for testing and accessibility */
  id?: string;
}

/**
 * Reusable empty state component displayed when search or filter combinations return zero results.
 * Provides clear context, actionable advice, and immediate ways forward (Clear filters, Save search).
 */
export const NoResultsFound: React.FC<NoResultsFoundProps> = ({
  title,
  description,
  query,
  onClearFilters,
  clearFiltersLabel,
  onSaveSearch,
  saveSearchLabel,
  secondaryAction,
  suggestions,
  showSuggestions = true,
  icon,
  className = "",
  id = "no-results-found-state",
}) => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const resolvedSuggestions = suggestions ?? [
    t("ui.noResultsFound.suggestionSpelling"),
    t("ui.noResultsFound.suggestionLocation", {
      market: activeMarket.name,
    }),
    t("ui.noResultsFound.suggestionFilters"),
    t("ui.noResultsFound.suggestionRestrictions"),
  ];
  const resolvedClearFiltersLabel =
    clearFiltersLabel ?? t("ui.noResultsFound.clearFilters");
  const resolvedSaveSearchLabel =
    saveSearchLabel ?? t("ui.noResultsFound.createAlert");
  const displayTitle =
    title ||
    (query
      ? t("ui.noResultsFound.titleForQuery", { query })
      : t("ui.noResultsFound.title"));
  const displayDescription =
    description ||
    (query
      ? t("ui.noResultsFound.descriptionForQuery")
      : t("ui.noResultsFound.description"));

  return (
    <div
      id={id}
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card bg-bg-surface border border-border-base shadow-xs ${className}`}
    >
      {/* Only the outcome is announced. With `role="status"` on the panel
          itself, a screen reader read the heading, all four suggestions and
          both button labels as one status message. */}
      <span className="sr-only" role="status" aria-live="polite">
        {displayTitle}
      </span>
      {/* Icon Badge */}
      <div
        id={`${id}-icon-container`}
        className={`w-14 h-14 rounded-card bg-bg-subtle border border-border-base flex items-center justify-center text-text-muted mb-4 ${CONTROL_MOTION_CLASS} hover:scale-105`}
      >
        {icon || <SearchX className="w-7 h-7 text-text-secondary" />}
      </div>

      {/* Headings */}
      <h2
        id={`${id}-title`}
        className="text-base sm:text-lg font-bold text-text-main tracking-tight"
      >
        {displayTitle}
      </h2>

      <p
        id={`${id}-description`}
        className="text-xs sm:text-sm text-text-secondary max-w-md mt-1.5 leading-relaxed"
      >
        {displayDescription}
      </p>

      {/* Helpful Suggestions */}
      {showSuggestions && resolvedSuggestions.length > 0 && (
        <div
          id={`${id}-suggestions-box`}
          className="mt-6 w-full max-w-md bg-bg-subtle/80 rounded-control border border-border-subtle p-4 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-main mb-2">
            <Lightbulb className="w-icon-sm h-icon-sm text-warning shrink-0" />
            <span>
              {t("ui.noResultsFound.conseilsPourTrouverVotreBonheur")}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {resolvedSuggestions.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary font-bold select-none">•</span>
                <span className="leading-snug">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div
        id={`${id}-actions`}
        className="mt-6 grid w-full max-w-md grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
      >
        {onClearFilters && (
          <Button
            id={`${id}-clear-filters-btn`}
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={onClearFilters}
            leftIcon={<RotateCcw className="w-icon-md h-icon-md" />}
          >
            {resolvedClearFiltersLabel}
          </Button>
        )}

        {onSaveSearch && (
          <Button
            id={`${id}-save-search-btn`}
            type="button"
            variant="outline"
            size="md"
            fullWidth
            onClick={onSaveSearch}
            leftIcon={
              <BookmarkPlus className="w-icon-md h-icon-md text-primary" />
            }
          >
            {resolvedSaveSearchLabel}
          </Button>
        )}

        {secondaryAction}
      </div>
    </div>
  );
};
