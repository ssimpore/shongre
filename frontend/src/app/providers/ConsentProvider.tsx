import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  consentService,
  defaultCategories,
} from "../../domains/consent/consent.service";
import {
  ConsentCategories,
  ConsentCategory,
  ConsentDecision,
} from "../../domains/consent/consent.types";

interface ConsentContextValue {
  /** What the visitor currently permits. Optional categories default to false. */
  categories: ConsentCategories;
  /** True until a valid decision exists — which is when the banner is shown. */
  needsDecision: boolean;
  /** Browser persistence has been checked for a current decision. */
  isRestoring: boolean;
  hasConsent: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (categories: Partial<ConsentCategories>) => void;
  /** Opens the category-by-category panel. */
  openPreferences: () => void;
  closePreferences: () => void;
  isPreferencesOpen: boolean;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(
  undefined,
);

/**
 * Cookie and tracking consent for the whole application.
 *
 * Nothing in the product reads a tracker today, and this deliberately does not
 * pretend otherwise: it records and exposes a decision, and `hasConsent` is the
 * gate any future analytics or advertising integration has to pass. Wiring the
 * gate before the tracker is the only order that works — the other way round
 * ships a period where data is collected without a legal basis.
 */
export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // The server cannot read browser storage, so the client must begin from the
  // same opt-in state. Restoring a current decision after mount avoids a
  // hydration mismatch without ever creating a pre-consent tracking window.
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isPreferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    setDecision(consentService.getDecision());
    setIsRestoring(false);
  }, []);

  const categories = useMemo(
    () => decision?.categories ?? defaultCategories(),
    [decision],
  );

  const acceptAll = useCallback(() => {
    setDecision(consentService.acceptAll());
    setPreferencesOpen(false);
  }, []);

  const rejectOptional = useCallback(() => {
    setDecision(consentService.rejectOptional());
    setPreferencesOpen(false);
  }, []);

  const savePreferences = useCallback((next: Partial<ConsentCategories>) => {
    setDecision(consentService.save(next));
    setPreferencesOpen(false);
  }, []);

  const hasConsent = useCallback(
    (category: ConsentCategory) => categories[category],
    [categories],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      categories,
      // The absence of a decision is meaningful only after browser persistence
      // has been checked. Keeping this false during restoration prevents the
      // first-visit banner from flashing for someone who already answered.
      needsDecision: !isRestoring && decision === null,
      isRestoring,
      hasConsent,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      isPreferencesOpen,
    }),
    [
      categories,
      decision,
      isRestoring,
      hasConsent,
      acceptAll,
      rejectOptional,
      savePreferences,
      isPreferencesOpen,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
};

export const useConsent = (): ConsentContextValue => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used inside <ConsentProvider>.");
  }
  return context;
};
