import React from 'react';
import { PlatformRole } from '../../types';
import { useAuthorization } from '../useAuthorization';
import { RequirePermission } from './RequirePermission';

export interface RequireRoleProps {
  roles: PlatformRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { role, isSuspended } = useAuthorization();

  const hasRole = roles.includes(role);

  if (!hasRole) {
    return (
      <RequirePermission
        permission="admin.access"
        customTitle="Espace d'administration réservé"
        customMessage={`Cet espace requiert un rôle spécifique [${roles.join(', ')}]. Votre rôle actuel est [${role}].`}
      >
        {children}
      </RequirePermission>
    );
  }

  return <>{children}</>;
};
