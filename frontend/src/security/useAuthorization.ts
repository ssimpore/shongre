import { isProSeller } from "../domains/user/user.domain";
import { useMemo } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import {
  authorizationService,
  ResourceOwnershipContext,
  AuthorizationContextOptions,
} from "./authorization.service";
import { Permission, PlatformRole } from "../types";
import { normalizePlatformRole } from "./roles.config";
import {
  canAccessRoutePolicy,
  type RoutePolicyId,
} from "./access-policy.registry";

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

  const decision = useMemo(() => {
    return (
      permission: Permission,
      resource?: ResourceOwnershipContext,
      options?: AuthorizationContextOptions,
    ) =>
      authorizationService.decision(currentUser, permission, resource, options);
  }, [currentUser]);

  const canAccessMarket = useMemo(() => {
    return (countryCode?: string): boolean => {
      return authorizationService.canAccessMarket(currentUser, countryCode);
    };
  }, [currentUser]);

  const canAccessRoute = useMemo(
    () => (policyId: RoutePolicyId) =>
      canAccessRoutePolicy(currentUser, policyId),
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
    decision,
    canAccessMarket,
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
