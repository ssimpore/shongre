import React, { useState } from "react";
import { TaxonomyNode } from "../../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../../repositories/taxonomy.repository";
import { Modal } from "../../../../../design-system/primitives/Modal";
import { Button } from "../../../../../design-system/primitives/Button";
import { FormField } from "../../../../../design-system/primitives/FormField";
import { CategoryIcon } from "../../../../../design-system/primitives/CategoryIcon";
import { useToast } from "../../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../../app/providers/AuthProvider";
import { FolderTree, AlertTriangle } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export interface MoveNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TaxonomyNode;
  allNodes: TaxonomyNode[];
  onSuccess: () => void;
}

export const MoveNodeModal: React.FC<MoveNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  allNodes,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const [selectedParentId, setSelectedParentId] = useState<string>(
    node.parentId || "root",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const impact = taxonomyAdminRepository.analyzeNodeImpact(node.id);

  // Filter out invalid parents (self and any descendant)
  const validParents = allNodes.filter((candidate) => {
    if (candidate.id === node.id) return false;
    if (candidate.ancestorIds?.includes(node.id)) return false;
    return true;
  });

  const handleMove = async () => {
    try {
      setIsSubmitting(true);
      const targetParentId =
        selectedParentId === "root" ? null : selectedParentId;
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.role,
          }
        : undefined;

      await taxonomyAdminRepository.moveNode(node.id, targetParentId, actor);
      toast.success(`Branche "${node.name}" déplacée avec succès.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du déplacement de la branche.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Déplacer la branche "${node.name}"`}
      description={t("admin.moveNodeModal.reorganisezLaHierarchieEnDeplacant")}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Source Node Info */}
        <div className="p-3 bg-bg-subtle rounded-xl border border-border-subtle flex items-center gap-3">
          <CategoryIcon category={node} size="md" withBackground />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                {node.level}
              </span>
              <span className="font-bold text-stone-900">{node.name}</span>
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              ID : {node.id} • Slug : /{node.slug}
            </p>
          </div>
        </div>

        {/* Impact Warning */}
        <div className="p-3.5 bg-warning-surface border border-warning-border rounded-xl space-y-1.5 text-xs text-warning">
          <div className="flex items-center gap-1.5 font-bold text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {t("admin.moveNodeModal.impactStructurelDuDeplacement")}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-warning/90">
            <li>
              <strong>{impact.descendantsCount}</strong> sous-catégories / types
              enfants seront déplacés.
            </li>
            <li>
              <strong>~{impact.activeListingsCount}</strong> annonces actives
              conserveront leur liaison d'ID stable sans rupture.
            </li>
            <li>{t("admin.moveNodeModal.lesCapacitesEtAttributsHerites")}</li>
          </ul>
        </div>

        <FormField
          label={t("admin.moveNodeModal.choisirLeNouveauParentDe")}
          required
        >
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="w-full h-control-md px-3 bg-bg-base border border-border-base rounded-control text-xs font-semibold"
          >
            <option value="root">
              {t("admin.moveNodeModal.racinePrincipaleNiveauCategorieRacine")}
            </option>
            {validParents.map((p) => {
              const depth = p.ancestorIds ? p.ancestorIds.length : 0;
              const indent = "—".repeat(depth) + (depth > 0 ? " " : "");
              return (
                <option key={p.id} value={p.id}>
                  {indent}
                  {p.name} [{p.level}]
                </option>
              );
            })}
          </select>
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMove}
            disabled={
              isSubmitting || selectedParentId === (node.parentId || "root")
            }
            leftIcon={<FolderTree className="w-4 h-4" />}
          >
            {isSubmitting
              ? "Déplacement en cours..."
              : "Confirmer le déplacement"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
