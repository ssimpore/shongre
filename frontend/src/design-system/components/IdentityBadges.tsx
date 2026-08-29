import React from "react";
import { BadgeCheck, Building2, ShieldOff } from "lucide-react";
import type {
  AccountType,
  StaffStatus,
} from "@shongre/contracts/access-control";
import { useTranslation } from "../../i18n/I18nProvider";

export interface StaffBadgeProps {
  status?: StaffStatus;
  roleLabel?: string;
  showLifecycle?: boolean;
  className?: string;
}

export const StaffBadge: React.FC<StaffBadgeProps> = ({
  status = "none",
  roleLabel,
  showLifecycle = false,
  className = "",
}) => {
  const { t } = useTranslation();

  if (status !== "active") {
    if (!showLifecycle || (status !== "suspended" && status !== "revoked")) {
      return null;
    }
    const label = t(`identityBadge.staff.${status}`);
    return (
      <span
        data-identity-badge={`staff-${status}`}
        role="img"
        aria-label={label}
        title={label}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-micro font-bold ${
          status === "suspended"
            ? "border-warning-border bg-warning-surface text-warning"
            : "border-stone-300 bg-stone-100 text-stone-700"
        } ${className}`}
      >
        <ShieldOff className="h-icon-xs w-icon-xs" aria-hidden="true" />
        {label}
      </span>
    );
  }

  const label = roleLabel
    ? t("identityBadge.staff.activeWithRole", { role: roleLabel })
    : t("identityBadge.staff.active");
  const accessibleName = roleLabel
    ? t("identityBadge.staff.activeAriaWithRole", { role: roleLabel })
    : t("identityBadge.staff.activeAria");

  return (
    <span
      data-identity-badge="staff-active"
      role="img"
      aria-label={accessibleName}
      title={accessibleName}
      className={`inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-micro font-bold text-violet-800 ${className}`}
    >
      <Building2 className="h-icon-xs w-icon-xs" aria-hidden="true" />
      {label}
    </span>
  );
};

export interface VerificationBadgeProps {
  verified?: boolean;
  accountType?: AccountType;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verified = false,
  accountType = "individual",
  className = "",
}) => {
  const { t } = useTranslation();
  if (!verified) return null;
  const label =
    accountType === "professional"
      ? t("identityBadge.verification.professional")
      : t("identityBadge.verification.individual");

  return (
    <span
      data-identity-badge="verification"
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1 rounded-full border border-success-border bg-success-surface px-2 py-1 text-micro font-bold text-success ${className}`}
    >
      <BadgeCheck className="h-icon-xs w-icon-xs" aria-hidden="true" />
      {label}
    </span>
  );
};
