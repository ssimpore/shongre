import React from "react";
import { ProBadge } from "@shongre/ui/web";
import { StaffBadge } from "../../design-system/components/StaffBadge";
import {
  ROLE_DEFINITIONS,
  STAFF_ROLE_PRESENTATION,
} from "../../security/roles.config";
import type { UserProfile } from "../../types";
import { adminPrimaryIdentity } from "./admin-user-identity";
import { useTranslation } from "../../i18n/I18nProvider";

export const AdminUserPrimaryBadge: React.FC<{ user: UserProfile }> = ({
  user,
}) => {
  const { t } = useTranslation();
  const identity = adminPrimaryIdentity(user);
  if (identity === "staff" && user.staffRole) {
    return (
      <StaffBadge
        status="active"
        roleLabel={STAFF_ROLE_PRESENTATION[user.staffRole].shortLabel}
      />
    );
  }

  if (identity === "professional") {
    return (
      <ProBadge
        label={t("ui.identityStatus.pro.short")}
        accessibilityLabel={t("ui.identityStatus.pro.account")}
      />
    );
  }

  const role = ROLE_DEFINITIONS.buyer;
  return (
    <span
      data-identity-badge={identity}
      className={`rounded-pill border px-2 py-1 text-micro font-bold ${role.badgeColor}`}
    >
      {role.title}
    </span>
  );
};
