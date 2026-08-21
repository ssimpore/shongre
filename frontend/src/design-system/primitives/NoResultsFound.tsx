import React from 'react';
import { SearchX, RotateCcw, Lightbulb, BookmarkPlus } from 'lucide-react';
import { Button } from './Button';
import { useTranslation } from '../../i18n/I18nProvider';
import { CONTROL_MOTION_CLASS } from '../utils/controlMetrics';

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

const DEFAULT_SUGGESTIONS = [
  "Vérifiez l'orthographe des mots-clés saisis",
  'Élargissez le rayon géographique ou choisissez « Toute la France »',
  'Supprimez ou élargissez vos filtres de prix et de catégorie',
  'Désactivez les critères restrictifs (livraison seule, bons plans)',
];

/**
 * Reusable empty state component displayed when search or filter combinations return zero results.
 * Provides clear context, actionable advice, and immediate ways forward (Clear filters, Save search).
 */
export const NoResultsFound: React.FC<NoResultsFoundProps> = ({
  title,
  description,
  query,
  onClearFilters,
  clearFiltersLabel = 'Effacer les filtres',
  onSaveSearch,
  saveSearchLabel = 'Créer une alerte',
  secondaryAction,
  suggestions = DEFAULT_SUGGESTIONS,
  showSuggestions = true,
  icon,
  className = '',
  id = 'no-results-found-state',
}) => {
  const { t } = useTranslation();
  const displayTitle = title || (query ? `Aucun résultat pour « ${query} »` : 'Aucune annonce trouvée');
  const displayDescription =
    description ||
    (query
      ? 'Nous n’avons trouvé aucune annonce correspondant exactement à votre recherche.'
      : 'Aucune annonce ne correspond aux filtres actuellement sélectionnés.');

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card bg-bg-surface border border-border-base shadow-xs ${className}`}
    >
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
      {showSuggestions && suggestions.length > 0 && (
        <div
          id={`${id}-suggestions-box`}
          className="mt-6 w-full max-w-md bg-bg-subtle/80 rounded-control border border-border-subtle p-4 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-main mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-warning shrink-0" />
            <span>{t('ui.noResultsFound.conseilsPourTrouverVotreBonheur')}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {suggestions.map((tip, idx) => (
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
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {clearFiltersLabel}
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
            leftIcon={<BookmarkPlus className="w-4 h-4 text-primary" />}
          >
            {saveSearchLabel}
          </Button>
        )}

        {secondaryAction}
      </div>
    </div>
  );
};
