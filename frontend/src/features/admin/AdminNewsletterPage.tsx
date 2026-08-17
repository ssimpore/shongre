import React, { useState, useEffect } from 'react';
import {
  Mail,
  PlusCircle,
  Eye,
  Send,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  X,
} from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { Modal } from '../../design-system/primitives/Modal';
import { FormField, Input, Textarea, Select } from '../../design-system/primitives/FormField';
import { NewsletterCampaign, NewsletterTopic } from '../../domains/newsletter/newsletter.types';
import { newsletterRepository } from '../../repositories/newsletter.repository';
import { newsletterTopicsService } from '../../domains/newsletter/newsletter.topics';
import { useToast } from '../../app/providers/ToastProvider';
import { formatDate } from '../../utilities/formatters';
import { NewsletterPreviewModal } from '../newsletter/components/NewsletterPreviewModal';
import { Skeleton, EmptyState } from '../../design-system/primitives/UIComponents';

export const AdminNewsletterPage: React.FC = () => {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCampaign, setPreviewCampaign] = useState<NewsletterCampaign | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New campaign form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'individual' | 'pro'>('all');
  const [targetTopic, setTargetTopic] = useState<NewsletterTopic>('editorial');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const list = await newsletterRepository.listCampaigns();
      setCampaigns(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      toast.error('Veuillez renseigner le nom et l\'objet de la campagne.');
      return;
    }

    setIsSubmitting(true);
    try {
      await newsletterRepository.createCampaign({
        name: name.trim(),
        subject: subject.trim(),
        previewText: previewText.trim(),
        topic: targetTopic,
        marketCode: 'FR',
        locale: 'fr-FR',
        audience: {
          marketCode: 'FR',
          accountTypes: targetAudience === 'all' ? ['individual', 'pro'] : [targetAudience],
          topicIds: [targetTopic],
        },
        content: {
          heroTitle: heroTitle.trim() || subject.trim(),
          introText: introText.trim(),
          ctaText: 'Découvrir la sélection',
          ctaUrl: '/recherche',
        },
        status: 'ready',
      });

      setIsCreateModalOpen(false);
      setName('');
      setSubject('');
      setPreviewText('');
      setHeroTitle('');
      setIntroText('');
      fetchCampaigns();
      toast.success('Campagne newsletter créée avec succès.', 'Campagne enregistrée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateSend = async (campaignId: string) => {
    try {
      await newsletterRepository.simulateSendCampaign(campaignId);
      fetchCampaigns();
      toast.success('Envoi simulé avec succès aux abonnés ciblés.', 'Campagne envoyée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi.');
    }
  };

  const getStatusBadge = (status: NewsletterCampaign['status']) => {
    switch (status) {
      case 'sent':
        return <Badge variant="success" size="sm">Envoyée</Badge>;
      case 'scheduled':
        return <Badge variant="warning" size="sm">Programmée</Badge>;
      case 'ready':
        return <Badge variant="primary" size="sm">Prête</Badge>;
      case 'draft':
        return <Badge variant="neutral" size="sm">Brouillon</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Campagnes & Newsletters Marketing
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Édition des sélections hebdomadaires, ciblage d'audience et simulation d'envois.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="font-bold flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nouvelle campagne</span>
        </Button>
      </div>

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border-base rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Abonnés actifs (FR)
          </span>
          <div className="text-2xl font-black text-stone-900">4 680</div>
          <span className="text-micro text-success font-bold">
            +8.4% ce mois-ci
          </span>
        </div>

        <div className="bg-white border border-border-base rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Taux d'ouverture estimé
          </span>
          <div className="text-2xl font-black text-stone-900">46.2%</div>
          <span className="text-micro text-stone-500">
            Moyenne sur les 5 dernières éditions
          </span>
        </div>

        <div className="bg-white border border-border-base rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Campagnes diffusées
          </span>
          <div className="text-2xl font-black text-stone-900">
            {campaigns.filter((c) => c.status === 'sent').length}
          </div>
          <span className="text-micro text-stone-500">
            Éditions hebdomadaires et flash
          </span>
        </div>
      </div>

      {/* 3. Campaigns List */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-black text-stone-900">Historique des campagnes</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-8 h-8 text-stone-500" />}
            title="Aucune campagne créée"
            description="Créez une première campagne pour envoyer une sélection d'annonces aux abonnés de la newsletter."
            className="border-0 shadow-none"
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(camp.status)}
                    <span className="text-xs font-bold text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded-md">
                      {camp.marketCode}
                    </span>
                    <span className="text-micro text-stone-500">
                      {camp.sentAt
                        ? `Envoyée le ${formatDate(camp.sentAt)}`
                        : camp.scheduledAt
                        ? `Programmée le ${formatDate(camp.scheduledAt)}`
                        : `Créée le ${formatDate(camp.createdAt)}`}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-stone-900 truncate">{camp.name}</h3>
                  <p className="text-xs text-stone-500 truncate">
                    Objet : <strong>{camp.subject}</strong>
                  </p>

                  {camp.stats && (
                    <div className="flex items-center gap-4 text-micro text-stone-600 pt-1 font-medium">
                      <span>Destinataires : <strong>{camp.stats.recipientsCount}</strong></span>
                      <span>Ouvertures : <strong>{camp.stats.openedCount}</strong></span>
                      <span>Clics : <strong>{camp.stats.clickedCount}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCampaign(camp)}
                    className="font-bold flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Aperçu</span>
                  </Button>

                  {camp.status !== 'sent' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSimulateSend(camp.id)}
                      className="font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Simuler envoi</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewCampaign && (
        <NewsletterPreviewModal
          isOpen={!!previewCampaign}
          onClose={() => setPreviewCampaign(null)}
          campaign={previewCampaign}
        />
      )}

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer une campagne newsletter"
        description="Rédigez et ciblez une nouvelle édition de la sélection Shongre."
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
          <FormField label="Nom interne de la campagne" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Sélection Vélos & Vintage Semaine 34"
            />
          </FormField>

          <FormField label="Objet de l'email" required>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ex: 🚲 Les meilleures affaires vélo de la semaine"
            />
          </FormField>

          <FormField label="Texte d'aperçu (Préheader)">
            <Input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="ex: Jusqu'à -40% sur des vélos gravel vérifiés."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Audience ciblée">
              <Select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                options={[
                  { value: 'all', label: 'Tous les abonnés' },
                  { value: 'individual', label: 'Particuliers uniquement' },
                  { value: 'pro', label: 'Professionnels uniquement' },
                ]}
              />
            </FormField>

            <FormField label="Thématique">
              <Select
                value={targetTopic}
                onChange={(e) => setTargetTopic(e.target.value as any)}
                options={newsletterTopicsService.getAllTopics().map((t) => ({
                  value: t.id,
                  label: t.label,
                }))}
              />
            </FormField>
          </div>

          <FormField label="Titre principal (Hero)">
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Titre d'accroche dans l'email"
            />
          </FormField>

          <FormField label="Texte d'introduction éditorial">
            <Textarea
              rows={3}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Quelques phrases pour contextualiser la sélection..."
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? 'Création...' : 'Créer la campagne'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
