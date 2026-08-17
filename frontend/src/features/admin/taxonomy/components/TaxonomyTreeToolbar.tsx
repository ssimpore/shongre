import React from 'react';
import { Search, Plus, Filter, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '../../../../design-system/primitives/Button';
import { TaxonomyLevel, TaxonomyNodeStatus } from '../../../../domains/taxonomy/taxonomy.types';

export interface TaxonomyTreeToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  levelFilter: string;
  onLevelFilterChange: (lvl: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddRootCategory: () => void;
}

export const TaxonomyTreeToolbar: React.FC<TaxonomyTreeToolbarProps> = ({
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  statusFilter,
  onStatusFilterChange,
  onExpandAll,
  onCollapseAll,
  onAddRootCategory,
}) => {
  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border border-border-base shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par libellé, nom court, alias, ID, slug..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-8 bg-bg-base border border-border-base rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Action: Add Root Category */}
        <Button
          variant="primary"
          size="sm"
          onClick={onAddRootCategory}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="shrink-0"
        >
          Ajouter une catégorie
        </Button>
      </div>

      {/* Filter Chips & Expand Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-stone-500 font-semibold text-micro uppercase tracking-wider">
            <Filter className="w-3 h-3" />
            <span>Filtres :</span>
          </div>

          <select
            value={levelFilter}
            onChange={(e) => onLevelFilterChange(e.target.value)}
            className="h-7 px-2 bg-bg-base border border-border-base rounded-lg text-xs font-semibold text-stone-700"
          >
            <option value="all">Tous les niveaux</option>
            <option value="category">Catégories racines (Univers)</option>
            <option value="subcategory">Sous-catégories</option>
            <option value="type">Types (Feuilles)</option>
            <option value="subtype">Sous-types</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-7 px-2 bg-bg-base border border-border-base rounded-lg text-xs font-semibold text-stone-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs uniquement</option>
            <option value="draft">Brouillons uniquement</option>
            <option value="deprecated">Dépréciés uniquement</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExpandAll}
            className="px-2 py-1 text-micro font-semibold text-stone-500 hover:text-stone-900 bg-bg-subtle hover:bg-stone-200/60 rounded-md transition-colors"
          >
            Déplier tout
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="px-2 py-1 text-micro font-semibold text-stone-500 hover:text-stone-900 bg-bg-subtle hover:bg-stone-200/60 rounded-md transition-colors"
          >
            Replier tout
          </button>
        </div>
      </div>
    </div>
  );
};
