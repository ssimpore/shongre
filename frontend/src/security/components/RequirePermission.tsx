import { routes } from '../../configuration/routes';
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, ArrowLeft, Briefcase, Lock } from 'lucide-react';
import { Permission } from '../../types';
import { useAuthorization } from '../useAuthorization';
import { Button } from '../../design-system/primitives/Button';
import { ResourceOwnershipContext, AuthorizationContextOptions } from '../authorization.service';

export interface RequirePermissionProps {
  permission: Permission;
  resource?: ResourceOwnershipContext | any;
  options?: AuthorizationContextOptions;
  customTitle?: string;
  customMessage?: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  resource,
  options,
  customTitle,
  customMessage,
  children,
}) => {
  const { currentUser, can, isSuspended, isPro } = useAuthorization();

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">Authentification requise</h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
          Vous devez être connecté pour accéder à cette section.
        </p>
        <Link to="/connexion">
          <Button variant="primary" size="md">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  // Check Suspended state
  if (isSuspended) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">Compte suspendu</h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {currentUser.suspendedReason
            ? `Votre compte a été restreint par nos équipes : "${currentUser.suspendedReason}".`
            : 'Votre compte fait l\'objet d\'une restriction temporaire pour des raisons de conformité.'}
        </p>
        <Link to="/aide">
          <Button variant="outline" size="md">
            Contacter le support de sécurité
          </Button>
        </Link>
      </div>
    );
  }

  // Check specific permission
  const hasAccess = can(permission, resource, options);

  if (!hasAccess) {
    // Specific UX if Pro permission required
    if (permission.startsWith('store.') || permission === 'listing.bulk_import' || permission === 'subscription.manage.own') {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-primary flex items-center justify-center mx-auto mb-4">
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
            <Link to="/solutions-pro">
              <Button variant="primary" size="md">
                Découvrir les offres Pro
              </Button>
            </Link>
            <Link to="/compte">
              <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Retour à mon compte
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    // Default 403 Forbidden Guard Card
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">
          {customTitle || 'Accès restreint'}
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {customMessage ||
            `Votre profil ne dispose pas de l'autorisation requise [${permission}] pour afficher cette page ou administrer cette ressource.`}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={routes.home()}>
            <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Retour à l'accueil
            </Button>
          </Link>
          <Link to="/compte">
            <Button variant="primary" size="md">
              Accéder à mon espace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
