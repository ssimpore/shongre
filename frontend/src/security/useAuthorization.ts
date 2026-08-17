import { isProSeller } from '../domains/user/user.domain';
import { useMemo } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { authorizationService, ResourceOwnershipContext, AuthorizationContextOptions } from './authorization.service';
import { Permission, PlatformRole } from '../types';
import { normalizePlatformRole } from './roles.config';

export function useAuthorization() {
  const { currentUser } = useAuth();

  const effectivePermissions = useMemo(() => {
    return authorizationService.getEffectivePermissions(currentUser);
  }, [currentUser]);

  const can = useMemo(() => {
    return (
      permission: Permission,
      resource?: ResourceOwnershipContext | any,
      options?: AuthorizationContextOptions
    ): boolean => {
      return authorizationService.can(currentUser, permission, resource, options);
    };
  }, [currentUser]);

  const hasEntitlement = useMemo(() => {
    return (
      entitlement: 'storefrontCustomization' | 'prioritySupport' | 'bulkImportExport' | 'automaticRelisting'
    ): boolean => {
      return authorizationService.hasEntitlement(currentUser, entitlement);
    };
  }, [currentUser]);

  const canAccessMarket = useMemo(() => {
    return (countryCode?: string): boolean => {
      return authorizationService.canAccessMarket(currentUser, countryCode);
    };
  }, [currentUser]);

  const isSuspended = currentUser?.isSuspended || currentUser?.status === 'suspended';
  const isDeactivated = currentUser?.isDeactivated || currentUser?.status === 'disabled' || currentUser?.status === 'deleted';
  const isLimited = currentUser?.status === 'limited';
  const isPro = isProSeller(currentUser);
  const normalizedRole: PlatformRole = currentUser?.primaryRole || normalizePlatformRole(currentUser?.role);

  return {
    currentUser,
    permissions: effectivePermissions,
    can,
    hasEntitlement,
    canAccessMarket,
    role: normalizedRole,
    accountType: currentUser?.accountType || (isPro ? 'professional' : 'individual'),
    isSuspended,
    isDeactivated,
    isLimited,
    isPro,
    isVerified: Boolean(currentUser?.isVerified),
  };
}

export function useCan(
  permission: Permission,
  resource?: ResourceOwnershipContext | any,
  options?: AuthorizationContextOptions
): boolean {
  const { can } = useAuthorization();
  return useMemo(() => can(permission, resource, options), [can, permission, resource, options]);
}

export function useEntitlement(
  entitlement: 'storefrontCustomization' | 'prioritySupport' | 'bulkImportExport' | 'automaticRelisting'
): boolean {
  const { hasEntitlement } = useAuthorization();
  return useMemo(() => hasEntitlement(entitlement), [hasEntitlement, entitlement]);
}
