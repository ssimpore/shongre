import React from "react";
import { CalendarOff } from "lucide-react";
import type { PublicSellerProfile } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";

export interface SellerAwayNoticeProps {
  seller: Pick<PublicSellerProfile, "name" | "awayUntil" | "awayMessage">;
  className?: string;
}

/**
 * The seller's declared absence, as the API published it. Rendered only
 * while the return date is ahead; a stale value is treated as no absence.
 */
export const SellerAwayNotice: React.FC<SellerAwayNoticeProps> = ({
  seller,
  className = "",
}) => {
  const { t } = useTranslation();
  const { formatDate } = useRegionalFormatters();
  if (!seller.awayUntil || Date.parse(seller.awayUntil) <= Date.now()) {
    return null;
  }
  return (
    <div
      role="note"
      data-seller-away-notice
      className={`flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-surface p-3 text-xs text-warning ${className}`}
    >
      <CalendarOff
        className="w-icon-md h-icon-md shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-bold">
          {t("profile.away.title", {
            name: seller.name,
            date: formatDate(seller.awayUntil, {
              day: "numeric",
              month: "long",
            }),
          })}
        </p>
        <p className="mt-0.5 text-text-emphasis">
          {seller.awayMessage || t("profile.away.description")}
        </p>
      </div>
    </div>
  );
};
