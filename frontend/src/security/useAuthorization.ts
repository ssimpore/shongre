import { isProSeller } from "../domains/user/user.domain";
import { useMemo } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import {
  authorizationService,
  type FeatureRequirement,
  ResourceOwnershipContext,
  AuthorizationContextOptions,
} from "./authorization.service";
import { Permission, PlatformRole } from "../types";
import { normalizePlatformRole } from "./roles.config";
import type { RoutePolicyId } from "./access-policy.registry";

export function useAuthorization() {
  const { currentUser } = useAuth();

  const effectivePermissions = useMemo(() => {
    return authorizationService.getEffectivePermissions(currentUser);
  }, [currentUser]);

  const can = useMemo(() => {
    return (
      permission: Permission,
      resource?: ResourceOwnershipContext,
      options?: AuthorizationContextOptions,
    ): boolean => {
      return authorizationService.can(
        currentUser,
        permission,
        resource,
        options,
      );
    };
  }, [currentUser]);

  const hasEntitlement = useMemo(() => {
    return (
      entitlement:
        | "storefrontCustomization"
        | "prioritySupport"
        | "bulkImportExport"
        | "automaticRelisting",
    ): boolean => {
      return authorizationService.hasEntitlement(currentUser, entitlement);
    };
  }, [currentUser]);

  const canAccessMarket = useMemo(() => {
    return (countryCode?: string): boolean => {
      return authorizationService.canAccessMarket(currentUser, countryCode);
    };
  }, [currentUser]);

  const getFeatureAvailability = useMemo(
    () => (requirement: FeatureRequirement) =>
      authorizationService.getFeatureAvailability(currentUser, requirement),
    [currentUser],
  );

  const canAccessRoute = useMemo(
    () => (policyId: RoutePolicyId) =>
      authorizationService.canAccessRoute(currentUser, policyId),
    [currentUser],
  );

  const isSuspended =
    currentUser?.isSuspended || currentUser?.status === "suspended";
  const isDeactivated =
    currentUser?.isDeactivated ||
    currentUser?.status === "disabled" ||
    currentUser?.status === "deleted" ||
    currentUser?.status === "closed" ||
    currentUser?.status === "banned";
  const isLimited =
    currentUser?.status === "limited" || currentUser?.status === "restricted";
  const isPro = isProSeller(currentUser);
  const normalizedRole: PlatformRole =
    currentUser?.primaryRole || normalizePlatformRole(currentUser?.role);

  return {
    currentUser,
    permissions: effectivePermissions,
    can,
    hasEntitlement,
    canAccessMarket,
    getFeatureAvailability,
    canAccessRoute,
    role: normalizedRole,
    accountType:
      currentUser?.accountType || (isPro ? "professional" : "individual"),
    isSuspended,
    isDeactivated,
    isLimited,
    isPro,
    isVerified: Boolean(currentUser?.isVerified),
  };
}

export function useCan(
  permission: Permission,
  resource?: ResourceOwnershipContext,
  options?: AuthorizationContextOptions,
): boolean {
  const { can } = useAuthorization();
  return useMemo(
    () => can(permission, resource, options),
    [can, permission, resource, options],
  );
}

export function useEntitlement(
  entitlement:
    | "storefrontCustomization"
    | "prioritySupport"
    | "bulkImportExport"
    | "automaticRelisting",
): boolean {
  const { hasEntitlement } = useAuthorization();
  return useMemo(
    () => hasEntitlement(entitlement),
    [hasEntitlement, entitlement],
  );
}
