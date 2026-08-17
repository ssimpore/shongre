import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  FolderTree,
  FileCheck,
  ShieldCheck,
  History,
  Download,
  AlertOctagon,
  AlertTriangle,
  GitCommit,
  Plus,
} from 'lucide-react';
import { taxonomyAdminRepository } from '../../repositories/taxonomy.repository';
import { taxonomyService } from '../../domains/taxonomy/taxonomy.service';
import { TaxonomyNode } from '../../domains/taxonomy/taxonomy.types';
import { Button } from '../../design-system/primitives/Button';
import { TaxonomyTreeToolbar } from './taxonomy/components/TaxonomyTreeToolbar';
import { TaxonomyHierarchyTree } from './taxonomy/components/TaxonomyHierarchyTree';
import { TaxonomyNodeEditor } from './taxonomy/components/TaxonomyNodeEditor';
import { TaxonomyAttributeRegistryTab } from './taxonomy/components/TaxonomyAttributeRegistryTab';
import { TaxonomyValidationTab } from './taxonomy/components/TaxonomyValidationTab';
import { TaxonomyDraftPublishTab } from './taxonomy/components/TaxonomyDraftPublishTab';
import { TaxonomyImportExportTab } from './taxonomy/components/TaxonomyImportExportTab';
import { TaxonomyAuditTab } from './taxonomy/components/TaxonomyAuditTab';
import { AddNodeModal } from './taxonomy/components/modals/AddNodeModal';
import { useToast } from '../../app/providers/ToastProvider';

export const AdminTaxonomyPage: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') || 'tree') as
    | 'tree'
    | 'attributes'
    | 'validation'
    | 'drafts'
    | 'import_export'
    | 'audit';

  const selectedNodeIdParam = searchParams.get('node') || 'vehicles';

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    vehicles: true,
    real_estate: true,
    home_garden: true,
    electronics: true,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addParentNode, setAddParentNode] = useState<TaxonomyNode | null>(null);

  // Trigger re-render whenever repository changes
  const [updateTick, setUpdateTick] = useState(0);

  const treeNodes = useMemo(() => taxonomyAdminRepository.getTree(), [updateTick]);
  const allNodes = useMemo(() => taxonomyAdminRepository.getAllNodes(), [updateTick]);
  const draftChanges = useMemo(() => taxonomyAdminRepository.getDraftChanges(), [updateTick]);
  const validationIssues = useMemo(() => taxonomyAdminRepository.validateTaxonomy(), [updateTick]);

  const blockingErrors = useMemo(
    () => validationIssues.filter((i) => i.severity === 'error'),
    [validationIssues]
  );

  const selectedNode = useMemo(() => {
    return (
      taxonomyAdminRepository.getNode(selectedNodeIdParam) ||
      allNodes.find((n) => n.id === 'vehicles') ||
      treeNodes[0]
    );
  }, [selectedNodeIdParam, allNodes, treeNodes, updateTick]);

  // Keep taxonomyService in sync with repository data
  useEffect(() => {
    taxonomyService.reload(treeNodes);
  }, [treeNodes]);

  const handleSelectTab = (tabKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabKey);
      return next;
    });
  };

  const handleSelectNode = (node: TaxonomyNode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('node', node.id);
      return next;
    });
  };

  const handleToggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    allNodes.forEach((n) => {
      allExpanded[n.id] = true;
    });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const handleReorder = async (nodeId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await taxonomyAdminRepository.reorderNode(nodeId, direction);
      setUpdateTick((t) => t + 1);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la réorganisation.');
    }
  };

  const handleOpenAdd = (parent: TaxonomyNode | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAddParentNode(parent);
    setIsAddModalOpen(true);
  };

  const handleDataUpdated = () => {
    setUpdateTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border-base shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-light text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-stone-900 tracking-tight">
              Gestion & Administration de la Taxonomie
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1.5 max-w-2xl">
            Référentiel canonique unique pilotant l'arborescence, les formulaires de publication, les facettes de recherche, les capacités de séquestre et le multi-marchés.
          </p>
        </div>

        {/* Global Status Badges & Quick Action */}
        <div className="flex items-center gap-3 flex-wrap">
          {blockingErrors.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectTab('validation')}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{blockingErrors.length} bloquant(s)</span>
            </button>
          )}

          {draftChanges.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSelectTab('drafts')}
              leftIcon={<GitCommit className="w-3.5 h-3.5" />}
            >
              {draftChanges.length} brouillon(s) à publier
            </Button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Taxonomie Synchronisée</span>
            </span>
          )}
        </div>
      </div>

      {/* Top Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border-base overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          { id: 'tree', label: 'Arborescence & Nœuds', icon: FolderTree, badge: undefined },
          {
            id: 'attributes',
            label: 'Registre des Attributs',
            icon: Layers,
            badge: undefined,
          },
          {
            id: 'validation',
            label: 'Validation & Qualité',
            icon: ShieldCheck,
            badge: blockingErrors.length > 0 ? `${blockingErrors.length}` : undefined,
            badgeClass: 'bg-red-600 text-white',
          },
          {
            id: 'drafts',
            label: 'Brouillons & Publication',
            icon: GitCommit,
            badge: draftChanges.length > 0 ? `${draftChanges.length}` : undefined,
            badgeClass: 'bg-amber-500 text-white',
          },
          {
            id: 'import_export',
            label: 'Import / Export (JSON)',
            icon: Download,
            badge: undefined,
          },
          {
            id: 'audit',
            label: 'Historique & Audit',
            icon: History,
            badge: undefined,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-primary text-primary font-bold bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-micro px-1.5 py-0.2 rounded-full font-bold ${
                    tab.badgeClass || 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. HIERARCHICAL TREE & INSPECTOR TAB */}
      {/* ========================================================================= */}
      {currentTab === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Toolbar + Tree View */}
          <div className="lg:col-span-5 space-y-4">
            <TaxonomyTreeToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              levelFilter={levelFilter}
              onLevelFilterChange={setLevelFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onAddRootCategory={() => handleOpenAdd(null)}
            />

            <div className="bg-white rounded-2xl border border-border-base p-4 shadow-xs">
              <TaxonomyHierarchyTree
                nodes={treeNodes}
                selectedNodeId={selectedNode?.id}
                onSelectNode={handleSelectNode}
                expandedNodes={expandedNodes}
                onToggleExpand={handleToggleExpand}
                onReorderNode={handleReorder}
                onAddChild={(parent, e) => handleOpenAdd(parent, e)}
                searchQuery={searchQuery}
                levelFilter={levelFilter}
                statusFilter={statusFilter}
              />
            </div>
          </div>

          {/* Right Column: Node Inspector & Editor */}
          <div className="lg:col-span-7">
            {selectedNode ? (
              <TaxonomyNodeEditor
                nodeId={selectedNode.id}
                allNodes={allNodes}
                onNodeUpdated={handleDataUpdated}
                onSelectNode={handleSelectNode}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-border-base p-12 text-center text-xs text-stone-500">
                Sélectionnez une catégorie dans l'arbre pour afficher son éditeur.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTRIBUTE REGISTRY TAB */}
      {/* ========================================================================= */}
      {currentTab === 'attributes' && <TaxonomyAttributeRegistryTab />}

      {/* ========================================================================= */}
      {/* 3. VALIDATION QUALITY GATE TAB */}
      {/* ========================================================================= */}
      {currentTab === 'validation' && (
        <TaxonomyValidationTab
          onNavigateToNode={(node) => {
            handleSelectTab('tree');
            handleSelectNode(node);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. DRAFT PUBLICATION TAB */}
      {/* ========================================================================= */}
      {currentTab === 'drafts' && (
        <TaxonomyDraftPublishTab onPublishSuccess={handleDataUpdated} />
      )}

      {/* ========================================================================= */}
      {/* 5. IMPORT / EXPORT TAB */}
      {/* ========================================================================= */}
      {currentTab === 'import_export' && (
        <TaxonomyImportExportTab onImportSuccess={handleDataUpdated} />
      )}

      {/* ========================================================================= */}
      {/* 6. AUDIT HISTORY TAB */}
      {/* ========================================================================= */}
      {currentTab === 'audit' && <TaxonomyAuditTab />}

      {/* Context-Aware Add Child / Category Modal */}
      <AddNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parentNode={addParentNode}
        onSuccess={(newNode) => {
          handleDataUpdated();
          handleSelectNode(newNode);
          if (addParentNode) {
            setExpandedNodes((prev) => ({ ...prev, [addParentNode.id]: true }));
          }
        }}
      />
    </div>
  );
};
