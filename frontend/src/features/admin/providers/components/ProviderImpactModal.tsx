import React, { useMemo } from "react";
import { AlertTriangle, Globe, Layers } from "lucide-react";
import { Provider } from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { Modal } from "../../../../design-system/primitives/Modal";
import { Button } from "../../../../design-system/primitives/Button";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface ProviderImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  provider: Provider;
  customMessage?: string;
}

export const ProviderImpactModal: React.FC<ProviderImpactModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  provider,
  customMessage,
}) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const impact = useMemo(() => {
    return providerService.analyzeImpact(provider.id, "FR");
  }, [provider]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.providerImpactModal.analyseDImpactOperationnel")}
      maxWidth="lg"
    >
      <div className="space-y-5 p-1">
        {/* Warning banner */}
        <div className="p-4 rounded-xl bg-warning-surface border border-warning-border flex items-start gap-3 text-warning">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-warning">
              {customMessage ||
                `Vous vous apprêtez à modifier la configuration de ${provider.name}.`}
            </p>
            <p className="text-warning">
              {t(
                "admin.providerImpactModal.veuillezExaminerAttentivementLesRepercussions",
              )}
            </p>
          </div>
        </div>

        {/* Impact Breakdown */}
        <div className="space-y-4 text-xs">
          {/* Affected Markets */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider text-micro">
              <Globe className="w-3.5 h-3.5 text-info" />
              {t("admin.providerImpactModal.marchesTerritoriauxAffectes")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {impact.directlyAffectedMarkets.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded bg-info-surface text-info font-bold border border-info-border"
                >
                  {m} (Direct)
                </span>
              ))}
              {impact.inheritedMarketsAffected.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-medium"
                >
                  {m} (Hérité de FR)
                </span>
              ))}
            </div>
            {impact.inheritedMarketsAffected.length > 0 && (
              <p className="text-micro text-stone-500 italic">
                {t(
                  "admin.providerImpactModal.cesMarchesHeritentActuellementDe",
                )}
              </p>
            )}
          </div>

          {/* Impacted Features */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider text-micro">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {t(
                "admin.providerImpactModal.fonctionnalitesDeLaMarketplaceConcernees",
              )}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {impact.impactedPlatformFeatures.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium border border-stone-200"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Fallback Availability */}
          <div className="p-3.5 rounded-lg border flex items-center justify-between bg-stone-50 border-stone-200">
            <div>
              <span className="font-bold text-stone-900 block">
                {t("admin.providerImpactModal.disponibiliteDUnPrestataireDe")}
              </span>
              <span className="text-micro text-stone-500">
                {impact.hasAlternativeFallback
                  ? "Un prestataire secondaire prendra automatiquement le relais sans coupure de service."
                  : "Aucun secours configuré : la fonctionnalité sera temporairement indisponible pour les acheteurs."}
              </span>
            </div>
            {impact.hasAlternativeFallback ? (
              <span className="text-success bg-success-surface font-bold text-xs px-2 py-1 rounded">
                {t("admin.providerImpactModal.secoursPret")}
              </span>
            ) : (
              <span className="text-danger bg-danger-surface font-bold text-xs px-2 py-1 rounded">
                {t("admin.providerImpactModal.sansSecours")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isProcessing}
            onClick={handleConfirm}
            className="font-bold"
          >
            {t("admin.providerImpactModal.confirmerLaModification")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
