import { MessageKey } from "../../i18n/messages.fr";

/**
 * Cookie/tracking consent, as the CNIL and the GDPR frame it.
 *
 * `necessary` is not a choice and is never presented as one: it covers the
 * session, the security token and the stored preferences the site cannot work
 * without. Everything else is off until the visitor turns it on — consent is
 * opt-in, so "no decision yet" and "refused" must behave identically.
 */
export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type ConsentCategories = Record<ConsentCategory, boolean>;

export interface ConsentDecision {
  /** Bumped when the categories change meaning, which re-prompts everyone. */
  version: number;
  /** ISO timestamp. Consent is time-limited, so the date is part of the record. */
  decidedAt: string;
  categories: ConsentCategories;
}

export interface ConsentCategoryDescriptor {
  id: ConsentCategory;
  /**
   * Message keys rather than literals: the panel is part of the shell, which is
   * translated, and a purpose described only in French is not consent a
   * non-French speaker can meaningfully give.
   */
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  /** `necessary` cannot be switched off, and its control says so. */
  required: boolean;
}
