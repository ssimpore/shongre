import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { Switch } from "../../design-system/primitives/FormField";
import { useConsent } from "../providers/ConsentProvider";
import { CONSENT_CATEGORIES } from "../../domains/consent/consent.service";
import { ConsentCategories } from "../../domains/consent/consent.types";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMediaQuery } from "../../hooks/useMediaQuery";

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
  const { needsDecision, acceptAll, rejectOptional, openPreferences } =
    useConsent();
  const { t } = useTranslation();
  /* Touch pointers get the 44px control size. These are the first buttons a
     first-time mobile visitor has to hit, and they were 32px tall. */
  const isCompact = useMediaQuery("(pointer: coarse)");

  if (!needsDecision) return null;

  return (
    <section
      /* A landmark, not a dialog. It deliberately has no focus trap and no
         Escape handler, and `role="dialog"` would promise assistive technology
         both of those. `region` keeps it reachable from the landmark rota
         without claiming behaviour it does not implement. */
      role="region"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-mobile-nav-clearance md:bottom-0 z-header p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-overlay border border-border-base bg-bg-surface p-4 shadow-overlay sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary sm:flex">
            <Cookie className="w-4.5 h-4.5" aria-hidden="true" />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h2
                id="cookie-banner-title"
                className="text-sm font-bold text-text-main"
              >
                {t("consent.title")}
              </h2>
              <p className="text-xs leading-relaxed text-text-secondary">
                {t("consent.body")}{" "}
                <Link
                  to="/confidentialite"
                  className="font-semibold text-primary hover:underline"
                >
                  {t("consent.learnMore")}
                </Link>
                .
              </p>
            </div>

            {/* Accept and refuse use the same variant and size on purpose. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button
                variant="secondary"
                size={isCompact ? "md" : "sm"}
                onClick={acceptAll}
              >
                {t("consent.acceptAll")}
              </Button>
              <Button
                variant="secondary"
                size={isCompact ? "md" : "sm"}
                onClick={rejectOptional}
              >
                {t("consent.rejectAll")}
              </Button>
              <Button
                variant="ghost"
                size={isCompact ? "md" : "sm"}
                onClick={openPreferences}
              >
                {t("consent.customise")}
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
  const {
    isPreferencesOpen,
    closePreferences,
    needsDecision,
    categories,
    savePreferences,
    acceptAll,
  } = useConsent();
  const { t } = useTranslation();
  const isCompact = useMediaQuery("(pointer: coarse)");
  const [draft, setDraft] = useState<ConsentCategories>(categories);

  // Re-sync each time it opens; the stored decision may have changed since.
  useEffect(() => {
    if (isPreferencesOpen) setDraft(categories);
  }, [isPreferencesOpen, categories]);

  return (
    <Modal
      isOpen={isPreferencesOpen}
      onClose={closePreferences}
      title={t("consent.panelTitle")}
      description={t("consent.panelDescription")}
      maxWidth="lg"
      dismissible={!needsDecision}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          {CONSENT_CATEGORIES.map((category) => {
            const checked = category.required ? true : draft[category.id];
            const description = category.required
              ? `${t(category.descriptionKey)} ${t("consent.alwaysOn")}`
              : t(category.descriptionKey);

            return (
              <div
                key={category.id}
                className="rounded-card border border-border-base bg-bg-subtle p-4"
              >
                <Switch
                  id={`consent-${category.id}`}
                  label={t(category.labelKey)}
                  description={description}
                  checked={checked}
                  disabled={category.required}
                  onChange={(nextChecked) =>
                    setDraft((previous) => ({
                      ...previous,
                      [category.id]: nextChecked,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size={isCompact ? "md" : "sm"}
            onClick={() => savePreferences(draft)}
          >
            {t("consent.saveChoices")}
          </Button>
          <Button
            variant="primary"
            size={isCompact ? "md" : "sm"}
            onClick={acceptAll}
          >
            {t("consent.acceptAll")}
          </Button>
        </div>
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
