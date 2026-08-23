import {
  capabilitiesForLegacyRole,
  hasEffectiveCapability,
  resolveEffectiveCapabilities,
  type AccessSubject,
  type Capability,
  type PlatformRole as SharedPlatformRole,
} from "@shongre/contracts/access-control";

/** Compatibility names retained for existing imports. */
export type PlatformRole = SharedPlatformRole;
export type Permission = Capability;
export type AuthorizationSubject = AccessSubject;

/**
 * Legacy role-only check used by rollout-compatible tokens and old tests.
 * New request authorization resolves the complete account subject and stores
 * its effective capabilities on Principal.
 */
export function hasPermission(
  role: PlatformRole,
  permission: Permission,
): boolean {
  return capabilitiesForLegacyRole(role).includes(permission);
}

export function permissionsForSubject(
  subject: AuthorizationSubject | null | undefined,
): Permission[] {
  return resolveEffectiveCapabilities(subject);
}

export function subjectHasPermission(
  subject: AuthorizationSubject | null | undefined,
  permission: Permission,
): boolean {
  return hasEffectiveCapability(subject, permission);
}
