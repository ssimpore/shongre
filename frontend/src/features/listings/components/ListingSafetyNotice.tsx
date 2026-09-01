import React from "react";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../../i18n/I18nProvider";
import type { ListingSafetyVariant } from "../../../domains/listing/listing-intent.presentation";

export interface ListingSafetyNoticeProps {
  variant: ListingSafetyVariant;
  className?: string;
}

export const ListingSafetyNotice: React.FC<ListingSafetyNoticeProps> = ({
  variant,
  className = "",
}) => {
  const { t } = useTranslation();
  const copy = {
    payment: {
      title: t("listings.listingSafetyNotice.garantieSecuriteShongre"),
      body: t("listings.listingSafetyNotice.paymentBody"),
    },
    application: {
      title: t("listings.listingSafetyNotice.applicationTitle"),
      body: t("listings.listingSafetyNotice.applicationBody"),
    },
    service: {
      title: t("listings.listingSafetyNotice.serviceTitle"),
      body: t("listings.listingSafetyNotice.serviceBody"),
    },
    appointment: {
      title: t("listings.listingSafetyNotice.appointmentTitle"),
      body: t("listings.listingSafetyNotice.appointmentBody"),
    },
    exchange: {
      title: t("listings.listingSafetyNotice.exchangeTitle"),
      body: t("listings.listingSafetyNotice.exchangeBody"),
    },
    in_person: {
      title: t("listings.listingSafetyNotice.inPersonTitle"),
      body: t("listings.listingSafetyNotice.inPersonBody"),
    },
  }[variant];

  return (
    <div
      className={`p-4 rounded-2xl bg-success-surface/70 border border-success-border/80 text-xs space-y-2 text-success ${className}`}
    >
      <div className="flex items-center gap-2 font-bold text-success">
        <ShieldCheck className="w-icon-md h-icon-md text-success shrink-0" />
        <span>{copy.title}</span>
      </div>

      <p className="text-micro text-success leading-relaxed">
        {copy.body}
      </p>

      {variant === "payment" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-micro font-semibold text-success pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-icon-xs h-icon-xs" />
            {t("listings.listingSafetyNotice.sequestreGaranti")}
          </span>
          <span className="flex items-center gap-1">
            <Lock className="w-icon-xs h-icon-xs" />
            {t("listings.listingSafetyNotice.paiementChiffre3dSecure")}
          </span>
        </div>
      )}
    </div>
  );
};
