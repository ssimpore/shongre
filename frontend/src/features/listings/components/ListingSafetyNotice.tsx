import React from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export interface ListingSafetyNoticeProps {
  isOnlinePaymentAvailable?: boolean;
  className?: string;
}

export const ListingSafetyNotice: React.FC<ListingSafetyNoticeProps> = ({
  isOnlinePaymentAvailable = true,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-2 text-emerald-950 ${className}`}>
      <div className="flex items-center gap-2 font-bold text-emerald-900">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>Garantie & Sécurité Shongre</span>
      </div>

      <p className="text-micro text-emerald-800 leading-relaxed">
        {isOnlinePaymentAvailable
          ? 'Vos fonds sont protégés sur un compte séquestre sécurisé (Mangopay) et ne sont versés au vendeur qu\'après réception et validation conforme de l\'article.'
          : 'Pour votre sécurité, effectuez la transaction et la vérification du bien en personne dans un lieu public.'}
      </p>

      <div className="flex items-center gap-4 text-micro font-semibold text-emerald-700 pt-1">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Séquestre garanti
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Paiement chiffré 3D-Secure
        </span>
      </div>
    </div>
  );
};
