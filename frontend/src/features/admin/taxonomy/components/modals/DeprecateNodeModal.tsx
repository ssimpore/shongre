import React, { useState } from "react";
import { Select } from "../../../../../design-system";
import { TaxonomyNode } from "../../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../../repositories/taxonomy.repository";
import { Modal } from "../../../../../design-system/primitives/Modal";
import { Button } from "../../../../../design-system/primitives/Button";
import { FormField } from "../../../../../design-system/primitives/FormField";
import { useToast } from "../../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../../app/providers/AuthProvider";
import { Archive, ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export interface DeprecateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TaxonomyNode;
  allNodes: TaxonomyNode[];
  onSuccess: () => void;
}

export const DeprecateNodeModal: React.FC<DeprecateNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  allNodes,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const [replacementId, setReplacementId] = useState<string>(
    node.replacedById || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableReplacements = allNodes.filter(
    (n) =>
      n.id !== node.id &&
      n.status === "active" &&
      !n.ancestorIds?.includes(node.id),
  );

  const handleDeprecate = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.staffRole || currentUser.role,
          }
        : undefined;

      await taxonomyAdminRepository.deprecateNode(
        node.id,
        replacementId || undefined,
        actor,
      );
      toast.success(`Catégorie "${node.name}" dépréciée avec succès.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la dépréciation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Déprécier la catégorie "${node.name}"`}
      description={t(
        "admin.deprecateNodeModal.laDepreciationRetireCetteRubrique",
      )}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Safety Guarantees Notice */}
        <div className="p-3.5 bg-info-surface border border-info-border rounded-xl space-y-2 text-xs text-info">
          <div className="flex items-center gap-2 font-bold text-info">
            <ShieldCheck className="w-icon-md h-icon-md text-info" />
            <span>
              {t("admin.deprecateNodeModal.garantiesDeRetrocompatibilite")}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-info">
            <li>
              {t("admin.deprecateNodeModal.lesAnnoncesExistantesPublieesSous")}
            </li>
            <li>{t("admin.deprecateNodeModal.leWizardDePublicationNe")}</li>
            <li>{t("admin.deprecateNodeModal.siUnSuccesseurEstDefini")}</li>
          </ul>
        </div>

        <FormField
          label={t(
            "admin.deprecateNodeModal.categorieDeRemplacementSuccesseurLogique",
          )}
          hint="Recommandé : redirige les recherches et suggestions vers une nouvelle catégorie active."
        >
          <Select
            size="compact"
            className="w-full"
            labelledByAncestor
            value={replacementId}
            onChange={(e) => setReplacementId(e.target.value)}
          >
            <option value="">
              {t(
                "admin.deprecateNodeModal.aucunSuccesseurDirectDepreciationSimple",
              )}
            </option>
            {availableReplacements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} [{r.level} - /{r.slug}]
              </option>
            ))}
          </Select>
        </FormField>

        {replacementId && (
          <div className="p-3 bg-bg-subtle rounded-xl border border-border-subtle flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600">{node.name}</span>
            <ArrowRight className="w-icon-md h-icon-md text-primary" />
            <span className="font-bold text-primary">
              {allNodes.find((n) => n.id === replacementId)?.name}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeprecate}
            disabled={isSubmitting}
            leftIcon={<Archive className="w-icon-md h-icon-md" />}
          >
            {isSubmitting
              ? "Dépréciation en cours..."
              : "Confirmer la dépréciation"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
