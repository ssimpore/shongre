import { storageService } from '../../services/storage.service';
import {
  ConsentCategories,
  ConsentCategory,
  ConsentCategoryDescriptor,
  ConsentDecision,
} from './consent.types';

const STORAGE_KEY = 'shongre_cookie_consent_v1';

/**
 * Bump when the categories below change what they cover. A stored decision from
 * an older version is treated as no decision, which re-prompts — consent is
 * given for a stated purpose, so a changed purpose needs asking again.
 */
export const CONSENT_VERSION = 1;

/** Consent expires; the CNIL's guidance is to ask again after 6 months. */
export const CONSENT_LIFETIME_DAYS = 182;

export const CONSENT_CATEGORIES: ConsentCategoryDescriptor[] = [
  {
    id: 'necessary',
    label: 'Strictement nécessaires',
    description:
      "Session, sécurité et mémorisation de vos préférences (marché, langue, localisation). " +
      'Sans eux, le site ne peut pas fonctionner.',
    required: true,
  },
  {
    id: 'analytics',
    label: "Mesure d'audience",
    description:
      "Statistiques de fréquentation anonymisées pour comprendre quelles pages sont utiles " +
      'et corriger ce qui ne l’est pas.',
    required: false,
  },
  {
    id: 'marketing',
    label: 'Personnalisation & publicité',
    description:
      'Recommandations d’annonces et mesure des campagnes. Refuser ne réduit pas ' +
      'le nombre d’annonces affichées, seulement leur personnalisation.',
    required: false,
  },
];

/** Opt-in by default: everything optional starts refused. */
export function defaultCategories(): ConsentCategories {
  return { necessary: true, analytics: false, marketing: false };
}

export function allCategories(): ConsentCategories {
  return { necessary: true, analytics: true, marketing: true };
}

/**
 * Fills in a partial selection and forces `necessary` on.
 *
 * The toggle UI cannot turn `necessary` off, but a stored record could be
 * hand-edited or written by an older build, and code downstream is entitled to
 * assume the invariant holds.
 */
export function normaliseCategories(partial?: Partial<ConsentCategories>): ConsentCategories {
  return { ...defaultCategories(), ...partial, necessary: true };
}

/** Whether a stored decision still counts: right version, and not expired. */
export function isDecisionCurrent(
  decision: ConsentDecision | null,
  now: Date = new Date(),
): decision is ConsentDecision {
  if (!decision || decision.version !== CONSENT_VERSION) return false;

  const decidedAt = Date.parse(decision.decidedAt);
  if (Number.isNaN(decidedAt)) return false;

  const ageDays = (now.getTime() - decidedAt) / 86_400_000;
  // A decision dated in the future means a wrong clock, not a valid consent.
  return ageDays >= 0 && ageDays < CONSENT_LIFETIME_DAYS;
}

class ConsentService {
  /** The stored decision, or `null` when none applies and the banner is due. */
  getDecision(now: Date = new Date()): ConsentDecision | null {
    const stored = storageService.get<ConsentDecision | null>(STORAGE_KEY, null);
    if (!isDecisionCurrent(stored, now)) return null;
    return { ...stored, categories: normaliseCategories(stored.categories) };
  }

  /** What is permitted right now. No decision reads as "nothing optional". */
  getCategories(now: Date = new Date()): ConsentCategories {
    return this.getDecision(now)?.categories ?? defaultCategories();
  }

  hasConsent(category: ConsentCategory, now: Date = new Date()): boolean {
    return this.getCategories(now)[category];
  }

  save(categories: Partial<ConsentCategories>, now: Date = new Date()): ConsentDecision {
    const decision: ConsentDecision = {
      version: CONSENT_VERSION,
      decidedAt: now.toISOString(),
      categories: normaliseCategories(categories),
    };
    storageService.set(STORAGE_KEY, decision);
    return decision;
  }

  acceptAll(now?: Date): ConsentDecision {
    return this.save(allCategories(), now);
  }

  /** Refusing is a decision, and is recorded exactly like accepting. */
  rejectOptional(now?: Date): ConsentDecision {
    return this.save(defaultCategories(), now);
  }

  /** Lets someone withdraw consent as easily as they gave it. */
  clear(): void {
    storageService.remove(STORAGE_KEY);
  }
}

export const consentService = new ConsentService();
