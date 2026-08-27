import React, { useState } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import { UserProfile } from "../../../types";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { useToast } from "../../../app/providers/ToastProvider";
import { userRepository } from "../../../repositories/user.repository";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface SellerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: UserProfile;
}

const REPORT_REASONS = [
  { id: "scam", label: "Suspicion d'arnaque ou d'escroquerie" },
  { id: "counterfeit", label: "Contrefaçon, article interdit ou illicite" },
  { id: "harassment", label: "Comportement abusif, injures ou harcèlement" },
  { id: "impersonation", label: "Usurpation d'identité ou de société" },
  {
    id: "offline_payment",
    label: "Demande de paiement hors de la plateforme sécurisée",
  },
  { id: "other", label: "Autre motif" },
];

export const SellerReportModal: React.FC<SellerReportModalProps> = ({
  isOpen,
  onClose,
  seller,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].id);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await userRepository.reportUser({
        targetUserId: seller.id,
        targetUserName: seller.companyName || seller.name,
        reason: selectedReason,
        comment: comment.trim(),
      });

      toast.success(
        "Votre signalement a été transmis à l'équipe de modération Shongre. Merci de votre vigilance.",
      );
      setComment("");
      onClose();
    } catch {
      toast.error("Une erreur est survenue lors de l'envoi du signalement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("profile.sellerReportModal.signalerCeProfil")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-warning-surface rounded-xl border border-warning-border text-xs text-warning">
          <AlertTriangle className="w-icon-md h-icon-md text-warning shrink-0 mt-0.5" />
          <p>
            Vous êtes sur le point de signaler le profil de{" "}
            <strong>{seller.companyName || seller.name}</strong>. Nos équipes de
            sécurité examineront ce dossier sous 24h.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-900 mb-2">
            {t("profile.sellerReportModal.motifPrincipalDuSignalement")}
          </label>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  selectedReason === r.id
                    ? "border-primary bg-bg-base text-stone-950 font-bold"
                    : "border-border-base hover:bg-bg-base text-stone-700"
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={selectedReason === r.id}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="accent-primary text-primary focus:ring-primary"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-900 mb-1">
            {t(
              "profile.sellerReportModal.detailsComplementairesFacultatifMaisRecommande",
            )}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t(
              "profile.sellerReportModal.decrivezPrecisementLesFaitsConstates",
            )}
            rows={3}
            className="w-full p-3 bg-bg-base border border-border-base rounded-control text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:border-primary min-h-control-touch"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Flag className="w-icon-sm h-icon-sm" />}
          >
            {t("profile.sellerReportModal.envoyerLeSignalement")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
