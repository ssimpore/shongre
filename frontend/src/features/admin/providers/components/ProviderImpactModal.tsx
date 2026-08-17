import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Provider } from '../../../../domains/providers/provider.types';
import { providerService } from '../../../../domains/providers/provider.service';
import { Modal } from '../../../../design-system/primitives/Modal';
import { Button } from '../../../../design-system/primitives/Button';

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
  const [isProcessing, setIsProcessing] = React.useState(false);

  const impact = useMemo(() => {
    return providerService.analyzeImpact(provider.id, 'FR');
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
      title="Analyse d'Impact Opérationnel"
      maxWidth="lg"
    >
      <div className="space-y-5 p-1">
        {/* Warning banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-950">
              {customMessage || `Vous vous apprêtez à modifier la configuration de ${provider.name}.`}
            </p>
            <p className="text-amber-800">
              Veuillez examiner attentivement les répercussions sur les marchés territoriaux et les fonctionnalités en ligne.
            </p>
          </div>
        </div>

        {/* Impact Breakdown */}
        <div className="space-y-4 text-xs">
          {/* Affected Markets */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider text-micro">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Marchés Territoriaux Affectés
            </span>
            <div className="flex flex-wrap gap-1.5">
              {impact.directlyAffectedMarkets.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200">
                  {m} (Direct)
                </span>
              ))}
              {impact.inheritedMarketsAffected.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-medium">
                  {m} (Hérité de FR)
                </span>
              ))}
            </div>
            {impact.inheritedMarketsAffected.length > 0 && (
              <p className="text-micro text-stone-500 italic">
                Ces marchés héritent actuellement de la France et adopteront automatiquement ce changement.
              </p>
            )}
          </div>

          {/* Impacted Features */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider text-micro">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Fonctionnalités de la Marketplace Concernées
            </span>
            <div className="flex flex-wrap gap-1.5">
              {impact.impactedPlatformFeatures.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium border border-stone-200">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Fallback Availability */}
          <div className="p-3.5 rounded-lg border flex items-center justify-between bg-stone-50 border-stone-200">
            <div>
              <span className="font-bold text-stone-900 block">
                Disponibilité d'un prestataire de secours (Fallback)
              </span>
              <span className="text-micro text-stone-500">
                {impact.hasAlternativeFallback
                  ? 'Un prestataire secondaire prendra automatiquement le relais sans coupure de service.'
                  : 'Aucun secours configuré : la fonctionnalité sera temporairement indisponible pour les acheteurs.'}
              </span>
            </div>
            {impact.hasAlternativeFallback ? (
              <span className="text-emerald-700 bg-emerald-100 font-bold text-xs px-2 py-1 rounded">
                Secours Prêt
              </span>
            ) : (
              <span className="text-rose-700 bg-rose-100 font-bold text-xs px-2 py-1 rounded">
                Sans Secours
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
            Confirmer la modification
          </Button>
        </div>
      </div>
    </Modal>
  );
};
