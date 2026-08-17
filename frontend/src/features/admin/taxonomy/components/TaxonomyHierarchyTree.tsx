import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Archive,
  Layers,
} from 'lucide-react';
import { TaxonomyNode } from '../../../../domains/taxonomy/taxonomy.types';
import { CategoryIcon } from '../../../../design-system/primitives/CategoryIcon';
import { getTaxonomyLabel } from '../../../../domains/taxonomy/taxonomy.service';

export interface TaxonomyHierarchyTreeProps {
  nodes: TaxonomyNode[];
  selectedNodeId?: string;
  onSelectNode: (node: TaxonomyNode) => void;
  expandedNodes: Record<string, boolean>;
  onToggleExpand: (nodeId: string, e: React.MouseEvent) => void;
  onReorderNode: (nodeId: string, direction: 'up' | 'down', e: React.MouseEvent) => void;
  onAddChild: (parentNode: TaxonomyNode, e: React.MouseEvent) => void;
  searchQuery?: string;
  levelFilter?: string;
  statusFilter?: string;
}

export const TaxonomyHierarchyTree: React.FC<TaxonomyHierarchyTreeProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  expandedNodes,
  onToggleExpand,
  onReorderNode,
  onAddChild,
  searchQuery = '',
  levelFilter = 'all',
  statusFilter = 'all',
}) => {
  const matchesFilter = (node: TaxonomyNode): boolean => {
    // 1. Level filter
    if (levelFilter !== 'all' && node.level !== levelFilter) return false;
    // 2. Status filter
    if (statusFilter !== 'all' && node.status !== statusFilter) return false;
    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = node.name.toLowerCase().includes(q);
      const matchLabel = (node.label || '').toLowerCase().includes(q);
      const matchShort = (node.shortLabel || '').toLowerCase().includes(q);
      const matchSlug = node.slug.toLowerCase().includes(q);
      const matchId = node.id.toLowerCase().includes(q);
      const matchAlias = (node.aliases || []).some((a) => a.toLowerCase().includes(q));

      if (matchName || matchLabel || matchShort || matchSlug || matchId || matchAlias) {
        return true;
      }
      // Check if any descendant matches
      if (node.children && node.children.length > 0) {
        return node.children.some(matchesFilter);
      }
      return false;
    }
    return true;
  };

  const renderNodeRow = (node: TaxonomyNode, depth: number, index: number, totalSiblings: number) => {
    const isSelected = selectedNodeId === node.id;
    const isExpanded = Boolean(expandedNodes[node.id]) || Boolean(searchQuery.trim());
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const visibleChildren = (node.children || []).filter(matchesFilter);

    if (!matchesFilter(node) && visibleChildren.length === 0) {
      return null;
    }

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => onSelectNode(node)}
          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${
            isSelected
              ? 'bg-primary-light/80 border-primary text-primary font-bold shadow-xs'
              : 'border-transparent text-stone-700 hover:bg-bg-subtle hover:border-border-subtle'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 18 + 8)}px` }}
        >
          {/* Left: Expand, Icon, Labels, Badges */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => onToggleExpand(node.id, e)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
                title={isExpanded ? 'Replier' : 'Déplier'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5.5" />
            )}

            <CategoryIcon category={node} size="xs" />

            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate">{node.name}</span>

              {/* shortLabel pill if exists */}
              {node.shortLabel && node.shortLabel !== node.name && (
                <span className="shrink-0 text-micro bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.2 rounded-full font-normal">
                  {node.shortLabel}
                </span>
              )}
            </div>

            {/* Status indicators */}
            {node.status === 'draft' && (
              <span className="shrink-0 text-micro bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-bold uppercase">
                Brouillon
              </span>
            )}
            {node.status === 'deprecated' && (
              <span className="shrink-0 text-micro bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5">
                <Archive className="w-2.5 h-2.5" />
                Déprécié
              </span>
            )}
          </div>

          {/* Right: Quick actions (Reorder, Add Child, Count) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reorder Buttons */}
            {index > 0 && (
              <button
                type="button"
                onClick={(e) => onReorderNode(node.id, 'up', e)}
                className="p-1 rounded text-stone-500 hover:text-stone-700 hover:bg-stone-200/60"
                title="Monter d'un rang"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
            )}
            {index < totalSiblings - 1 && (
              <button
                type="button"
                onClick={(e) => onReorderNode(node.id, 'down', e)}
                className="p-1 rounded text-stone-500 hover:text-stone-700 hover:bg-stone-200/60"
                title="Descendre d'un rang"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            )}

            {/* Context Add Child */}
            {node.level !== 'subtype' && (
              <button
                type="button"
                onClick={(e) => onAddChild(node, e)}
                className="p-1 rounded text-stone-500 hover:text-primary hover:bg-primary-light"
                title="Ajouter une sous-rubrique"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}

            {/* Child Count */}
            {hasChildren && (
              <span className="text-micro text-stone-500 font-mono pl-1">
                {node.children!.length}
              </span>
            )}
          </div>
        </div>

        {/* Recursive Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 border-l border-stone-200/60 ml-4 pl-1">
            {visibleChildren.map((child, cIdx) =>
              renderNodeRow(child, depth + 1, cIdx, visibleChildren.length)
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredRoots = nodes.filter(matchesFilter);

  return (
    <div className="space-y-1 py-1 max-h-[700px] overflow-y-auto pr-1">
      {filteredRoots.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-500 border border-dashed rounded-2xl">
          <Layers className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="font-semibold text-stone-600">Aucune rubrique ne correspond à vos filtres.</p>
          <p className="text-micro text-stone-500 mt-1">
            Modifiez votre recherche ou réinitialisez les critères.
          </p>
        </div>
      ) : (
        filteredRoots.map((root, idx) =>
          renderNodeRow(root, 0, idx, filteredRoots.length)
        )
      )}
    </div>
  );
};
