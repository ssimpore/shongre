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

export interface SellerTrustIndicatorsProps {
  seller: UserProfile;
}

export const SellerTrustIndicators: React.FC<SellerTrustIndicatorsProps> = ({ seller }) => {
  const isPro = isProSeller(seller);
  const trustScore = verificationService.computeTrustScore(seller);
  const isIdentityVerified = seller.identityVerification?.status === 'verified';
  const isKybVerified = seller.professionalVerification?.status === 'verified';
  const isBankVerified = seller.bankPayoutVerification?.status === 'verified';

  return (
    <div className="bg-bg-base rounded-2xl border border-border-base p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Garanties & Signaux de confiance
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-micro font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <Sparkles className="w-3 h-3" />
          <span>Indice de confiance : {trustScore.score}/100 ({trustScore.levelLabel})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Verification badge */}
        <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-border-base">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block">
              {isPro ? (isKybVerified ? 'Société Vérifiée RCS' : 'Identité Pro') : (isIdentityVerified ? 'Identité KYC Certifiée' : 'Profil vérifié')}
            </span>
            <span className="text-stone-500 text-xs">
              {isPro
                ? (seller.siret ? `RCS SIRET ${seller.siret.slice(0, 9)} • KBIS Validé` : 'Professionnel enregistré')
                : (isIdentityVerified ? 'Pièce d\'identité CNI / Passeport validée' : 'Email & Téléphone validés')}
            </span>
          </div>
        </div>

        {/* Escrow Payment & Payout */}
        <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-border-base">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block">Paiement sécurisé</span>
            <span className="text-stone-500 text-xs">
              {isBankVerified
                ? 'Séquestre Shongre & Virement SEPA certifié'
                : 'Fonds bloqués sur compte séquestre jusqu\'à réception'}
            </span>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-border-base">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block">Livraison & Retrait</span>
            <span className="text-stone-500 text-xs">
              Remise en main propre ou envoi avec numéro de suivi
            </span>
          </div>
        </div>

        {/* Responsiveness */}
        <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-border-base">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 block">Réactivité certifiée</span>
            <span className="text-stone-500 text-xs">
              {seller.responseRatePercent}% de réponses {seller.responseTimeText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
