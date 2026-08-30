import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Layers,
  FolderTree,
  ShieldCheck,
  History,
  Download,
  AlertOctagon,
  GitCommit,
  Database,
  ListOrdered,
} from "lucide-react";
import { taxonomyAdminRepository } from "../../repositories/taxonomy.repository";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";
import { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import { Button } from "../../design-system/primitives/Button";
import { ScrollRail } from "../../design-system/primitives/ScrollRail";
import { TaxonomyTreeToolbar } from "./taxonomy/components/TaxonomyTreeToolbar";
import { TaxonomyHierarchyTree } from "./taxonomy/components/TaxonomyHierarchyTree";
import { TaxonomyNodeEditor } from "./taxonomy/components/TaxonomyNodeEditor";
import { TaxonomyAttributeRegistryTab } from "./taxonomy/components/TaxonomyAttributeRegistryTab";
import { TaxonomyValidationTab } from "./taxonomy/components/TaxonomyValidationTab";
import { TaxonomyDraftPublishTab } from "./taxonomy/components/TaxonomyDraftPublishTab";
import { TaxonomyImportExportTab } from "./taxonomy/components/TaxonomyImportExportTab";
import { TaxonomyAuditTab } from "./taxonomy/components/TaxonomyAuditTab";
import { AddNodeModal } from "./taxonomy/components/modals/AddNodeModal";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { TaxonomyV4GovernanceTab } from "./taxonomy/components/TaxonomyV4GovernanceTab";
import { TaxonomyHeaderNavigationTab } from "./taxonomy/components/TaxonomyHeaderNavigationTab";

export const AdminTaxonomyPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminTaxonomy.title"),
    description: t("meta.adminTaxonomy.description"),
    canonicalPath: "/admin/taxonomie",
    noIndex: true,
  });

  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get("tab") || "tree") as
    | "tree"
    | "header"
    | "attributes"
    | "governance"
    | "validation"
    | "drafts"
    | "import_export"
    | "audit";

  const selectedNodeIdParam = searchParams.get("node") || "vehicles";

  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const treeNodes = useMemo(
    () => taxonomyAdminRepository.getTree(),
    [updateTick],
  );
  const allNodes = useMemo(
    () => taxonomyAdminRepository.getAllNodes(),
    [updateTick],
  );
  const draftChanges = useMemo(
    () => taxonomyAdminRepository.getDraftChanges(),
    [updateTick],
  );
  const validationIssues = useMemo(
    () => taxonomyAdminRepository.validateTaxonomy(),
    [updateTick],
  );

  const blockingErrors = useMemo(
    () => validationIssues.filter((i) => i.severity === "error"),
    [validationIssues],
  );

  const selectedNode = useMemo(() => {
    return (
      taxonomyAdminRepository.getNode(selectedNodeIdParam) ||
      allNodes.find((n) => n.id === "vehicles") ||
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
      next.set("tab", tabKey);
      return next;
    });
  };

  const handleSelectNode = (node: TaxonomyNode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("node", node.id);
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

  const handleReorder = async (
    nodeId: string,
    direction: "up" | "down",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      await taxonomyAdminRepository.reorderNode(nodeId, direction);
      setUpdateTick((t) => t + 1);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la réorganisation.");
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-surface p-6 rounded-2xl border border-border-base shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-control bg-primary-light text-primary">
              <Layers className="w-icon-lg h-icon-lg" />
            </div>
            <h1 className="text-xl font-black text-text-main tracking-tight">
              {t("admin.adminTaxonomyPage.gestionAdministrationDeLaTaxonomie")}
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1.5 max-w-2xl">
            {t("admin.adminTaxonomyPage.referentielCanoniqueUniquePilotantL")}
          </p>
        </div>

        {/* Global Status Badges & Quick Action */}
        <div className="flex items-center gap-3 flex-wrap">
          {blockingErrors.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectTab("validation")}
              className="px-3 py-1.5 rounded-control bg-danger-surface text-danger border border-danger-border text-xs font-bold flex items-center gap-1.5 hover:bg-danger-surface transition-colors cursor-pointer"
            >
              <AlertOctagon className="w-icon-md h-icon-md" />
              <span>{blockingErrors.length} bloquant(s)</span>
            </button>
          )}

          {draftChanges.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSelectTab("drafts")}
              leftIcon={<GitCommit className="w-icon-sm h-icon-sm" />}
            >
              {draftChanges.length} {t("admin.adminTaxonomyPage.brouillonSAPublier")}
            </Button>
          ) : (
            <span className="px-3 py-1.5 rounded-control bg-success-surface text-success border border-success-border text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-icon-md h-icon-md text-success" />
              <span>{t("admin.adminTaxonomyPage.taxonomieSynchronisee")}</span>
            </span>
          )}
        </div>
      </div>

      {/* Top Workspace Navigation Tabs.
          Six tabs overflow a 1440px viewport, so the rail has to advertise it —
          the last tab used to be clipped exactly at the boundary and read as
          missing entirely. */}
      <ScrollRail label="onglets" className="border-b border-border-base">
        <div className="flex items-center gap-1 text-xs font-semibold w-max">
          {[
            {
              id: "tree",
              label: t("admin.adminTaxonomyPage.arborescenceNoeuds"),
              icon: FolderTree,
              badge: undefined,
            },
            {
              id: "attributes",
              label: t("admin.adminTaxonomyPage.registreDesAttributs"),
              icon: Layers,
              badge: undefined,
            },
            {
              id: "header",
              label: t("admin.taxonomyHeader.tabLabel"),
              icon: ListOrdered,
              badge: undefined,
            },
            {
              id: "governance",
              label: t("admin.adminTaxonomyPage.schemaV4Migration"),
              icon: Database,
              badge: undefined,
            },
            {
              id: "validation",
              label: t("admin.adminTaxonomyPage.validationQualite"),
              icon: ShieldCheck,
              badge:
                blockingErrors.length > 0
                  ? `${blockingErrors.length}`
                  : undefined,
              badgeClass: "bg-danger text-text-inverse",
            },
            {
              id: "drafts",
              label: "Brouillons & Publication",
              icon: GitCommit,
              badge:
                draftChanges.length > 0 ? `${draftChanges.length}` : undefined,
              badgeClass: "bg-amber-500 text-text-inverse",
            },
            {
              id: "import_export",
              label: "Import / Export (JSON)",
              icon: Download,
              badge: undefined,
            },
            {
              id: "audit",
              label: "Historique & Audit",
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
                    ? "border-primary text-primary font-bold bg-bg-surface"
                    : "border-transparent text-stone-500 hover:text-text-main hover:border-stone-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-micro px-1.5 py-0.5 rounded-pill font-bold ${
                      tab.badgeClass || "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollRail>

      {/* ========================================================================= */}
      {/* 1. HIERARCHICAL TREE & INSPECTOR TAB */}
      {/* ========================================================================= */}
      {currentTab === "tree" && (
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

            <div className="bg-bg-surface rounded-2xl border border-border-base p-4 shadow-xs">
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
              <div className="bg-bg-surface rounded-2xl border border-border-base p-12 text-center text-xs text-stone-500">
                {t("admin.adminTaxonomyPage.selectionnezUneCategorieDansL")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTRIBUTE REGISTRY TAB */}
      {/* ========================================================================= */}
      {currentTab === "attributes" && <TaxonomyAttributeRegistryTab />}

      {currentTab === "header" && <TaxonomyHeaderNavigationTab />}

      {currentTab === "governance" && <TaxonomyV4GovernanceTab />}

      {/* ========================================================================= */}
      {/* 3. VALIDATION QUALITY GATE TAB */}
      {/* ========================================================================= */}
      {currentTab === "validation" && (
        <TaxonomyValidationTab
          onNavigateToNode={(node) => {
            handleSelectTab("tree");
            handleSelectNode(node);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. DRAFT PUBLICATION TAB */}
      {/* ========================================================================= */}
      {currentTab === "drafts" && (
        <TaxonomyDraftPublishTab onPublishSuccess={handleDataUpdated} />
      )}

      {/* ========================================================================= */}
      {/* 5. IMPORT / EXPORT TAB */}
      {/* ========================================================================= */}
      {currentTab === "import_export" && (
        <TaxonomyImportExportTab onImportSuccess={handleDataUpdated} />
      )}

      {/* ========================================================================= */}
      {/* 6. AUDIT HISTORY TAB */}
      {/* ========================================================================= */}
      {currentTab === "audit" && <TaxonomyAuditTab />}

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
