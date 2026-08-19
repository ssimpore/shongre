import { routes } from '../../configuration/routes';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, ArrowLeft, Briefcase, Lock } from 'lucide-react';
import { Permission } from '../../types';
import { useAuthorization } from '../useAuthorization';
import { Button } from '../../design-system/primitives/Button';
import { ResourceOwnershipContext, AuthorizationContextOptions } from '../authorization.service';
import { useTranslation } from '../../i18n/I18nProvider';

export interface RequirePermissionProps {
  permission: Permission;
  resource?: ResourceOwnershipContext | any;
  options?: AuthorizationContextOptions;
  customTitle?: string;
  customMessage?: string;
  /**
   * Set when the guard sits outside `MainLayout` — the `/admin` tree is a
   * top-level route, so a denial there rendered as a bare card with no header
   * and no footer, stranding the user. Adds a minimal branded bar with a way home.
   */
  standalone?: boolean;
  children: React.ReactNode;
}

interface DenialCopy {
  title: string;
  message: string;
  /** Where the user can actually go to obtain this capability, when such a path exists. */
  action?: { label: string; to: string };
}

/**
 * User-facing copy for each guarded capability.
 *
 * The previous fallback interpolated the raw permission constant — so a buyer who
 * tapped the header's primary "Déposer une annonce" button was told they lacked
 * `[listing.create]`. A denial has to say what the person cannot do in their own
 * vocabulary, and, wherever one exists, offer the door that leads forward.
 */
const DENIAL_COPY: Partial<Record<Permission, DenialCopy>> = {
  'listing.create': {
    title: 'Créez un compte vendeur pour publier',
    message:
      'La publication d\'annonces est réservée aux comptes vendeurs. La création est gratuite et ne prend qu\'une minute.',
    action: { label: 'Devenir vendeur', to: '/inscription' },
  },
  'message.read.own': {
    title: 'Connectez-vous pour voir vos messages',
    message: 'Votre messagerie est privée : connectez-vous pour retrouver vos échanges.',
    action: { label: 'Se connecter', to: '/connexion' },
  },
  'moderation.review': {
    title: 'Espace de modération',
    message: 'La revue des signalements est réservée aux équipes de modération Shongre.',
  },
  'user.read': {
    title: 'Gestion des comptes',
    message: 'La consultation des comptes utilisateurs est réservée aux équipes internes habilitées.',
  },
  'market.manage': {
    title: 'Configuration des marchés',
    message: 'Le paramétrage des marchés est réservé aux responsables de marché.',
  },
  'taxonomy.manage': {
    title: 'Gestion du catalogue',
    message: 'La structure des catégories est gérée par les équipes contenu de Shongre.',
  },
  'monetization.manage': {
    title: 'Forfaits et monétisation',
    message: 'La configuration des forfaits est réservée aux équipes finance de Shongre.',
  },
  'provider.read': {
    title: 'Fournisseurs et intégrations',
    message: 'Le registre des fournisseurs est réservé aux équipes techniques de Shongre.',
  },
  'audit.read': {
    title: 'Registre d\'audit',
    message: 'Le journal de sécurité est réservé aux administrateurs de la plateforme.',
  },
  'crm.access': {
    title: 'Espace commercial',
    message: 'Le CRM est réservé aux équipes commerciales de Shongre.',
  },
  'crm.contact.read': {
    title: 'Espace commercial',
    message: 'La consultation des contacts est réservée aux équipes commerciales de Shongre.',
  },
  'crm.company.read': {
    title: 'Espace commercial',
    message: 'La consultation des entreprises est réservée aux équipes commerciales de Shongre.',
  },
  'crm.opportunity.read': {
    title: 'Espace commercial',
    message: 'Le pipeline commercial est réservé aux équipes commerciales de Shongre.',
  },
  'crm.ai_prospecting.use': {
    title: 'Prospection assistée',
    message: 'La prospection assistée par IA est réservée aux équipes commerciales de Shongre.',
  },
};

const FALLBACK_DENIAL: DenialCopy = {
  title: 'Accès restreint',
  message:
    "Votre compte n'a pas accès à cette page. Si vous pensez qu'il s'agit d'une erreur, contactez notre support.",
  action: { label: 'Contacter le support', to: '/contact' },
};

/** Keeps a route home when the denial renders outside the site shell. */
const GuardShell: React.FC<{ standalone?: boolean; children: React.ReactNode }> = ({
  standalone,
  children,
}) => {
  if (!standalone) return <>{children}</>;
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <div className="border-b border-border-base bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link to={routes.home()} className="flex items-center gap-2.5 font-black text-stone-900">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm">
              S
            </span>
            <span className="tracking-tight">SHONGRE.</span>
          </Link>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">{children}</div>
    </div>
  );
};

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  resource,
  options,
  customTitle,
  customMessage,
  standalone,
  children,
}) => {
  const { t } = useTranslation();
  const { currentUser, can, isSuspended, isPro } = useAuthorization();
  const location = useLocation();

  if (!currentUser) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return (
      <GuardShell standalone={standalone}>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning-surface border border-warning-border text-warning flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">Authentification requise</h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
          Vous devez être connecté pour accéder à cette section.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            to={`/connexion?redirect=${redirectParam}`}
            variant="primary"
            size="md"
          >
            Se connecter
          </Button>
          <Button
            to="/inscription"
            variant="outline"
            size="md"
          >
            Créer un compte
          </Button>
        </div>
      </div>
      </GuardShell>
    );
  }

  // Check Suspended state
  if (isSuspended) {
    return (
      <GuardShell standalone={standalone}>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger-surface border border-danger-border text-danger flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">{t('security.requirePermission.compteSuspendu')}</h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {currentUser.suspendedReason
            ? `Votre compte a été restreint par nos équipes : "${currentUser.suspendedReason}".`
            : 'Votre compte fait l\'objet d\'une restriction temporaire pour des raisons de conformité.'}
        </p>
        <Button
          to="/aide"
          variant="outline"
          size="md"
        >
          Contacter le support de sécurité
        </Button>
      </div>
      </GuardShell>
    );
  }

  // Check specific permission
  const hasAccess = can(permission, resource, options);

  if (!hasAccess) {
    // Specific UX if Pro permission required
    if (permission.startsWith('store.') || permission === 'listing.bulk_import' || permission === 'subscription.manage.own') {
      return (
        <GuardShell standalone={standalone}>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-light border border-primary-border text-primary flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 mb-2">
            {customTitle || 'Espace réservé aux Vendeurs Professionnels'}
          </h1>
          <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
            {customMessage ||
              'Cette fonctionnalité (vitrine officielle, multi-annonces, statistiques avancées) est réservée aux comptes professionnels vérifiés.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              to="/solutions-pro"
              variant="primary"
              size="md"
            >
              Découvrir les offres Pro
            </Button>
            <Button
              to="/compte"
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Retour à mon compte
            </Button>
          </div>
        </div>
        </GuardShell>
      );
    }

    // Default 403 Forbidden Guard Card
    const copy = DENIAL_COPY[permission] ?? FALLBACK_DENIAL;
    const forward = copy.action ?? { label: 'Accéder à mon espace', to: '/compte' };

    return (
      <GuardShell standalone={standalone}>
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning-surface border border-warning-border text-warning flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">
          {customTitle || copy.title}
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {customMessage || copy.message}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            to={routes.home()}
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour à l'accueil
          </Button>
          <Button
            to={forward.to}
            variant="primary"
            size="md"
          >
            {forward.label}
          </Button>
        </div>
      </div>
      </GuardShell>
    );
  }

  return <>{children}</>;
};
