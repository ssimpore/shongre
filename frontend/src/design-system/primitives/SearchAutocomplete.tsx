import React, {  useRef } from 'react';
import {
  Search,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import {
  CategorySuggestion,
  PopularSearchKeyword,
} from '../../configuration/search.config';
import { useTranslation } from '../../i18n/I18nProvider';
import { CONTROL_FOCUS_CLASS, CONTROL_MOTION_CLASS } from '../utils/controlMetrics';

export interface AutocompleteSelection {
  query?: string;
  categorySlug?: string;
  subCategorySlug?: string;
  submitImmediately?: boolean;
}

export interface SearchAutocompleteProps {
  isOpen: boolean;
  query: string;
  categories: CategorySuggestion[];
  keywords: PopularSearchKeyword[];
  trending: PopularSearchKeyword[];
  recentSearches: string[];
  activeCategorySlug?: string;
  selectedIndex: number;
  onSelect: (selection: AutocompleteSelection) => void;
  onClearRecentSearch?: (search: string, e: React.MouseEvent) => void;
  onClearAllRecentSearches?: (e: React.MouseEvent) => void;
  onClose: () => void;
  idPrefix?: string;
  className?: string;
}

/**
 * Highlights matching query substrings inside a text label safely.
 */
export const HighlightMatch: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="font-bold text-primary underline decoration-primary/30 underline-offset-2">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  isOpen,
  query,
  categories,
  keywords,
  trending,
  recentSearches,
  activeCategorySlug,
  selectedIndex,
  onSelect,
  onClearRecentSearch,
  onClearAllRecentSearches,
  onClose,
  idPrefix = 'search-autocomplete',
  className = '',
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasCategories = categories.length > 0;
  const hasKeywords = keywords.length > 0;
  const hasRecent = recentSearches.length > 0;
  const hasTrending = trending.length > 0;

  // Compute total selectable items to sync selectedIndex
  // Order when typing:
  // 1. Matched Categories
  // 2. Matched Keywords
  // Order when empty:
  // 1. Recent searches
  // 2. Trending keywords
  let currentIndexTracker = 0;

  return (
    <div
      ref={containerRef}
      id={`${idPrefix}-dropdown`}
      role="listbox"
      aria-label={t('ui.searchAutocomplete.suggestionsDeRecherche')}
      className={`absolute left-0 right-0 top-full mt-2 bg-bg-surface rounded-card shadow-dropdown border border-border-base overflow-hidden z-popover animate-in fade-in zoom-in-95 max-h-[440px] overflow-y-auto ${className}`}
    >
      {/* ----------------------------------------------------------------- */}
      {/* STATE A: User is typing a query */}
      {/* ----------------------------------------------------------------- */}
      {hasQuery ? (
        <div className="py-2 divide-y divide-border-subtle">
          {/* 1. Category Suggestions */}
          {hasCategories && (
            <div className="py-1.5 px-2">
              <div className="flex items-center gap-1.5 px-3 py-1 text-micro font-bold text-stone-500 uppercase tracking-wider">
                <Layers className="w-3 h-3 text-stone-400" />
                <span>{t('ui.searchAutocomplete.categoriesRayons')}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {categories.map((catSuggestion) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;

                  return (
                    <div
                      key={`cat-${catSuggestion.id}-${catSuggestion.slug}`}
                      id={`${idPrefix}-item-${itemIndex}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        onSelect({
                          query: trimmedQuery,
                          categorySlug: catSuggestion.isSubCategory ? catSuggestion.parentSlug : catSuggestion.slug,
                          subCategorySlug: catSuggestion.isSubCategory ? catSuggestion.slug : undefined,
                          submitImmediately: true,
                        });
                      }}
                      className={`flex items-center justify-between min-h-control-sm px-3 py-2 rounded-control text-xs ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-primary-light text-primary font-semibold'
                          : 'text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="shrink-0">
                          <CategoryIcon category={catSuggestion.categoryObj} size="xs" />
                        </div>
                        <div className="truncate">
                          <span className="font-medium">
                            <HighlightMatch text={catSuggestion.compactLabel} highlight={trimmedQuery} />
                          </span>
                          {catSuggestion.isSubCategory && catSuggestion.parentName && (
                            <span className="text-micro text-stone-500 font-normal ml-1.5">
                              dans <span className="text-stone-700">{catSuggestion.parentName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-micro text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <span>Explorer</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Keyword & Search Suggestions */}
          {hasKeywords && (
            <div className="py-1.5 px-2">
              <div className="flex items-center gap-1.5 px-3 py-1 text-micro font-bold text-stone-500 uppercase tracking-wider">
                <Search className="w-3 h-3 text-stone-400" />
                <span>{t('ui.searchAutocomplete.suggestionsDeRecherche')}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {keywords.map((kw) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;

                  return (
                    <div
                      key={`kw-${kw.keyword}`}
                      id={`${idPrefix}-item-${itemIndex}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        onSelect({
                          query: kw.keyword,
                          categorySlug: kw.categorySlug,
                          subCategorySlug: kw.subCategorySlug,
                          submitImmediately: true,
                        });
                      }}
                      className={`flex items-center justify-between min-h-control-sm px-3 py-2 rounded-control text-xs ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-primary-light text-primary font-semibold'
                          : 'text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Search className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:text-primary motion-interactive" />
                        <span className="font-medium truncate">
                          <HighlightMatch text={kw.keyword} highlight={trimmedQuery} />
                        </span>
                        {kw.isTrending && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-micro font-bold bg-warning-surface text-warning border border-warning-border shrink-0">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Tendance
                          </span>
                        )}
                      </div>

                      <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-primary motion-interactive shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Direct Search Action with Current Query */}
          <div className="p-2">
            <div
              role="option"
              aria-selected={selectedIndex === currentIndexTracker}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect({
                  query: trimmedQuery,
                  categorySlug: activeCategorySlug,
                  submitImmediately: true,
                });
              }}
              className={`flex items-center justify-between min-h-control-sm px-3 py-2.5 rounded-control text-xs font-bold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer select-none ${
                selectedIndex === currentIndexTracker
                  ? 'bg-stone-900 text-white'
                  : 'bg-bg-subtle text-stone-900 hover:bg-stone-200/70'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">
                  Rechercher « <span className="underline">{trimmedQuery}</span> »
                </span>
              </div>
              <span className="text-micro font-semibold uppercase tracking-wider text-stone-500">{t('ui.searchAutocomplete.entree')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------- */
        /* STATE B: Input is empty / Focused default view */
        /* ----------------------------------------------------------------- */
        <div className="py-2 divide-y divide-border-subtle">
          {/* Recent Searches */}
          {hasRecent && (
            <div className="py-1.5 px-2">
              <div className="flex items-center justify-between px-3 py-1">
                <div className="flex items-center gap-1.5 text-micro font-bold text-stone-500 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>{t('ui.searchAutocomplete.recherchesRecentes')}</span>
                </div>
                {onClearAllRecentSearches && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onClearAllRecentSearches(e);
                    }}
                    className="text-micro font-semibold text-stone-400 hover:text-stone-700 motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >{t('ui.searchAutocomplete.effacerTout')}</button>
                )}
              </div>
              <div className="space-y-0.5 mt-1">
                {recentSearches.slice(0, 4).map((searchStr) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;

                  return (
                    <div
                      key={`recent-${searchStr}`}
                      id={`${idPrefix}-item-${itemIndex}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect({
                          query: searchStr,
                          submitImmediately: true,
                        });
                      }}
                      className={`flex items-center justify-between min-h-control-sm px-3 py-2 rounded-control text-xs ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-primary-light text-primary font-semibold'
                          : 'text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:text-primary motion-interactive" />
                        <span className="font-medium truncate">{searchStr}</span>
                      </div>

                      {onClearRecentSearch && (
                        <button
                          type="button"
                          aria-label={`Supprimer ${searchStr} de l'historique`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClearRecentSearch(searchStr, e);
                          }}
                          className={`p-1 text-stone-300 hover:text-stone-600 rounded-control hover:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular Trending Keywords */}
          {hasTrending && (
            <div className="py-2 px-3">
              <div className="flex items-center gap-1.5 py-1 text-micro font-bold text-stone-500 uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t('ui.searchAutocomplete.recherchesLesPlusPopulaires')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trending.map((trend) => (
                  <button
                    key={`trend-${trend.keyword}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect({
                        query: trend.keyword,
                        categorySlug: trend.categorySlug,
                        subCategorySlug: trend.subCategorySlug,
                        submitImmediately: true,
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 h-control-md px-3 rounded-control bg-bg-subtle hover:bg-primary-light text-stone-800 hover:text-primary border border-border-base hover:border-primary-border text-xs font-semibold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer select-none active:scale-95`}
                  >
                    <TrendingUp className="w-3 h-3 text-primary shrink-0" />
                    <span>{trend.keyword}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
