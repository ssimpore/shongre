import React, { useState } from "react";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";
import { Flag, AlertTriangle } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { useToast } from "../../../app/providers/ToastProvider";
import { services } from "../../../api/client/service-registry";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface SellerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: { id: string; name: string };
  reviewId?: string;
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
  reviewId,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].id);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A review is a report target of its own, so the identifier no longer
  // travels in the free text; the chosen motive still does, which also keeps
  // the details above the moderation minimum when the comment is left empty.
  const reportContext = reviewId
    ? `Avis signalé : ${REPORT_REASONS.find((r) => r.id === selectedReason)?.label ?? selectedReason}`
    : `Profile report: ${selectedReason}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await services.moderation.submitReport({
        ...(reviewId ? { reviewId } : { reportedUserId: seller.id }),
        reason:
          selectedReason === "scam" ||
          selectedReason === "offline_payment" ||
          selectedReason === "impersonation"
            ? "fraud"
            : selectedReason === "harassment"
              ? "harassment"
              : selectedReason === "counterfeit"
                ? "counterfeit"
                : "other",
        details: [reportContext, comment.trim()].filter(Boolean).join("\n"),
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
      title={t(
        reviewId
          ? "reviews.report"
          : "profile.sellerReportModal.signalerCeProfil",
      )}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-warning-surface rounded-xl border border-warning-border text-xs text-warning">
          <AlertTriangle className="w-icon-md h-icon-md text-warning shrink-0 mt-0.5" />
          <p>
            {t("reviews.reportDescription", {
              name: seller.name,
            })}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-main mb-2">
            {t("profile.sellerReportModal.motifPrincipalDuSignalement")}
          </label>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  selectedReason === r.id
                    ? "border-primary bg-bg-base text-text-deep font-semibold"
                    : "border-border-base hover:bg-bg-base text-text-emphasis"
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
          <label className="block text-xs font-semibold text-text-main mb-1">
            {t(
              "profile.sellerReportModal.detailsComplementairesFacultatifMaisRecommande",
            )}
          </label>
          <textarea
            aria-label={t(
              "profile.sellerReportModal.detailsComplementairesFacultatifMaisRecommande",
            )}
            maxLength={
              MODERATION_CONSTRAINTS.reportDetailsMaxLength -
              reportContext.length -
              1
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t(
              "profile.sellerReportModal.decrivezPrecisementLesFaitsConstates",
            )}
            rows={3}
            className="w-full p-3 bg-bg-base border border-border-base rounded-control text-xs text-text-main focus:bg-bg-surface focus:outline-hidden focus:border-primary min-h-control-touch"
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
