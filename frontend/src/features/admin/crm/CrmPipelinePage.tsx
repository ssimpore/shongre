import React, { useState, useEffect } from 'react';
import {
  
  PlusCircle,
  ChevronRight,
  ChevronLeft,
  
  Building2
  
  
  
} from 'lucide-react';
import { Button } from '../../../design-system/primitives/Button';
import { Modal } from '../../../design-system/primitives/Modal';
import { FormField, Input, Select } from '../../../design-system/primitives/FormField';
import { crmRepository } from '../../../repositories/crm.repository';
import { CrmOpportunity, OpportunityStage, OpportunityType } from '../../../domains/crm/crm.types';
import { crmService, PIPELINE_STAGES } from '../../../domains/crm/crm.service';
import { useToast } from '../../../app/providers/ToastProvider';
import { useTranslation } from '../../../i18n/I18nProvider';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';

export const CrmPipelinePage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.crmPipeline.title'),
    description: t('meta.crmPipeline.description'),
    canonicalPath: '/admin/crm/pipeline',
    noIndex: true,
  });

  const toast = useToast();
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Opportunity Form
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [oppType, setOppType] = useState<OpportunityType>('pro_seller_acquisition');
  const [amountEuros, setAmountEuros] = useState('588');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const list = await crmRepository.listOpportunities();
      setOpportunities(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleStageChange = async (oppId: string, newStage: OpportunityStage) => {
    try {
      await crmRepository.updateOpportunityStage(oppId, newStage);
      fetchOpportunities();
      toast.success('Étape mise à jour avec succès.', 'Opportunité déplacée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du déplacement.');
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Le titre de l\'opportunité est obligatoire.');
      return;
    }

    const valueMinor = Math.round(parseFloat(amountEuros || '0') * 100);

    setIsSubmitting(true);
    try {
      await crmRepository.createOpportunity({
        title: title.trim(),
        companyName: companyName.trim() || 'Entreprise Prospect',
        primaryContactName: contactName.trim() || undefined,
        type: oppType,
        stage: 'new',
        estimatedValue: { amountMinor: valueMinor, currency: 'EUR' },
        probability: 30,
        ownerName: 'Antoine Fabre',
        marketCode: 'FR',
      });

      setIsCreateModalOpen(false);
      setTitle('');
      setCompanyName('');
      setContactName('');
      setAmountEuros('588');
      fetchOpportunities();
      toast.success('Opportunité créée dans le pipeline.', 'Nouvelle opportunité');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute total pipeline amount
  const totalPipelineValue = opportunities
    .filter((o) => o.stage !== 'lost')
    .reduce((sum, o) => sum + o.estimatedValue.amountMinor, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">{t('admin.crmPipelinePage.pipelineDesVentesForfaitsPro')}</h1>
            <span className="text-xs bg-primary-light text-primary font-black px-2.5 py-0.5 rounded-full">
              {crmService.formatCrmMoney({ amountMinor: totalPipelineValue, currency: 'EUR' })}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">{t('admin.crmPipelinePage.suiviDesNegociationsAbonnementsPro')}</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="font-bold flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('admin.crmPipelinePage.nouvelleOpportunite')}</span>
        </Button>
      </div>

      {/* 2. Kanban Columns */}
      {/* The kanban is wider than any viewport once the pipeline has more than
          three stages, and the bare `overflow-x-auto` gave no cue: on macOS the
          overlay scrollbar is invisible until you already scroll, so the fourth
          column simply looked cut off. `ScrollRail` surfaces a control on
          whichever side has more content and makes the track keyboard-scrollable. */}
      <ScrollRail
        label={t('admin.crmPipelinePage.colonnesDuPipeline')}
        className="flex gap-4 pb-4 items-start min-h-[600px]"
      >
        {PIPELINE_STAGES.map((stage, stageIndex) => {
          const stageOpps = opportunities.filter((o) => o.stage === stage.id);
          const stageTotal = stageOpps.reduce((sum, o) => sum + o.estimatedValue.amountMinor, 0);

          return (
            <div
              key={stage.id}
              className="w-72 shrink-0 bg-stone-100/70 border border-stone-200 rounded-3xl p-3.5 space-y-3 flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-900">{stage.label}</span>
                  <span className="text-micro font-bold text-stone-500 bg-stone-200 px-1.5 py-0.2 rounded-full">
                    {stageOpps.length}
                  </span>
                </div>
                <span className="text-micro font-black text-stone-700 font-mono">
                  {crmService.formatCrmMoney({ amountMinor: stageTotal, currency: 'EUR' })}
                </span>
              </div>

              {/* Cards Stream */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                {stageOpps.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-micro border border-dashed border-stone-200 rounded-2xl">{t('admin.crmPipelinePage.aucuneOpportunite')}</div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-xs space-y-2.5 hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-stone-900 block leading-tight">
                          {opp.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-micro text-stone-500">
                          <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{opp.companyName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                        <strong className="text-primary font-black font-mono">
                          {crmService.formatCrmMoney(opp.estimatedValue)}
                        </strong>
                        <span className="text-micro text-stone-500 font-medium">
                          {opp.probability}% prob.
                        </span>
                      </div>

                      {/* Quick Move Arrows */}
                      <div className="flex items-center justify-between pt-1 text-micro text-stone-500">
                        <button
                          type="button"
                          disabled={stageIndex === 0}
                          onClick={() => handleStageChange(opp.id, PIPELINE_STAGES[stageIndex - 1].id)}
                          className="p-1 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer min-w-6 min-h-6 inline-flex items-center justify-center"
                          /* One pair of arrows per opportunity card, so a name
                             that says only "Étape précédente" repeats verbatim
                             down the column. Naming the opportunity makes each
                             one addressable. */
                          aria-label={t('admin.crmPipelinePage.etapePrecedenteOpp', { name: opp.title })}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="truncate max-w-[120px]">{opp.primaryContactName || 'Contact'}</span>

                        <button
                          type="button"
                          disabled={stageIndex === PIPELINE_STAGES.length - 1}
                          onClick={() => handleStageChange(opp.id, PIPELINE_STAGES[stageIndex + 1].id)}
                          className="p-1 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer min-w-6 min-h-6 inline-flex items-center justify-center"
                          aria-label={t('admin.crmPipelinePage.etapeSuivanteOpp', { name: opp.title })}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </ScrollRail>

      {/* Create Opportunity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('admin.crmPipelinePage.creerUneOpportuniteCommerciale')}
        description={t('admin.crmPipelinePage.ajoutezUnDealAuPipeline')}
      >
        <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
          <FormField label={t('admin.crmPipelinePage.titreDeLOpportunite')} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.crmPipelinePage.exAdhesionForfaitProBusiness')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('admin.crmPipelinePage.entrepriseConcernee')}>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ex: Atelier Nordique"
              />
            </FormField>

            <FormField label="Contact principal">
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="ex: Marc Dumont"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('admin.crmPipelinePage.typeDOpportunite')}>
              <Select
                aria-label={t('admin.crmPipelinePage.typeDOpportunite')}
                value={oppType}
                onChange={(e) => setOppType(e.target.value as OpportunityType)}
                options={[
                  { value: 'pro_seller_acquisition', label: 'Acquisition Vendeur Pro' },
                  { value: 'pro_subscription_upgrade', label: 'Upgrade Forfait Pro' },
                  { value: 'advertising', label: 'Campagne Publicitaire' },
                  { value: 'partnership', label: 'Partenariat Stratégique' },
                  { value: 'enterprise_account', label: 'Grands Comptes' },
                ]}
              />
            </FormField>

            <FormField label={t('admin.crmPipelinePage.valeurEstimee')}>
              <Input
                type="number"
                value={amountEuros}
                onChange={(e) => setAmountEuros(e.target.value)}
                placeholder="588"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? 'Création...' : 'Créer l\'opportunité'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
