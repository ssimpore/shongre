import React, { useState } from "react";
import { Select } from "../../../design-system";
import { AlertTriangle } from "lucide-react";
import { Transaction, UserProfile } from "../../../types";
import { TRANSACTION_CONFIG } from "../../../configuration/transaction.config";
import { services } from "../../../api/client/service-registry";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: UserProfile;
  onSuccess: (updatedTx: Transaction) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState(TRANSACTION_CONFIG.disputeReasons[0].id);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 15) {
      setError(
        "Veuillez décrire le problème en détail (au moins 15 caractères).",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedReason =
        TRANSACTION_CONFIG.disputeReasons.find((r) => r.id === reason)?.label ||
        reason;
      const updated = await services.orders.openDispute(
        transaction.id,
        selectedReason,
        description.trim(),
      );
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ouverture du litige.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("transactions.disputeModal.signalerUnProblemeOuvrirUn")}
      description="Le dossier sera enregistré côté serveur et transmis à l’équipe compétente."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm font-medium">
        <div className="p-4 bg-warning-surface border border-warning-border rounded-2xl text-warning flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-icon-lg h-icon-lg text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-warning">
              {t("transactions.disputeModal.protectionAcheteurVendeurActive")}
            </p>
            <p className="text-xs text-warning mt-1 font-medium">
              Décrivez précisément les faits. Les actions financières sont
              traitées séparément par les équipes autorisées.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-danger-surface border border-danger-border text-danger rounded-2xl font-bold text-sm shadow-2xs">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="dispute-reason"
            className="block font-bold text-stone-700 mb-2"
          >
            {t("transactions.disputeModal.motifPrincipalDuLitige")}
            <span className="text-danger">*</span>
          </label>
          <Select
            size="lg"
            className="w-full"
            id="dispute-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {TRANSACTION_CONFIG.disputeReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block font-bold text-stone-700 mb-2">
            {t("transactions.disputeModal.descriptionDetailleeDesFaits")}
            <span className="text-danger">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("transactions.disputeModal.expliquezCeQuiSEst")}
            className="w-full p-4 bg-white text-stone-900 rounded-control border border-stone-200/60 shadow-inner focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none font-medium transition-colors min-h-control-touch"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onClose}
            size="md"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            size="md"
          >
            {isSubmitting ? "Envoi du dossier..." : "Déposer la réclamation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
