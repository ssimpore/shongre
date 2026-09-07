import {
  evaluateAuthorization,
  type AuthorizationDecision,
  type AuthorizationRequirement,
  type AuthUser,
} from "@shongre/contracts";

export class MobileAuthorizationError extends Error {
  readonly decision: AuthorizationDecision;

  constructor(decision: AuthorizationDecision) {
    const messageByReason: Partial<
      Record<NonNullable<AuthorizationDecision["denialReason"]>, string>
    > = {
      unauthenticated: "Connectez-vous pour continuer.",
      account_status:
        "L’état actuel de votre compte ne permet pas cette action.",
      verification_required:
        "Une vérification est nécessaire avant de continuer.",
      entitlement_required:
        "Votre offre actuelle ne comprend pas cette fonctionnalité.",
      market_unavailable:
        "Cette action n’est pas disponible dans le marché sélectionné.",
      market_scope:
        "Cette action ne fait pas partie de votre périmètre de marché.",
      resource_scope: "Cette ressource ne fait pas partie de votre périmètre.",
      staff_separation:
        "Les actions client ne sont pas disponibles depuis un accès Staff.",
      inactive_staff: "Cet accès Staff n’est pas actif.",
    };
    super(
      (decision.denialReason && messageByReason[decision.denialReason]) ||
        "Cette action n’est pas autorisée dans votre contexte actuel.",
    );
    this.name = "MobileAuthorizationError";
    this.decision = decision;
  }
}

/**
 * Mobile presentation guard. The API remains authoritative; this prevents
 * unavailable actions from being initiated and keeps the native UI on the same
 * canonical policy as Web and backend request guards.
 */
export function getMobileAuthorizationDecision(
  user: AuthUser | null,
  requirement: AuthorizationRequirement,
): AuthorizationDecision {
  return evaluateAuthorization(
    {
      subject: user,
      subjectId: user?.id,
      effectiveCapabilities: user?.capabilities,
    },
    requirement,
  );
}

export function requireMobileAuthorization(
  user: AuthUser | null,
  requirement: AuthorizationRequirement,
): void {
  const decision = getMobileAuthorizationDecision(user, requirement);
  if (!decision.allowed) throw new MobileAuthorizationError(decision);
}
