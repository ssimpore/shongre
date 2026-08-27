import React, { useState } from "react";
import { TaxonomyNode } from "../../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../../repositories/taxonomy.repository";
import { Modal } from "../../../../../design-system/primitives/Modal";
import { Button } from "../../../../../design-system/primitives/Button";
import { useToast } from "../../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../../app/providers/AuthProvider";
import { Trash2, AlertOctagon, Archive } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export interface DeleteNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TaxonomyNode;
  onSuccess: () => void;
  onSwitchToDeprecate: () => void;
}

export const DeleteNodeModal: React.FC<DeleteNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  onSuccess,
  onSwitchToDeprecate,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const impact = taxonomyAdminRepository.analyzeNodeImpact(node.id);

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.role,
          }
        : undefined;

      const res = await taxonomyAdminRepository.deleteNode(node.id, actor);
      if (!res.success) {
        toast.error(res.message || "Suppression impossible.");
        return;
      }

      toast.success(`Nœud "${node.name}" supprimé définitivement.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Supprimer définitivement "${node.name}" ?`}
      description={t(
        "admin.deleteNodeModal.laSuppressionPermanenteEstStrictement",
      )}
      maxWidth="md"
    >
      <div className="space-y-4">
        {!impact.isSafeToDelete ? (
          <div className="p-4 bg-danger-surface border border-danger-border rounded-xl space-y-3 text-xs text-danger">
            <div className="flex items-center gap-2 font-bold text-danger">
              <AlertOctagon className="w-icon-lg h-icon-lg shrink-0" />
              <span>
                {t("admin.deleteNodeModal.suppressionBloqueeParLesRegles")}
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-danger">
              {impact.blockingReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
            <p className="pt-1 text-stone-600">
              {t("admin.deleteNodeModal.pourEviterDInvaliderDes")}
              <strong>{t("admin.deleteNodeModal.deprecier")}</strong> cette
              catégorie plutôt que de la supprimer.
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
            <p className="font-semibold text-stone-900">
              {t("admin.deleteNodeModal.ceNUdEstEligible")}
            </p>
            <p className="text-stone-500 mt-1">
              {t("admin.deleteNodeModal.aucuneAnnonceActiveNiSous")}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <div>
            {!impact.isSafeToDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onSwitchToDeprecate();
                }}
                leftIcon={
                  <Archive className="w-icon-md h-icon-md text-warning" />
                }
              >
                {t("admin.deleteNodeModal.deprecierALaPlace")}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={!impact.isSafeToDelete || isSubmitting}
              leftIcon={<Trash2 className="w-icon-md h-icon-md" />}
            >
              {isSubmitting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
