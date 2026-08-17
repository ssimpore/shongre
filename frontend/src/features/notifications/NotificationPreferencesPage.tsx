import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { NotificationPreferences } from '../../domains/notifications/notification.types';
import { notificationRepository } from '../../repositories/notification.repository';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { Skeleton } from '../../design-system/primitives/UIComponents';

export const NotificationPreferencesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const currentUserId = currentUser ? currentUser.id : 'user-thomas';

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    notificationRepository.getPreferences(currentUserId).then((prefs) => {
      setPreferences(prefs);
      setIsLoading(false);
    });
  }, [currentUserId]);

  const handleToggle = (
    categoryKey: keyof Omit<NotificationPreferences, 'userId' | 'updatedAt'>,
    channel: 'inApp' | 'email' | 'push'
  ) => {
    if (!preferences) return;

    const currentCat = preferences[categoryKey];
    if (currentCat.isMandatory && (channel === 'inApp' || channel === 'email')) {
      toast.info('Cette alerte est obligatoire pour garantir la sécurité de vos transactions et de votre compte.');
      return;
    }

    setPreferences({
      ...preferences,
      [categoryKey]: {
        ...currentCat,
        [channel]: !currentCat[channel],
      },
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      await notificationRepository.updatePreferences(currentUserId, preferences);
      toast.success('Vos préférences de notifications ont été enregistrées avec succès.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !preferences) {
    // Structural skeleton mirroring the loaded layout (page header + one row per
    // preference section) so nothing jumps when the data arrives. This used to be
    // a centred "Chargement…" string, which collapsed the page then re-expanded it.
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de vos préférences de notification…</span>
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl border border-border-base p-4 sm:p-6 shadow-xs">
          <Skeleton className="h-4 w-40 rounded-lg mb-4" />
          <div className="divide-y divide-border-subtle">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="py-4.5 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-3 sm:space-y-0">
                <div className="sm:col-span-6 space-y-1.5">
                  <Skeleton className="h-4 w-48 rounded-lg" />
                  <Skeleton className="h-3 w-full max-w-md rounded-lg" />
                </div>
                <div className="sm:col-span-6 flex items-center justify-end gap-8">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sections: {
    key: keyof Omit<NotificationPreferences, 'userId' | 'updatedAt'>;
    title: string;
    description: string;
    isMandatory?: boolean;
  }[] = [
    {
      key: 'messages',
      title: 'Messages & Offres de prix',
      description: 'Nouveaux messages des acheteurs/vendeurs et propositions d\'offres.',
    },
    {
      key: 'transactions',
      title: 'Transactions & Paiement sous séquestre',
      description: 'Validation de paiement, réservation, confirmation de commande et libération des fonds.',
      isMandatory: true,
    },
    {
      key: 'listings',
      title: 'Gestion de vos annonces',
      description: 'Validation de publication, expiration, alertes baisse de prix et recherches enregistrées.',
    },
    {
      key: 'delivery',
      title: 'Livraison & Remise en main propre',
      description: 'Suivi de colis, rendez-vous de remise en main propre et code PIN de confirmation.',
      isMandatory: true,
    },
    {
      key: 'reviews',
      title: 'Avis & Notations',
      description: 'Rappels pour évaluer une transaction et notifications d\'avis reçus.',
    },
    {
      key: 'promotions',
      title: 'Mises en avant & Boosts',
      description: 'Statut de vos boosts d\'annonces et renouvellement de forfait Pro.',
    },
    {
      key: 'security',
      title: 'Sécurité & Accès au compte',
      description: 'Changements de mot de passe, nouvelles connexions et vérification d\'identité.',
      isMandatory: true,
    },
    {
      key: 'marketing',
      title: 'Offres promotionnelles & Actualités Shongre',
      description: 'Conseils pour vendre plus vite, actualités de la plateforme et offres partenaires.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/compte/notifications"
            className="text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au centre de notifications</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Préférences de notifications
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Choisissez précisément les alertes que vous souhaitez recevoir sur chaque canal.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          className="shrink-0"
        >
          Enregistrer
        </Button>
      </div>

      {/* Matrix Header */}
      <div className="bg-white rounded-3xl border border-border-base p-6 shadow-xs space-y-6">
        <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 border-b border-border-base text-xs font-black text-stone-500 uppercase tracking-wider">
          <div className="col-span-6">Catégorie d'alerte</div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Bell className="w-3.5 h-3.5 text-stone-500" />
            <span>Application</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Mail className="w-3.5 h-3.5 text-stone-500" />
            <span>Email</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-stone-500" />
            <span>Push</span>
          </div>
        </div>

        {/* Section Rows */}
        <div className="divide-y divide-border-subtle">
          {sections.map((sec) => {
            const pref = preferences[sec.key];

            return (
              <div
                key={sec.key}
                className="py-4.5 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-3 sm:space-y-0"
              >
                {/* Left Description */}
                <div className="sm:col-span-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-stone-900">{sec.title}</h2>
                    {sec.isMandatory && (
                      <Badge variant="neutral" size="sm">
                        <Lock className="w-2.5 h-2.5 mr-1" />
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed font-medium">
                    {sec.description}
                  </p>
                </div>

                {/* In-App Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">Sur l'application :</span>
                  <input
                    type="checkbox"
                    checked={pref.inApp}
                    disabled={sec.isMandatory}
                    onChange={() => handleToggle(sec.key, 'inApp')}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary disabled:opacity-50 cursor-pointer"
                  />
                </div>

                {/* Email Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">Par email :</span>
                  <input
                    type="checkbox"
                    checked={pref.email}
                    disabled={sec.isMandatory}
                    onChange={() => handleToggle(sec.key, 'email')}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary disabled:opacity-50 cursor-pointer"
                  />
                </div>

                {/* Push Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">Sur mobile (Push) :</span>
                  <input
                    type="checkbox"
                    checked={pref.push}
                    onChange={() => handleToggle(sec.key, 'push')}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
