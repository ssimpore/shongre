import React from 'react';
import { Permission } from '../../types';
import { useCan } from '../useAuthorization';
import { ResourceOwnershipContext, AuthorizationContextOptions } from '../authorization.service';

export interface CanProps {
  permission: Permission;
  resource?: ResourceOwnershipContext | any;
  options?: AuthorizationContextOptions;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  resource,
  options,
  fallback = null,
  children,
}) => {
  const isAllowed = useCan(permission, resource, options);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
