import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Clock,
  PlusCircle,
  Mail,
  Phone,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '../../../design-system/primitives/Button';
import { StatePanel } from '../../../design-system/primitives/StatePanel';
import { Badge } from '../../../design-system/primitives/Badge';
import { Select } from '../../../design-system/primitives/FormField';
import { crmRepository } from '../../../repositories/crm.repository';
import { prospectResearchService } from '../../../services/prospect-research.service';
import {
  CrmCompany,
  CrmContact,
  CrmOpportunity,
  CrmActivity,
  CompanyLifecycle,
  CompanyEnrichmentDiff,
} from '../../../domains/crm/crm.types';
import { crmService } from '../../../domains/crm/crm.service';
import { ActivityTimeline } from './components/ActivityTimeline';
import { EnrichmentDiffModal } from './components/EnrichmentDiffModal';
import { useToast } from '../../../app/providers/ToastProvider';
import { formatDate } from '../../../utilities/formatters';
import { Skeleton } from '../../../design-system/primitives/UIComponents';

export const CrmCompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [company, setCompany] = useState<CrmCompany | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Enrichment Modal
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [enrichDiff, setEnrichDiff] = useState<CompanyEnrichmentDiff | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const fetchCompanyData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const comp = await crmRepository.getCompanyById(id);
      setCompany(comp);
      if (comp) {
        const [allContacts, allOpps, acts] = await Promise.all([
          crmRepository.listContacts(),
          crmRepository.listOpportunities(),
          crmRepository.listActivities('company', comp.id),
        ]);
        setContacts(allContacts.filter((c) => c.companyId === comp.id || c.companyName === comp.name));
        setOpportunities(allOpps.filter((o) => o.companyId === comp.id));
        setActivities(acts);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  const handleUpdateLifecycle = async (newLifecycle: CompanyLifecycle) => {
    if (!company) return;
    try {
      const updated = await crmRepository.updateCompany(company.id, {
        lifecycle: newLifecycle,
        doNotContact: newLifecycle === 'do_not_contact',
      });
      setCompany(updated);
      toast.success('Statut mis à jour.', 'Entreprise actualisée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleTriggerEnrich = async () => {
    if (!company) return;
    setIsEnriching(true);
    try {
      const diff = await prospectResearchService.enrichCompany(company.id);
      setEnrichDiff(diff);
      setIsEnrichModalOpen(true);
    } catch (err: any) {
      toast.error('Impossible d\'enrichir cette entreprise.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleApplyEnrichment = async (updates: Partial<CrmCompany>) => {
    if (!company) return;
    const updated = await crmRepository.updateCompany(company.id, updates);
    setCompany(updated);

    await crmRepository.addActivity({
      entityType: 'company',
      entityId: company.id,
      type: 'enrichment_applied',
      title: 'Données enrichies via l\'IA',
      description: 'Champs mis à jour à partir de l\'analyse des sources web publiques officielles.',
      authorName: 'Shongre AI Intelligence',
      isAiGenerated: true,
    });

    const acts = await crmRepository.listActivities('company', company.id);
    setActivities(acts);
    toast.success('Données de l\'entreprise enrichies avec succès.', 'Enrichissement appliqué');
  };

  const handleAddNote = async (noteText: string) => {
    if (!company) return;
    await crmRepository.addActivity({
      entityType: 'company',
      entityId: company.id,
      type: 'note',
      title: 'Note commerciale',
      description: noteText,
      authorName: 'Antoine Fabre',
      authorRole: 'Admin',
    });
    const updated = await crmRepository.listActivities('company', company.id);
    setActivities(updated);
    toast.success('Note enregistrée.');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <StatePanel
        variant="notFound"
        title="Entreprise introuvable"
        description="Cette entreprise n'existe plus dans le CRM, ou a été fusionné avec une autre fiche."
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/crm/entreprises')}>
            Retour aux entreprises
          </Button>
        }
      />
    );
  }

  const lifecycleInfo = crmService.getLifecycleInfo(company.lifecycle);

  return (
    <div className="space-y-6">
      {/* 1. Back Link */}
      <div className="flex items-center gap-2">
        <Link
          to="/admin/crm/entreprises"
          className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Toutes les entreprises</span>
        </Link>
      </div>

      {/* 2. Company 360 Header */}
      <div className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-stone-800 text-xl shrink-0">
              {company.name[0]}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-stone-900">{company.name}</h1>
                <Badge variant={lifecycleInfo.variant} size="sm">
                  {lifecycleInfo.label}
                </Badge>
                {company.linkedSellerId && (
                  <Badge variant="pro" size="sm">
                    Vendeur Pro Actif
                  </Badge>
                )}
                {company.aiFitScore && (
                  <span className="text-micro px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Fit {company.aiFitScore}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                <span>{company.industry}</span>
                {company.location?.city && (
                  <>
                    <span>•</span>
                    <span>{company.location.city}</span>
                  </>
                )}
                {company.website && (
                  <>
                    <span>•</span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono flex items-center gap-1"
                    >
                      <span>{company.domain || company.website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerEnrich}
              disabled={isEnriching}
              className="font-bold"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{isEnriching ? 'Analyse...' : 'Enrichir avec l\'IA'}</span>
            </Button>
          </div>
        </div>

        {/* Lifecycle Switcher */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-500">Changer de statut :</span>
            <Select
              value={company.lifecycle}
              onChange={(e) => handleUpdateLifecycle(e.target.value as CompanyLifecycle)}
              options={[
                { value: 'prospect', label: 'Prospect' },
                { value: 'qualified', label: 'Qualifié' },
                { value: 'customer', label: 'Client / Pro Shongre' },
                { value: 'partner', label: 'Partenaire' },
                { value: 'do_not_contact', label: 'Ne pas contacter' },
              ]}
            />
          </div>

          <span className="text-stone-500 text-micro">
            Responsable : <strong>{company.ownerName || 'Non assigné'}</strong> • Marché : {company.marketCode}
          </span>
        </div>
      </div>

      {/* 3. AI Summary Section */}
      {company.aiSummary && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-3xl p-5 shadow-xs flex items-start gap-3.5 text-xs text-purple-950">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Synthèse commerciale IA</span>
            <p className="text-purple-900 leading-relaxed text-micro">
              {company.aiSummary}
            </p>
          </div>
        </div>
      )}

      {/* 4. Split: Opportunities & Associated Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Opportunities Box */}
          <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-base font-black text-stone-900">Opportunités associées</h2>
              </div>
              <Link to="/admin/crm/pipeline" className="text-xs font-bold text-primary hover:underline">
                Pipeline
              </Link>
            </div>

            {opportunities.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">Aucune opportunité ouverte.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">{opp.title}</span>
                      <span className="text-micro text-stone-500">
                        {crmService.getOpportunityTypeLabel(opp.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="font-mono">{crmService.formatCrmMoney(opp.estimatedValue)}</strong>
                      <Badge variant={opp.stage === 'won' ? 'success' : 'primary'} size="sm">
                        {opp.stage}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-stone-900">Historique & Notes</h2>
            <ActivityTimeline activities={activities} onAddNote={handleAddNote} />
          </div>
        </div>

        {/* Right Column: Contacts List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-black text-stone-900">Interlocuteurs</h3>
              </div>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-4">Aucun contact rattaché.</p>
            ) : (
              <div className="space-y-2.5">
                {contacts.map((c) => (
                  <Link
                    key={c.id}
                    to={`/admin/crm/contacts/${c.id}`}
                    className="p-3 bg-stone-50 rounded-2xl border border-stone-200 block hover:bg-stone-100 transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">
                        {c.identity.firstName} {c.identity.lastName}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {c.lifecycle}
                      </Badge>
                    </div>
                    <span className="text-micro text-stone-500 block truncate">
                      {c.identity.jobTitle || c.identity.email}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enrichment Diff Modal */}
      {enrichDiff && (
        <EnrichmentDiffModal
          isOpen={isEnrichModalOpen}
          onClose={() => setIsEnrichModalOpen(false)}
          company={company}
          diff={enrichDiff}
          onApply={handleApplyEnrichment}
        />
      )}
    </div>
  );
};
