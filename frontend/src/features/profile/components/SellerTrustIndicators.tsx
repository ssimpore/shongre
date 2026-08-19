import { isProSeller } from '../../../domains/user/user.domain';
import React from 'react';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  Clock,
  Award,
  CheckCircle2,
  Lock,
  Building2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { verificationService } from '../../../domains/verification/verification.service';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface SellerTrustIndicatorsProps {
  seller: UserProfile;
}

export const SellerTrustIndicators: React.FC<SellerTrustIndicatorsProps> = ({ seller }) => {
  const { t } = useTranslation();
  const isPro = isProSeller(seller);
  const trustScore = verificationService.computeTrustScore(seller);
  const isIdentityVerified = seller.identityVerification?.status === 'verified';
  const isKybVerified = seller.professionalVerification?.status === 'verified';
  const isBankVerified = seller.bankPayoutVerification?.status === 'verified';

  return (
    <div className="bg-stone-50 rounded-3xl border border-stone-200/60 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-success" />
          <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">{t('profile.sellerTrustIndicators.garantiesSignauxDeConfiance')}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-success bg-success-surface px-3 py-1 rounded-full border border-success/20 w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Indice de confiance : {trustScore.score}/100 ({trustScore.levelLabel})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {/* Verification badge */}
        <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-stone-200/60 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="p-2 rounded-xl bg-success-surface text-success shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block mb-0.5">
              {isPro ? (isKybVerified ? 'Société Vérifiée RCS' : 'Identité Pro') : (isIdentityVerified ? 'Identité KYC Certifiée' : 'Profil vérifié')}
            </span>
            <span className="text-stone-500 text-xs leading-relaxed">
              {isPro
                ? (seller.siret ? `RCS SIRET ${seller.siret.slice(0, 9)} • KBIS Validé` : 'Professionnel enregistré')
                : (isIdentityVerified ? 'Pièce d\'identité CNI / Passeport validée' : 'Email & Téléphone validés')}
            </span>
          </div>
        </div>

        {/* Escrow Payment & Payout */}
        <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-stone-200/60 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="p-2 rounded-xl bg-info-surface text-info shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block mb-0.5">{t('profile.sellerTrustIndicators.paiementSecurise')}</span>
            <span className="text-stone-500 text-xs leading-relaxed">
              {isBankVerified
                ? 'Séquestre Shongre & Virement SEPA certifié'
                : 'Fonds bloqués sur compte séquestre jusqu\'à réception'}
            </span>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-stone-200/60 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="p-2 rounded-xl bg-warning-surface text-warning shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block mb-0.5">{t('profile.sellerTrustIndicators.livraisonRetrait')}</span>
            <span className="text-stone-500 text-xs leading-relaxed">{t('profile.sellerTrustIndicators.remiseEnMainPropreOu')}</span>
          </div>
        </div>

        {/* Responsiveness */}
        <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-stone-200/60 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block mb-0.5">{t('profile.sellerTrustIndicators.reactiviteCertifiee')}</span>
            <span className="text-stone-500 text-xs leading-relaxed">
              {seller.responseRatePercent}% de réponses {seller.responseTimeText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
