import React from 'react';
import { AlertCircle, Building2, ExternalLink } from 'lucide-react';
import { Modal } from '../../../../design-system/primitives/Modal';
import { Button } from '../../../../design-system/primitives/Button';
import { CrmCompany, ProspectResearchCandidate } from '../../../../domains/crm/crm.types';
import { useTranslation } from '../../../../i18n/I18nProvider';

interface DuplicateConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ProspectResearchCandidate | null;
  matchedCompany?: CrmCompany | null;
  onAssociate: () => void;
  onCreateSeparate: () => void;
}

export const DuplicateConflictModal: React.FC<DuplicateConflictModalProps> = ({
  isOpen,
  onClose,
  candidate,
  matchedCompany,
  onAssociate,
  onCreateSeparate,
}) => {
  const { t } = useTranslation();
  if (!candidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.duplicateConflictModal.entrepriseExistanteDetectee')}
      description={t('admin.duplicateConflictModal.uneCorrespondanceAEteTrouvee')}
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 bg-warning-surface border border-warning-border rounded-2xl flex items-start gap-2.5 text-warning">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">{t('admin.duplicateConflictModal.doublonPotentielIdentifie')}</span>
            <p className="text-warning text-micro leading-relaxed">
              L'entreprise <strong className="text-stone-900">{candidate.company.name}</strong> partage le même domaine web ou nom commercial qu'une entité existante.
            </p>
          </div>
        </div>

        {matchedCompany && (
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <span className="text-micro font-bold text-stone-500 uppercase tracking-wider block">
              Fiche CRM existante
            </span>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-stone-900 text-xs block">{matchedCompany.name}</span>
                <span className="text-stone-500 text-micro">{matchedCompany.industry} • {matchedCompany.location?.city || 'France'}</span>
              </div>
              <span className="font-bold text-primary font-mono text-micro">
                Statut : {matchedCompany.lifecycle}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateSeparate}>
            Créer quand même séparé
          </Button>
          <Button variant="primary" size="sm" onClick={onAssociate} className="font-bold">
            Associer la recherche à l'existant
          </Button>
        </div>
      </div>
    </Modal>
  );
};
