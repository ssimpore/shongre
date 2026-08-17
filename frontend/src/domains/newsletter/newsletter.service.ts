/**
 * SHONGRE NEWSLETTER SERVICE
 * Pure domain utilities for email validation, normalization, consent stamping, and status badges.
 */

import { NewsletterSubscriptionStatus } from './newsletter.types';

export const CURRENT_NEWSLETTER_CONSENT_VERSION = 'v1.0';

export interface NewsletterStatusInfo {
  label: string;
  variant: 'neutral' | 'primary' | 'success' | 'warning';
  description: string;
}

export class NewsletterService {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  validateEmail(email: string): { isValid: boolean; error?: string } {
    const trimmed = email.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Veuillez saisir votre adresse email.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Format d\'adresse email invalide.' };
    }
    return { isValid: true };
  }

  getStatusInfo(status: NewsletterSubscriptionStatus): NewsletterStatusInfo {
    switch (status) {
      case 'subscribed':
        return {
          label: 'Abonné',
          variant: 'success',
          description: 'Vous recevez les actualités et sélections Shongre selon vos préférences.',
        };
      case 'pending_confirmation':
        return {
          label: 'Confirmation en attente',
          variant: 'warning',
          description: 'Veuillez cliquer sur le lien de confirmation envoyé à votre adresse email.',
        };
      case 'unsubscribed':
        return {
          label: 'Désabonné',
          variant: 'neutral',
          description: 'Vous ne recevez plus les communications promotionnelles et éditoriales.',
        };
      case 'suppressed':
        return {
          label: 'Suspendu',
          variant: 'neutral',
          description: 'Votre adresse est temporairement exclue des envois suite à un échec de distribution.',
        };
    }
  }
}

export const newsletterService = new NewsletterService();
