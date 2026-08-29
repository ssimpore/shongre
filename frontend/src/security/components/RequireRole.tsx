import React from "react";
import { PlatformRole } from "../../types";
import { useAuthorization } from "../useAuthorization";
import { RequirePermission } from "./RequirePermission";

export interface RequireRoleProps {
  roles: PlatformRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  roles,
  children,
}) => {
  const { role } = useAuthorization();

  const hasRole = roles.includes(role);

  if (!hasRole) {
    // Deliberately says nothing about which roles would grant access, nor which
    // role the visitor holds. Enumerating the internal role table told anyone who
    // guessed a URL exactly how authorisation is shaped, and named a slug the
    // visitor has no way to act on.
    return (
      <RequirePermission
        permission="staff.internal.access"
        standalone
        customTitle="Espace réservé aux équipes Shongre"
        customMessage="Cette section est réservée au personnel interne. Si vous pensez y avoir droit, contactez votre administrateur."
      >
        {children}
      </RequirePermission>
    );
  }

  return <>{children}</>;
};
