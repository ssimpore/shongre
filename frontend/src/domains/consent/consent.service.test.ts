import { describe, it, expect, beforeEach } from "vitest";
import {
  consentService,
  isDecisionCurrent,
  normaliseCategories,
  defaultCategories,
  CONSENT_VERSION,
  CONSENT_LIFETIME_DAYS,
} from "./consent.service";
import { storageService } from "../../services/storage.service";

const KEY = "shongre_cookie_consent_v1";
const NOW = new Date("2026-08-19T12:00:00.000Z");
const daysBefore = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

beforeEach(() => storageService.remove(KEY));

describe("consent defaults", () => {
  // Consent is opt-in: "not asked yet" and "refused" must be indistinguishable
  // to anything downstream, or the gap between the two becomes a tracking window.
  it("permits nothing optional before a decision", () => {
    expect(consentService.getDecision(NOW)).toBeNull();
    expect(consentService.getCategories(NOW)).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    });
    expect(consentService.hasConsent("analytics", NOW)).toBe(false);
  });

  it("refusing everything reads the same as never asking", () => {
    consentService.rejectOptional(NOW);
    expect(consentService.getCategories(NOW)).toEqual(defaultCategories());
  });
});

describe("recording a decision", () => {
  it("stores what was accepted and reports it back", () => {
    consentService.acceptAll(NOW);

    expect(consentService.hasConsent("analytics", NOW)).toBe(true);
    expect(consentService.hasConsent("marketing", NOW)).toBe(true);
    expect(consentService.getDecision(NOW)?.decidedAt).toBe(NOW.toISOString());
  });

  it("keeps a partial selection exactly as chosen", () => {
    consentService.save({ analytics: true, marketing: false }, NOW);

    expect(consentService.getCategories(NOW)).toEqual({
      necessary: true,
      analytics: true,
      marketing: false,
    });
  });

  // The UI cannot switch it off, but a hand-edited or older record could.
  it("forces the necessary category on however it was stored", () => {
    expect(normaliseCategories({ necessary: false } as never).necessary).toBe(
      true,
    );
    consentService.save({ necessary: false, analytics: true } as never, NOW);
    expect(consentService.hasConsent("necessary", NOW)).toBe(true);
  });

  it("lets consent be withdrawn entirely", () => {
    consentService.acceptAll(NOW);
    consentService.clear();

    expect(consentService.getDecision(NOW)).toBeNull();
    expect(consentService.hasConsent("marketing", NOW)).toBe(false);
  });
});

describe("a stored decision stops counting", () => {
  const decision = (over: Partial<Record<string, unknown>> = {}) => ({
    version: CONSENT_VERSION,
    decidedAt: daysBefore(1),
    categories: { necessary: true, analytics: true, marketing: true },
    ...over,
  });

  it("accepts a fresh record of the current version", () => {
    expect(isDecisionCurrent(decision() as never, NOW)).toBe(true);
  });

  it("rejects one written against older categories", () => {
    expect(
      isDecisionCurrent(
        decision({ version: CONSENT_VERSION - 1 }) as never,
        NOW,
      ),
    ).toBe(false);
  });

  // Consent is given for a period, not forever.
  it("rejects one past its lifetime", () => {
    expect(
      isDecisionCurrent(
        decision({ decidedAt: daysBefore(CONSENT_LIFETIME_DAYS + 1) }) as never,
        NOW,
      ),
    ).toBe(false);
    expect(
      isDecisionCurrent(
        decision({ decidedAt: daysBefore(CONSENT_LIFETIME_DAYS - 1) }) as never,
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects a future date and an unparseable one", () => {
    expect(
      isDecisionCurrent(decision({ decidedAt: daysBefore(-2) }) as never, NOW),
    ).toBe(false);
    expect(
      isDecisionCurrent(decision({ decidedAt: "not-a-date" }) as never, NOW),
    ).toBe(false);
    expect(isDecisionCurrent(null, NOW)).toBe(false);
  });

  it("re-prompts rather than honouring an expired acceptance", () => {
    storageService.set(
      KEY,
      decision({ decidedAt: daysBefore(CONSENT_LIFETIME_DAYS + 5) }),
    );

    expect(consentService.getDecision(NOW)).toBeNull();
    expect(consentService.hasConsent("analytics", NOW)).toBe(false);
  });
});
