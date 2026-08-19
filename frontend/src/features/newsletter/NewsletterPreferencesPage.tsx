import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, ShieldCheck, AlertCircle, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { NewsletterSubscription, NewsletterTopic } from '../../domains/newsletter/newsletter.types';
import { newsletterService } from '../../domains/newsletter/newsletter.service';
import { newsletterTopicsService } from '../../domains/newsletter/newsletter.topics';
import { newsletterCapabilitiesService } from '../../domains/newsletter/newsletter.capabilities';
import { newsletterRepository } from '../../repositories/newsletter.repository';
import { NewsletterTopicSelector } from './components/NewsletterTopicSelector';
import { formatDate } from '../../utilities/formatters';
import { Skeleton } from '../../design-system/primitives/UIComponents';
import { useTranslation } from '../../i18n/I18nProvider';

export const NewsletterPreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [subscription, setSubscription] = useState<NewsletterSubscription | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<NewsletterTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const capabilities = newsletterCapabilitiesService.resolve({ viewer: currentUser });

  useEffect(() => {
    const fetchSub = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        let sub = await newsletterRepository.getSubscriptionByUserId(currentUser.id);
        if (!sub && currentUser.email) {
          sub = await newsletterRepository.getSubscription(currentUser.email);
        }
        setSubscription(sub);
        if (sub) {
          setSelectedTopics(sub.topics);
        } else {
          // Default topics if not yet subscribed
          setSelectedTopics(newsletterTopicsService.getDefaultTopics(capabilities.isPro));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, [currentUser, capabilities.isPro]);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      if (subscription) {
        const updated = await newsletterRepository.updatePreferences(subscription.id, selectedTopics);
        setSubscription(updated);
      } else {
        const created = await newsletterRepository.subscribe({
          email: currentUser.email,
          subscriberId: currentUser.id,
          topics: selectedTopics,
          accountType: capabilities.isPro ? 'pro' : 'individual',
          source: 'account',
        });
        setSubscription(created);
      }
      toast.success('Vos préférences de newsletter ont été mises à jour avec succès.', 'Préférences enregistrées');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour vos préférences.', 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscription) return;
    setIsSaving(true);
    try {
      const updated = await newsletterRepository.unsubscribe(subscription.id);
      setSubscription(updated);
      toast.info('Vous êtes désabonné de la newsletter Shongre.', 'Désinscription effectuée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du désabonnement.', 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResubscribe = async () => {
    if (!subscription) return;
    setIsSaving(true);
    try {
      const updated = await newsletterRepository.resubscribe(subscription.id, selectedTopics);
      setSubscription(updated);
      toast.success('Votre réabonnement à la newsletter a été confirmé.', 'Abonnement réactivé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du réabonnement.', 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const isSubscribed = subscription?.status === 'subscribed';
  const statusInfo = newsletterService.getStatusInfo(subscription?.status || 'unsubscribed');

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">
          Newsletter & Préférences Marketing
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Gérez vos abonnements aux sélections hebdomadaires, bons plans et actualités Shongre.
        </p>
      </div>

      {/* 2. Subscription Status Banner */}
      <div className="bg-white border border-border-base rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isSubscribed
                ? 'bg-success-surface text-success'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            <Mail className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-stone-900">
                {currentUser?.email}
              </span>
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{statusInfo.description}</p>
          </div>
        </div>

        {isSubscribed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnsubscribe}
            disabled={isSaving}
            className="text-stone-600 hover:text-stone-900 shrink-0 font-bold"
          >
            Se désabonner
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleResubscribe}
            disabled={isSaving}
            className="shrink-0 font-bold"
          >
            Se réabonner
          </Button>
        )}
      </div>

      {/* 3. Topics Customization */}
      <div className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-black text-stone-900">{t('newsletter.newsletterPreferencesPage.vosThematiquesFavorites')}</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Cochez les thématiques qui vous intéressent pour personnaliser vos prochaines éditions.
          </p>
        </div>

        <NewsletterTopicSelector
          topics={capabilities.availableTopics}
          selectedTopicIds={selectedTopics}
          onChange={setSelectedTopics}
          disabled={!isSubscribed}
        />

        <div className="pt-4 border-t border-border-subtle flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isSaving || !isSubscribed}
            className="font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer mes préférences'}</span>
          </Button>
        </div>
      </div>

      {/* 4. Transactional Communication Isolation Notice */}
      <div className="p-4 bg-stone-50 border border-border-base rounded-2xl flex items-start gap-3 text-xs text-stone-600">
        <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-stone-900 block">
            Communications obligatoires de service
          </span>
          <p className="leading-relaxed">
            Même si vous êtes désabonné de la newsletter, vous continuerez à recevoir les emails essentiels relatifs à la sécurité de votre compte, à vos paiements sous séquestre et au suivi de vos commandes.
          </p>
        </div>
      </div>
    </div>
  );
};
