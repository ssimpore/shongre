import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { CategoryIcon } from './CategoryIcon';
import { Category } from '../../types';
import { useTranslation } from '../../i18n/I18nProvider';

export interface CategoryFilterRailProps {
  /** Currently selected top-level category slug, or undefined for "all" */
  selectedCategorySlug?: string;
  /** Callback fired when category is toggled or selected. Passing undefined resets to all. */
  onSelectCategory: (categorySlug: string | undefined) => void;
  /** Optional callback fired when the master "Toutes les annonces" button is clicked */
  onSelectAll?: () => void;
  /** Optional selected subcategory slug */
  selectedSubCategorySlug?: string;
  /** Optional callback when subcategory is toggled */
  onSelectSubCategory?: (subCategorySlug: string | undefined) => void;
  /** Whether to show the "Toutes les annonces" / "Tout" chip at the start */
  showAllOption?: boolean;
  /** Whether to show subcategories rail when a category is selected */
  showSubCategories?: boolean;
  /** Custom additional wrapper styling */
  className?: string;
  /** Custom ID prefix for chips */
  idPrefix?: string;
}

/**
 * Horizontal scrollable rail of category filter chips allowing users to quickly
 * browse and toggle between marketplace categories.
 */
export const CategoryFilterRail: React.FC<CategoryFilterRailProps> = ({
  selectedCategorySlug,
  onSelectCategory,
  onSelectAll,
  selectedSubCategorySlug,
  onSelectSubCategory,
  showAllOption = true,
  showSubCategories = true,
  className = '',
  idPrefix = 'category-rail',
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll boundary state
  const checkScrollBoundaries = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollBoundaries();
    const rafId = requestAnimationFrame(checkScrollBoundaries);
    const timer = setTimeout(checkScrollBoundaries, 150);

    el.addEventListener('scroll', checkScrollBoundaries, { passive: true });
    window.addEventListener('resize', checkScrollBoundaries);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScrollBoundaries();
      });
      resizeObserver.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      el.removeEventListener('scroll', checkScrollBoundaries);
      window.removeEventListener('resize', checkScrollBoundaries);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Scroll active chip into view when selection changes
  useEffect(() => {
    if (!selectedCategorySlug || !scrollContainerRef.current) return;
    const activeChip = scrollContainerRef.current.querySelector(
      `[data-category-slug="${selectedCategorySlug}"], [data-category-id="${selectedCategorySlug}"]`
    ) as HTMLElement | null;

    if (activeChip && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const chipLeft = activeChip.offsetLeft;
      const chipWidth = activeChip.offsetWidth;
      const containerWidth = container.offsetWidth;

      container.scrollTo({
        left: chipLeft - containerWidth / 2 + chipWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedCategorySlug]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 280;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleCategoryClick = (cat: Category) => {
    const isCurrentlySelected = selectedCategorySlug === cat.slug || selectedCategorySlug === cat.id;
    if (isCurrentlySelected) {
      // Toggle off if already selected
      onSelectCategory(undefined);
    } else {
      // Select new category by canonical slug
      onSelectCategory(cat.slug);
    }
  };

  const activeCategory = TAXONOMY.find(
    (c) => c.slug === selectedCategorySlug || c.id === selectedCategorySlug
  );
  const subCategories = activeCategory?.subCategories || [];

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Top Main Categories Rail */}
      <div className="relative group/rail">
        {/* Left Scroll Button (Desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label={t('ui.categoryFilterRail.faireDefilerLesCategoriesVers')}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-md border border-border-base hover:bg-stone-50 hover:text-stone-900 transition-all cursor-pointer -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          role="region"
          aria-label={t('ui.categoryFilterRail.filtresParCategorie')}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
        >
          {/* "All" Option Chip */}
          {showAllOption && (
            <button
              id={`${idPrefix}-chip-all`}
              type="button"
              onClick={() => {
                if (onSelectAll) {
                  onSelectAll();
                } else {
                  onSelectCategory(undefined);
                }
              }}
              aria-pressed={!selectedCategorySlug}
              title={t('ui.categoryFilterRail.afficherToutesLesAnnoncesActives')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-[0.98] ${
                !selectedCategorySlug
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white text-stone-700 border-border-base hover:border-stone-400 hover:bg-stone-50 shadow-2xs'
              }`}
            >
              <LayoutGrid className={`w-3.5 h-3.5 pointer-events-none ${!selectedCategorySlug ? 'text-primary' : 'text-stone-500'}`} />
              <span className="pointer-events-none">{t('ui.categoryFilterRail.toutesLesAnnonces')}</span>
            </button>
          )}

          {/* Canonical Category Chips */}
          {TAXONOMY.map((cat: Category) => {
            const isSelected = selectedCategorySlug === cat.slug || selectedCategorySlug === cat.id;
            const compactLabel = getTaxonomyLabel(cat, 'compact');

            return (
              <button
                key={cat.id}
                id={`${idPrefix}-chip-${cat.slug}`}
                data-category-slug={cat.slug}
                data-category-id={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                aria-pressed={isSelected}
                title={cat.name}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs transition-all cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-xs'
                    : 'bg-white text-stone-700 border-border-base hover:border-stone-400 hover:bg-stone-50 font-medium shadow-2xs'
                }`}
              >
                <span className="shrink-0 pointer-events-none">
                  <CategoryIcon
                    category={cat}
                    size="xs"
                    className={isSelected ? 'text-white' : ''}
                  />
                </span>
                <span className="whitespace-nowrap pointer-events-none">{compactLabel}</span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="ml-0.5 w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center pointer-events-none"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button (Desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label={t('ui.categoryFilterRail.faireDefilerLesCategoriesVers2')}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-md border border-border-base hover:bg-stone-50 hover:text-stone-900 transition-all cursor-pointer -mr-2"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Secondary Subcategories Quick Rail (shown when a category with subcategories is active) */}
      {showSubCategories && selectedCategorySlug && subCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 pl-1">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500 shrink-0 mr-1">{t('ui.categoryFilterRail.sousCategories')}</span>

          <button
            type="button"
            onClick={() => onSelectSubCategory && onSelectSubCategory(undefined)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              !selectedSubCategorySlug
                ? 'bg-primary-light text-primary border-primary-border font-bold'
                : 'bg-stone-100 text-stone-600 border-transparent hover:bg-stone-200'
            }`}
          >
            Toutes
          </button>

          {subCategories.map((sub) => {
            const isSubSelected = selectedSubCategorySlug === sub.slug || selectedSubCategorySlug === sub.id;
            const subLabel = getTaxonomyLabel(sub, 'compact');

            return (
              <button
                key={sub.id}
                id={`${idPrefix}-subchip-${sub.slug}`}
                data-subcategory-slug={sub.slug}
                data-subcategory-id={sub.id}
                type="button"
                onClick={() => {
                  if (onSelectSubCategory) {
                    onSelectSubCategory(isSubSelected ? undefined : sub.slug);
                  }
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isSubSelected
                    ? 'bg-primary text-white border-primary shadow-2xs font-bold'
                    : 'bg-stone-100 text-stone-700 border-transparent hover:bg-stone-200'
                }`}
                title={sub.name}
              >
                {subLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
