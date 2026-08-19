import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Modal } from '../../design-system/primitives/Modal';
import { Button } from '../../design-system/primitives/Button';
import { useConsent } from '../providers/ConsentProvider';
import { CONSENT_CATEGORIES } from '../../domains/consent/consent.service';
import { ConsentCategories } from '../../domains/consent/consent.types';

/**
 * First-layer consent banner.
 *
 * Three deliberate choices, all of them requirements rather than taste:
 *
 * 1. **Refusing is exactly as easy as accepting.** "Tout refuser" is a
 *    first-layer button with the same weight as "Tout accepter", not a link
 *    buried in a second screen. A banner that offers only "Accept" and
 *    "Settings" is the pattern the CNIL sanctions.
 * 2. **There is no dismiss affordance.** No cross, no Escape, no click-away.
 *    Closing a consent banner without choosing would have to be read as
 *    consent, and silence is not consent.
 * 3. **It does not trap focus and does not steal it.** The visitor is allowed
 *    to read the page before deciding; the banner sits early in the DOM so
 *    keyboard users reach it on the first few tabs regardless.
 *
 * It is pinned above the mobile tab bar through the same clearance token
 * everything else pinned there uses, so it cannot cover the navigation or be
 * covered by the raised publish button.
 */
const CookieBanner: React.FC = () => {
  const { needsDecision, acceptAll, rejectOptional, openPreferences } = useConsent();

  if (!needsDecision) return null;

  return (
    <section
      /* A landmark, not a dialog. It deliberately has no focus trap and no
         Escape handler, and `role="dialog"` would promise assistive technology
         both of those. `region` keeps it reachable from the landmark rota
         without claiming behaviour it does not implement. */
      role="region"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-[var(--mobile-nav-total-h)] md:bottom-0 z-40 p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl bg-white rounded-2xl border border-border-base shadow-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-9 h-9 shrink-0 rounded-xl bg-primary-light text-primary items-center justify-center">
            <Cookie className="w-4.5 h-4.5" aria-hidden="true" />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h2 id="cookie-banner-title" className="text-sm font-bold text-stone-900">
                Vos préférences de confidentialité
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Nous utilisons des cookies strictement nécessaires au fonctionnement du site.
                Avec votre accord, nous y ajoutons la mesure d’audience et la personnalisation.
                Vous pouvez changer d’avis à tout moment depuis « Gestion des cookies ».{' '}
                <Link
                  to="/confidentialite"
                  className="font-semibold text-primary hover:underline"
                >
                  En savoir plus
                </Link>
                .
              </p>
            </div>

            {/* Accept and refuse share a row and a visual weight on purpose. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button variant="primary" size="sm" onClick={acceptAll} className="font-bold">
                Tout accepter
              </Button>
              <Button variant="outline" size="sm" onClick={rejectOptional} className="font-bold">
                Tout refuser
              </Button>
              <Button variant="ghost" size="sm" onClick={openPreferences}>
                Personnaliser
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Second layer: one switch per purpose.
 *
 * Opens pre-filled with what is currently permitted, so someone reopening it to
 * withdraw one category is not silently re-consenting to the others. The
 * necessary category renders as a disabled, checked switch rather than being
 * hidden — people are entitled to see what runs regardless of their choice.
 */
const CookiePreferencesModal: React.FC = () => {
  const { isPreferencesOpen, closePreferences, categories, savePreferences, acceptAll } =
    useConsent();
  const [draft, setDraft] = useState<ConsentCategories>(categories);

  // Re-sync each time it opens; the stored decision may have changed since.
  useEffect(() => {
    if (isPreferencesOpen) setDraft(categories);
  }, [isPreferencesOpen, categories]);

  return (
    <Modal
      isOpen={isPreferencesOpen}
      onClose={closePreferences}
      title="Gestion des cookies"
      description="Choisissez finalité par finalité. Votre choix est conservé 6 mois."
      maxWidth="lg"
    >
      <div className="p-5 sm:p-6 space-y-4">
        {CONSENT_CATEGORIES.map((category) => {
          const checked = category.required ? true : draft[category.id];
          return (
            <div
              key={category.id}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border-base bg-bg-subtle/50"
            >
              <div className="min-w-0">
                <label
                  htmlFor={`consent-${category.id}`}
                  className="text-sm font-bold text-stone-900"
                >
                  {category.label}
                </label>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {category.description}
                </p>
                {category.required && (
                  <p className="text-xs text-stone-500 mt-1 font-semibold">
                    Toujours actifs — indispensables au service.
                  </p>
                )}
              </div>

              <input
                id={`consent-${category.id}`}
                type="checkbox"
                role="switch"
                checked={checked}
                disabled={category.required}
                aria-describedby={`consent-${category.id}-description`}
                onChange={(e) =>
                  setDraft((previous) => ({ ...previous, [category.id]: e.target.checked }))
                }
                className="mt-1 shrink-0 w-5 h-5 rounded accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span id={`consent-${category.id}-description`} className="sr-only">
                {category.description}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 p-5 sm:p-6 border-t border-border-subtle">
        <Button variant="outline" size="sm" onClick={() => savePreferences(draft)}>
          Enregistrer mes choix
        </Button>
        <Button variant="primary" size="sm" onClick={acceptAll} className="font-bold">
          Tout accepter
        </Button>
      </div>
    </Modal>
  );
};

/** Mount once, at the application shell. */
export const CookieConsent: React.FC = () => (
  <>
    <CookieBanner />
    <CookiePreferencesModal />
  </>
);
