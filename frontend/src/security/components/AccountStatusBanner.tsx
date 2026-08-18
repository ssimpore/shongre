import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthorization } from '../useAuthorization';

export const AccountStatusBanner: React.FC = () => {
  const { currentUser, isSuspended, isLimited, isPro } = useAuthorization();

  if (!currentUser) return null;

  // 1. Suspended Account Banner
  if (isSuspended) {
    return (
      <div className="bg-danger text-white px-4 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-center sm:text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-200" />
            <span>
              <strong>Compte restreint :</strong> Votre profil est temporairement suspendu par la modération. La publication d'annonces et la messagerie sont bloquées.
            </span>
          </div>
          <Link
            to="/aide"
            className="inline-flex items-center gap-1 font-bold underline hover:text-red-100 shrink-0 text-xs"
          >
            Consulter le centre d'aide & recours →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Pending Professional Verification Banner
  if (isPro && currentUser.professionalVerification?.status === 'pending') {
    return (
      <div className="bg-amber-500 text-stone-950 px-4 py-2 shadow-xs border-b border-amber-600/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-center sm:text-left">
            <Clock className="w-4 h-4 shrink-0 text-warning" />
            <span>
              <strong>Vérification Pro en cours d'examen :</strong> Votre dossier Kbis/SIRET est en cours d'analyse par nos équipes (délai moyen : 24h).
            </span>
          </div>
          <span className="text-xs font-bold bg-amber-600/30 px-2 py-1 rounded-md">
            Dossier n° SIRET {currentUser.siret || currentUser.sirenSiret || 'en attente'}
          </span>
        </div>
      </div>
    );
  }

  // 3. Limited Account (Quota reached or verification recommended)
  if (isLimited) {
    return (
      <div className="bg-warning-surface border-b border-warning-border text-warning px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span>Votre compte a atteint sa limite d'annonces actives pour le mois en cours.</span>
          </div>
          <Link to="/solutions-pro" className="font-bold text-primary hover:underline">
            Augmenter mes quotas →
          </Link>
        </div>
      </div>
    );
  }

  return null;
};
