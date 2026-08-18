import React, { useState } from 'react';
import { Sparkles, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../../design-system/primitives/Modal';
import { Button } from '../../../../design-system/primitives/Button';
import { CrmCompany, CompanyEnrichmentDiff } from '../../../../domains/crm/crm.types';

interface EnrichmentDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CrmCompany;
  diff: CompanyEnrichmentDiff | null;
  onApply: (appliedUpdates: Partial<CrmCompany>) => Promise<void>;
}

export const EnrichmentDiffModal: React.FC<EnrichmentDiffModalProps> = ({
  isOpen,
  onClose,
  company,
  diff,
  onApply,
}) => {
  const [applyIndustry, setApplyIndustry] = useState(true);
  const [applyWebsite, setApplyWebsite] = useState(true);
  const [applySummary, setApplySummary] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  if (!diff) return null;

  const handleConfirm = async () => {
    setIsApplying(true);
    try {
      const updates: Partial<CrmCompany> = {};
      if (applyIndustry && diff.suggestedIndustry) updates.industry = diff.suggestedIndustry;
      if (applyWebsite && diff.suggestedWebsite) {
        updates.website = diff.suggestedWebsite;
        updates.domain = diff.suggestedWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '');
      }
      if (applySummary && diff.suggestedSummary) updates.aiSummary = diff.suggestedSummary;

      await onApply(updates);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enrichissement IA : ${company.name}`}
      description="Examinez et sélectionnez les informations publiques suggérées avant mise à jour."
    >
      <div className="space-y-4 text-xs">
        {/* Industry Diff */}
        {diff.suggestedIndustry && (
          <label className="p-3.5 border border-stone-200 rounded-2xl bg-stone-50 flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyIndustry}
              onChange={(e) => setApplyIndustry(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300 mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <span className="font-bold text-stone-900 block">Secteur d'activité</span>
              <div className="grid grid-cols-2 gap-2 text-micro">
                <div className="text-stone-500">
                  Actuel : <strong className="text-stone-700">{company.industry || 'Non renseigné'}</strong>
                </div>
                <div className="text-success font-bold">
                  Suggéré : {diff.suggestedIndustry}
                </div>
              </div>
            </div>
          </label>
        )}

        {/* Website Diff */}
        {diff.suggestedWebsite && (
          <label className="p-3.5 border border-stone-200 rounded-2xl bg-stone-50 flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyWebsite}
              onChange={(e) => setApplyWebsite(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300 mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <span className="font-bold text-stone-900 block">Site internet officiel</span>
              <div className="grid grid-cols-2 gap-2 text-micro">
                <div className="text-stone-500 truncate">
                  Actuel : <strong className="text-stone-700">{company.website || 'Non renseigné'}</strong>
                </div>
                <div className="text-success font-bold truncate">
                  Suggéré : {diff.suggestedWebsite}
                </div>
              </div>
            </div>
          </label>
        )}

        {/* Summary Diff */}
        {diff.suggestedSummary && (
          <label className="p-3.5 border border-stone-200 rounded-2xl bg-stone-50 flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applySummary}
              onChange={(e) => setApplySummary(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300 mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <span className="font-bold text-stone-900 block">Synthèse commerciale IA</span>
              <p className="text-micro text-stone-700 leading-relaxed bg-white p-2 rounded-lg border border-stone-200">
                {diff.suggestedSummary}
              </p>
            </div>
          </label>
        )}

        {/* Sources Notice */}
        <div className="p-3 bg-stone-100 rounded-xl flex items-center justify-between text-micro text-stone-500">
          <span>Sources analysées : {diff.sources.length} site(s) public(s)</span>
          <span className="font-bold text-stone-700">100% Validé humain</span>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={isApplying}
            className="font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isApplying ? 'Application...' : 'Appliquer les modifications'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
