import React from "react";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ListingSafetyNoticeProps {
  isOnlinePaymentAvailable?: boolean;
  className?: string;
}

export const ListingSafetyNotice: React.FC<ListingSafetyNoticeProps> = ({
  isOnlinePaymentAvailable = true,
  className = "",
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`p-4 rounded-2xl bg-success-surface/70 border border-success-border/80 text-xs space-y-2 text-success ${className}`}
    >
      <div className="flex items-center gap-2 font-bold text-success">
        <ShieldCheck className="w-4 h-4 text-success shrink-0" />
        <span>{t("listings.listingSafetyNotice.garantieSecuriteShongre")}</span>
      </div>

      <p className="text-micro text-success leading-relaxed">
        {isOnlinePaymentAvailable
          ? "Le paiement est traité par Stripe. Vérifiez le statut de la commande avant toute remise et ouvrez un litige depuis la commande en cas de problème."
          : "Pour votre sécurité, effectuez la transaction et la vérification du bien en personne dans un lieu public."}
      </p>

      <div className="flex items-center gap-4 text-micro font-semibold text-success pt-1">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t("listings.listingSafetyNotice.sequestreGaranti")}
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {t("listings.listingSafetyNotice.paiementChiffre3dSecure")}
        </span>
      </div>
    </div>
  );
};
