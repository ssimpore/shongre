import { AppError } from '../errors/app-error.js';
import { PlatformRole, Permission, hasPermission } from './rbac.js';

/**
 * The authenticated caller for a single request.
 *
 * This exists because identity used to be a module-level singleton on
 * AuthService, which meant every concurrent HTTP client shared one "current
 * user". Identity is per-request state and has to be threaded through as such.
 */
export interface Principal {
  userId: string;
  email: string;
  role: PlatformRole;
}

/** An anonymous caller. Kept explicit so route handlers never see `null` unexpectedly. */
export const GUEST_PRINCIPAL: Principal = {
  userId: '',
  email: '',
  role: 'guest',
};

export function isAuthenticated(principal: Principal): boolean {
  return principal.userId !== '' && principal.role !== 'guest';
}

/**
 * Asserts the caller is signed in, and narrows to a principal with a real userId.
 */
export function requireAuthenticated(principal: Principal): Principal {
  if (!isAuthenticated(principal)) {
    throw new AppError({
      code: 'UNAUTHENTICATED',
      message: 'Vous devez être connecté pour effectuer cette action.',
    });
  }
  return principal;
}

/**
 * Asserts the caller holds a permission.
 *
 * The message deliberately does not name the missing permission: telling an
 * attacker exactly which grant they lack maps out the permission model for them.
 */
export function requirePermission(principal: Principal, permission: Permission): Principal {
  requireAuthenticated(principal);
  if (!hasPermission(principal.role, permission)) {
    throw new AppError({
      code: 'FORBIDDEN',
      message: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
    });
  }
  return principal;
}

/**
 * Asserts the caller owns the resource, or holds an override permission.
 *
 * This is the check that closes the IDOR family of bugs: routes that used to
 * accept a `:userId` path parameter and return that user's private data now
 * pass it through here first. Staff overrides are explicit rather than implicit
 * so that a support role reading someone's orders is a deliberate grant.
 */
export function requireOwnership(
  principal: Principal,
  resourceOwnerId: string,
  override?: Permission
): Principal {
  requireAuthenticated(principal);

  if (principal.userId === resourceOwnerId) return principal;
  if (override && hasPermission(principal.role, override)) return principal;

  // 404 rather than 403: confirming the resource exists but is not yours still
  // leaks that the id is real, which is enough to enumerate users and orders.
  throw new AppError({
    code: 'NOT_FOUND',
    message: 'Ressource introuvable.',
  });
}

/**
 * Resolves the effective owner for routes that accept an id in the path.
 *
 * Callers may address their own data by id or by the literal `me`. Anything
 * else has to survive the ownership check.
 */
export function resolveOwnerId(principal: Principal, requestedId: string | undefined, override?: Permission): string {
  requireAuthenticated(principal);
  if (!requestedId || requestedId === 'me' || requestedId === principal.userId) {
    return principal.userId;
  }
  requireOwnership(principal, requestedId, override);
  return requestedId;
}
