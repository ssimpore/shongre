/**
 * Normalized application error codes across Shongre frontend.
 */
export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'LISTING_NOT_ELIGIBLE'
  | 'KYC_REQUIRED'
  | 'SELLER_RESTRICTED'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
    this.originalError = options.originalError;
  }
}

/**
 * Maps any error or error code to a friendly localized user message.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'UNAUTHENTICATED':
        return 'Veuillez vous connecter pour effectuer cette action.';
      case 'FORBIDDEN':
        return 'Vous ne disposez pas des autorisations requises pour cette action.';
      case 'NOT_FOUND':
        return 'La ressource demandée est introuvable.';
      case 'VALIDATION_ERROR':
        return error.message || 'Veuillez vérifier les informations renseignées.';
      case 'CONFLICT':
        return 'Une opération concurrente a été détectée. Veuillez rafraîchir la page.';
      case 'RATE_LIMITED':
        return 'Trop de requêtes effectuées. Veuillez patienter un instant.';
      case 'PAYMENT_REQUIRED':
        return 'Un paiement ou un abonnement actif est requis pour continuer.';
      case 'PAYMENT_FAILED':
        return 'Le paiement a échoué. Veuillez vérifier votre moyen de paiement.';
      case 'KYC_REQUIRED':
        return 'Une vérification d’identité est requise pour finaliser cette transaction.';
      case 'SELLER_RESTRICTED':
        return 'Votre compte vendeur fait l’objet d’une restriction temporaire.';
      case 'NETWORK_ERROR':
        return 'Erreur de communication réseau. Veuillez vérifier votre connexion.';
      default:
        return error.message || 'Une erreur inattendue est survenue.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inattendue est survenue.';
}
