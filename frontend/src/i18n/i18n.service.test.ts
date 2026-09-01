import { describe, it, expect } from "vitest";
import {
  translate,
  resolveLocale,
  interpolate,
  catalogueCoverage,
  catalogueCoverageFor,
  DEFAULT_LOCALE,
  translateWithCatalogue,
} from "./i18n.service";
import { messagesFr, MessageKey } from "./messages.fr";
import { messagesEn } from "./messages.en";
import { SHIPPED_LOCALES } from "./locale";

const UNSHIPPED_CATALOGUE_MISSING_KEY_BUDGETS: Record<string, number> = {
  "en-US": 731,
};

describe("resolveLocale", () => {
  it("takes an exact shipped catalogue match", () => {
    expect(resolveLocale("fr-FR")).toBe("fr-FR");
  });

  // Draft catalogues do not become runtime locales until the UI is shipped.
  it.each(["en-GB", "en-AU", "en"])(
    "keeps unshipped %s on the default locale",
    (locale) => {
      expect(resolveLocale(locale)).toBe(DEFAULT_LOCALE);
    },
  );

  it("falls back to the default for a locale we have no messages for", () => {
    expect(resolveLocale("ja-JP")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe("interpolate", () => {
  it("substitutes named placeholders", () => {
    expect(interpolate("Langue : {language}.", { language: "Français" })).toBe(
      "Langue : Français.",
    );
  });

  it("leaves an unmatched placeholder visible rather than printing undefined", () => {
    expect(interpolate("© {year} Shongre")).toBe("© {year} Shongre");
    expect(interpolate("{a} and {b}", { a: "one" })).toBe("one and {b}");
  });
});

describe("translate", () => {
  it("returns the message for the active locale", () => {
    expect(translate("nav.sell", "fr-FR")).toBe("Vendre");
    expect(translate("nav.sell", "en-US")).toBe("Vendre");
  });

  it("previews and interpolates an unshipped catalogue explicitly", () => {
    expect(
      translateWithCatalogue(messagesEn, "footer.copyright", "en-US", {
        year: 2026,
      }),
    ).toContain("© 2026");
  });

  // A partially translated locale must degrade to readable French, never to a
  // raw key appearing in the interface.
  it("falls back to French for a key the locale has not translated", () => {
    const partial = "de-DE";
    expect(translate("nav.sell", partial)).toBe(messagesFr["nav.sell"]);
  });

  it("returns the key only when nothing anywhere defines it", () => {
    expect(translate("does.not.exist" as MessageKey, "fr-FR")).toBe(
      "does.not.exist",
    );
  });
});

/**
 * Pluralisation is the reason this layer exists rather than string constants.
 *
 * French puts zero in the singular and English puts it in the plural. The
 * codebase's own `plural()` helper hard-codes `Math.abs(count) >= 2`, which is
 * the French rule — correct today and wrong the moment English ships.
 */
describe("pluralisation follows the locale, not a count check", () => {
  it("handles French, where zero is singular", () => {
    expect(translate("common.listingCount", "fr-FR", { count: 0 })).toBe(
      "0 annonce",
    );
    expect(translate("common.listingCount", "fr-FR", { count: 1 })).toBe(
      "1 annonce",
    );
    expect(translate("common.listingCount", "fr-FR", { count: 5 })).toBe(
      "5 annonces",
    );
  });

  it("handles English, where zero is plural", () => {
    expect(
      translateWithCatalogue(messagesEn, "common.listingCount", "en-US", {
        count: 0,
      }),
    ).toBe("0 listings");
    expect(
      translateWithCatalogue(messagesEn, "common.listingCount", "en-US", {
        count: 1,
      }),
    ).toBe("1 listing");
    expect(
      translateWithCatalogue(messagesEn, "common.listingCount", "en-US", {
        count: 5,
      }),
    ).toBe("5 listings");
  });

  it("keeps an invariant plural form stable across counts", () => {
    // "avis" does not inflect in French.
    expect(translate("common.reviewCount", "fr-FR", { count: 1 })).toBe(
      "1 avis",
    );
    expect(translate("common.reviewCount", "fr-FR", { count: 9 })).toBe(
      "9 avis",
    );
  });
});

describe("catalogue integrity", () => {
  it("requires complete catalogues for every shipped locale", () => {
    for (const locale of SHIPPED_LOCALES) {
      expect(catalogueCoverage(locale), `${locale} must be complete`).toBe(1);
    }
  });

  it("does not let known unshipped catalogue debt increase", () => {
    const catalogues = { "en-US": messagesEn } as const;

    for (const [locale, budget] of Object.entries(
      UNSHIPPED_CATALOGUE_MISSING_KEY_BUDGETS,
    )) {
      const catalogue = catalogues[locale as keyof typeof catalogues] as Record<
        string,
        string | undefined
      >;
      const missing = (Object.keys(messagesFr) as MessageKey[]).filter(
        (key) => !catalogue[key],
      );
      expect(
        missing.length,
        `${locale} translation debt grew beyond ${budget} missing keys:\n${missing.join("\n")}`,
      ).toBeLessThanOrEqual(budget);
    }
  });

  it("English introduces no key French does not have", () => {
    const sourceKeys = new Set(Object.keys(messagesFr));
    const orphans = Object.keys(messagesEn).filter(
      (key) => !sourceKeys.has(key),
    );
    expect(
      orphans,
      `keys with no source entry:\n${orphans.join("\n")}`,
    ).toEqual([]);
  });

  it("every countable message declares both plural forms", () => {
    const keys = Object.keys(messagesFr);
    const countable = keys
      .filter((key) => key.endsWith("_one"))
      .map((key) => key.slice(0, -4));
    expect(
      countable.length,
      "expected some countable messages",
    ).toBeGreaterThan(0);

    for (const base of countable) {
      expect(keys, `${base} is missing its _other form`).toContain(
        `${base}_other`,
      );
      expect(
        (messagesEn as Record<string, string | undefined>)[`${base}_other`],
        `${base}_other untranslated`,
      ).toBeTruthy();
    }
  });

  it("reports measured coverage without treating known as shipped", () => {
    expect(catalogueCoverage("fr-FR")).toBe(1);
    expect(catalogueCoverage("en-US")).toBe(0);
    expect(catalogueCoverageFor(messagesEn)).toBeGreaterThan(0);
    expect(catalogueCoverageFor(messagesEn)).toBeLessThan(1);
  });

  /**
   * Coverage must not inherit the French fallback.
   *
   * `translate` falls back to French so a page always renders, and reusing that
   * resolution for coverage reported every unlisted locale as fully translated —
   * which would have switched German, Spanish, Dutch and Italian on in the
   * selector, each of them rendering the interface entirely in French.
   */
  it("reports nothing for a locale with no catalogue", () => {
    for (const locale of ["de-DE", "es-ES", "nl-NL", "it-IT", "ja-JP"]) {
      expect(
        catalogueCoverage(locale),
        `${locale} must not claim coverage`,
      ).toBe(0);
    }
  });
});
