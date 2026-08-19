import React from 'react';
import { LayoutGrid, List, Map as MapIcon } from 'lucide-react';

export type ListingViewMode = 'grid' | 'list' | 'map';

export interface ViewModeToggleProps {
  viewMode: ListingViewMode;
  onChange: (mode: ListingViewMode) => void;
  showMap?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  showMap = false,
  className = '',
  size = 'md',
}) => {
  const isSm = size === 'sm';

  return (
    <div
      role="group"
      aria-label="Mode d'affichage des annonces"
      /* Pinned to the shared control heights rather than sized by its own
         padding. It rendered 28px while the filter button and the sort control
         beside it were 32px, so the toolbar had one item sitting 2px inset from
         its neighbours — visible as a stagger on every listing surface. */
      className={`inline-flex items-center ${
        isSm ? 'h-control-sm' : 'h-control-md'
      } bg-stone-100/90 border border-stone-200/90 rounded-xl p-0.5 shadow-2xs shrink-0 select-none ${className}`}
    >
      <button
        type="button"
        aria-label="Affichage grille"
        aria-pressed={viewMode === 'grid'}
        onClick={() => onChange('grid')}
        className={`${
          isSm ? 'h-full px-1.5 sm:px-2 text-[11px]' : 'h-full px-2 sm:px-2.5 text-xs'
        } font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          viewMode === 'grid'
            ? 'bg-primary text-white shadow-xs'
            : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
        }`}
      >
        <LayoutGrid className={isSm ? 'w-3.5 h-3.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} />
        <span className="hidden sm:inline">Grille</span>
      </button>

      <button
        type="button"
        aria-label="Affichage liste"
        aria-pressed={viewMode === 'list'}
        onClick={() => onChange('list')}
        className={`${
          isSm ? 'h-full px-1.5 sm:px-2 text-[11px]' : 'h-full px-2 sm:px-2.5 text-xs'
        } font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          viewMode === 'list'
            ? 'bg-primary text-white shadow-xs'
            : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
        }`}
      >
        <List className={isSm ? 'w-3.5 h-3.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} />
        <span className="hidden sm:inline">Liste</span>
      </button>

      {showMap && (
        <button
          type="button"
          aria-label="Affichage carte"
          aria-pressed={viewMode === 'map'}
          onClick={() => onChange('map')}
          className={`${
            isSm ? 'h-full px-1.5 sm:px-2 text-[11px]' : 'h-full px-2 sm:px-2.5 text-xs'
          } font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'map'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <MapIcon className={isSm ? 'w-3.5 h-3.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} />
          <span className="hidden sm:inline">Carte</span>
        </button>
      )}
    </div>
  );
};
