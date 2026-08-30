import React from "react";
import { StaffBadge } from "../../design-system/components/IdentityBadges";
import {
  ROLE_DEFINITIONS,
  STAFF_ROLE_PRESENTATION,
} from "../../security/roles.config";
import type { UserProfile } from "../../types";
import { adminPrimaryIdentity } from "./admin-user-identity";

export const AdminUserPrimaryBadge: React.FC<{ user: UserProfile }> = ({
  user,
}) => {
  const identity = adminPrimaryIdentity(user);
  if (identity === "staff" && user.staffRole) {
    return (
      <StaffBadge
        status="active"
        roleLabel={STAFF_ROLE_PRESENTATION[user.staffRole].shortLabel}
      />
    );
  }

  const role =
    identity === "professional"
      ? ROLE_DEFINITIONS.pro_seller
      : ROLE_DEFINITIONS.buyer;
  return (
    <span
      data-identity-badge={identity}
      className={`rounded-pill border px-2 py-1 text-micro font-bold ${role.badgeColor}`}
    >
      {role.title}
    </span>
  );
};
